from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from backend.database import get_db
from backend.models.models import PetPassport, Vaccination, PetHealthLog, Pet, User, Procedure
from backend.services.auth import get_current_user, require_vet
import shutil, os, uuid

router = APIRouter(prefix="/passport", tags=["Passport"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

VACCINE_INTERVALS = {
    # Собаки
    "rabies": 365,           # Бешенство
    "distemper": 365,        # Чума плотоядных (входит в комплексную)
    "hepatitis": 365,        # Гепатит (входит в комплексную)
    "parvovirus": 365,       # Парвовироз (входит в комплексную)
    "dog_combo": 365,        # Комплексная для собак (чума+гепатит+парвовироз)
    # Кошки
    "feline_combo": 365,     # Комплексная для кошек
    "vakderm": 180,          # Вакдерм (от лишая, 2 дозы)
    "polivak": 180,          # Поливак-ТМ (от лишая, 4 ампулы)
    # Птицы
    "bird_pmv": 45,          # Болезнь Ньюкасла (8 мероприятий/год ≈ каждые 45 дней)
    "bird_ilt": 45,          # ИЛТ инфекционный ларинготрахеит (8 мероприятий/год)
}

VACCINE_NAMES_RU = {
    # Собаки
    "rabies": "Бешенство",
    "distemper": "Чума плотоядных",
    "hepatitis": "Гепатит",
    "parvovirus": "Парвовироз",
    "dog_combo": "Комплексная (собаки)",
    # Кошки
    "feline_combo": "Комплексная (кошки)",
    "vakderm": "Вакдерм (от лишая)",
    "polivak": "Поливак-ТМ (от лишая)",
    # Птицы
    "bird_pmv": "Болезнь Ньюкасла (птицы)",
    "bird_ilt": "ИЛТ — ларинготрахеит (птицы)",
}


def save_file(file: UploadFile) -> str:
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{UPLOAD_DIR}/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/{filename}"


@router.get("/vaccines/schedule")
def get_vaccine_schedule():
    return [
        {"type": k, "name": v, "interval_days": VACCINE_INTERVALS[k]}
        for k, v in VACCINE_NAMES_RU.items()
    ]


@router.get("/{pet_id}")
def get_passport(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")

    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    vaccinations = db.query(Vaccination).filter(
        Vaccination.pet_id == pet_id
    ).order_by(Vaccination.date_given.desc()).all()
    health_logs = db.query(PetHealthLog).filter(
        PetHealthLog.pet_id == pet_id
    ).order_by(PetHealthLog.date.desc()).all()
    owner = db.query(User).filter(User.id == pet.owner_id).first()

    # Получаем имена ветеринаров для вакцинаций
    vac_vets = {}
    for v in vaccinations:
        if v.vet_id and v.vet_id not in vac_vets:
            vet = db.query(User).filter(User.id == v.vet_id).first()
            vac_vets[v.vet_id] = vet.full_name if vet else "—"

    # Берём только последнюю запись по каждой вакцине (vaccinations уже отсортированы desc)
    latest_by_vaccine = {}
    for vac in vaccinations:
        if vac.is_confirmed and vac.vaccine_name not in latest_by_vaccine:
            latest_by_vaccine[vac.vaccine_name] = vac

    upcoming = []
    for vac in latest_by_vaccine.values():
        if vac.next_due_date:
            days_left = (vac.next_due_date - date.today()).days
            upcoming.append({
                "vaccine": vac.vaccine_name,
                "due_date": str(vac.next_due_date),
                "days_left": days_left,
                "overdue": days_left < 0
            })

    return {
        "pet": {
            "id": pet.id,
            "name": pet.name,
            "species": pet.species,
            "breed": pet.breed,
            "birth_date": str(pet.birth_date) if pet.birth_date else None,
            "gender": pet.gender,
            "weight": pet.weight,
            "photo_url": pet.photo_url,
            "owner_id": pet.owner_id,
            "is_archived": pet.is_archived or False,
            "archive_reason": pet.archive_reason,
            "archive_note": pet.archive_note,
            "archived_at": str(pet.archived_at) if pet.archived_at else None,
        },
        "owner": {
            "id": owner.id if owner else None,
            "full_name": owner.full_name if owner else "—",
            "email": owner.email if owner else None,
            "phone": owner.phone if owner else None,
        } if owner else {},
        "passport": {
            "microchip_number": passport.microchip_number if passport else None,
            "passport_number": passport.passport_number if passport else None,
            "passport_photo_url": passport.passport_photo_url if passport else None,
            "blood_type": passport.blood_type if passport else None,
            "allergies": passport.allergies if passport else None,
            "chronic_diseases": passport.chronic_diseases if passport else None,
            "is_confirmed": passport.is_confirmed if passport else False,
            "confirmed_by": passport.confirmed_by if passport else None,
            # Новые поля паспорта
            "coat_color": passport.coat_color if passport else None,
            "special_marks": passport.special_marks if passport else None,
            "reproduction": passport.reproduction if passport else None,
            "chip_location": passport.chip_location if passport else None,
            "chip_date": str(passport.chip_date) if passport and passport.chip_date else None,
            "tattoo_number": passport.tattoo_number if passport else None,
            "tattoo_date": str(passport.tattoo_date) if passport and passport.tattoo_date else None,
            "owner_address": passport.owner_address if passport else None,
            "owner_city": passport.owner_city if passport else None,
            "owner_zip": passport.owner_zip if passport else None,
            "issue_date": str(passport.issue_date) if passport and passport.issue_date else None,
            "felv_status": passport.felv_status if passport else None,
            "fiv_status": passport.fiv_status if passport else None,
            "clinical_exams": __import__('json').loads(passport.clinical_exams or "[]") if passport else [],
            "rabies_titers": __import__('json').loads(passport.rabies_titers or "[]") if passport else [],
        } if passport else None,
        "vaccinations": [
            {
                "id": v.id,
                "vaccine_name": v.vaccine_name,
                "vaccine_type": v.vaccine_type,
                "date_given": str(v.date_given) if v.date_given else None,
                "next_due_date": str(v.next_due_date) if v.next_due_date else None,
                "batch_number": v.batch_number,
                "manufacturer": v.manufacturer,
                "manufacture_date": str(v.manufacture_date) if v.manufacture_date else None,
                "expiry_date": str(v.expiry_date) if v.expiry_date else None,
                "notes": v.notes,
                "photo_url": v.photo_url,
                "is_confirmed": v.is_confirmed,
                "vet_name": vac_vets.get(v.vet_id, "—"),
            } for v in vaccinations
        ],
        "health_logs": [
            {
                "id": h.id,
                "log_date": str(h.date) if h.date else None,
                "date": str(h.date) if h.date else None,
                "condition": h.condition,
                "temperature": h.temperature,
                "weight": h.weight,
                "symptoms": h.symptoms,
                "notes": h.notes,
            } for h in health_logs
        ],
        "procedures": [
            {
                "id": p.id,
                "type": p.type,
                "description": p.description or "",
                "drug_name": p.drug_name or p.description or "—",
                "manufacturer": p.manufacturer or "—",
                "date": str(p.date) if p.date else None,
                "vet_name": (db.query(User).filter(User.id == p.vet_id).first().full_name
                             if p.vet_id else "—"),
                "is_confirmed": p.is_confirmed,
            } for p in db.query(Procedure)
                .filter(Procedure.pet_id == pet_id)
                .order_by(Procedure.date.desc()).all()
        ],
        "upcoming_vaccinations": sorted(upcoming, key=lambda x: x["days_left"])
    }


@router.put("/{pet_id}")
def update_passport_json(
    pet_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновление паспорта через JSON (используется фронтендом)"""
    from datetime import date as dt_date
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        passport = PetPassport(pet_id=pet_id)
        db.add(passport)

    # Строковые поля
    str_fields = [
        'microchip_number', 'passport_number', 'blood_type', 'allergies',
        'chronic_diseases', 'coat_color', 'special_marks', 'reproduction',
        'chip_location', 'tattoo_number', 'owner_address', 'owner_city',
        'owner_zip', 'felv_status', 'fiv_status',
    ]
    for f in str_fields:
        if f in data and data[f] is not None:
            setattr(passport, f, data[f])

    # Поля дат
    date_fields = ['chip_date', 'tattoo_date', 'issue_date']
    for f in date_fields:
        if f in data and data[f]:
            try: setattr(passport, f, dt_date.fromisoformat(data[f]))
            except: pass

    # is_confirmed
    if 'is_confirmed' in data:
        passport.is_confirmed = data['is_confirmed']
        if data['is_confirmed']:
            passport.confirmed_by = current_user.id

    db.commit()
    return {"message": "Паспорт обновлён"}


@router.post("/{pet_id}/passport")
def update_passport(
    pet_id: int,
    microchip_number: str = Form(None),
    passport_number: str = Form(None),
    blood_type: str = Form(None),
    allergies: str = Form(None),
    chronic_diseases: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        passport = PetPassport(pet_id=pet_id)
        db.add(passport)

    if microchip_number is not None: passport.microchip_number = microchip_number
    if passport_number is not None: passport.passport_number = passport_number
    if blood_type is not None: passport.blood_type = blood_type
    if allergies is not None: passport.allergies = allergies
    if chronic_diseases is not None: passport.chronic_diseases = chronic_diseases
    if photo: passport.passport_photo_url = save_file(photo)

    db.commit()
    return {"message": "Паспорт обновлён"}


@router.post("/{pet_id}/passport/confirm")
def confirm_passport(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")

    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        # Создаём паспорт если не существует
        passport = PetPassport(
            pet_id=pet_id,
            is_confirmed=True,
            confirmed_by=current_user.id
        )
        db.add(passport)
    else:
        passport.is_confirmed = True
        passport.confirmed_by = current_user.id
    db.commit()
    return {"message": "Паспорт подтверждён"}


@router.post("/{pet_id}/passport/reject")
def reject_passport(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        raise HTTPException(status_code=404, detail="Паспорт не найден")
    passport.is_confirmed = False
    passport.confirmed_by = None
    passport.microchip_number = None
    passport.passport_number = None
    passport.blood_type = None
    passport.allergies = None
    passport.chronic_diseases = None
    passport.passport_photo_url = None
    db.commit()
    return {"message": "Паспорт отклонён"}


@router.post("/{pet_id}/vaccination")
def add_vaccination(
    pet_id: int,
    vaccine_name: str = Form(...),
    vaccine_type: str = Form(None),
    batch_number: str = Form(None),
    date_given: str = Form(...),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    given = date.fromisoformat(date_given)
    interval = VACCINE_INTERVALS.get(vaccine_type, 365)
    next_due = given + timedelta(days=interval)
    photo_url = save_file(photo) if photo else None

    # Врач сразу подтверждает, клиент — нет
    is_confirmed = current_user.role in ["vet", "assistant", "head"]

    vac = Vaccination(
        pet_id=pet_id,
        vet_id=current_user.id,
        vaccine_name=vaccine_name,
        vaccine_type=vaccine_type,
        batch_number=batch_number,
        date_given=given,
        next_due_date=next_due,
        photo_url=photo_url,
        notes=notes,
        is_confirmed=is_confirmed,
        confirmed_by=current_user.id if is_confirmed else None
    )
    db.add(vac)
    db.commit()
    db.refresh(vac)
    return {"message": "Вакцинация добавлена", "next_due_date": str(next_due)}


@router.post("/{pet_id}/vaccination/{vac_id}/confirm")
def confirm_vaccination(
    pet_id: int,
    vac_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    vac = db.query(Vaccination).filter(
        Vaccination.id == vac_id,
        Vaccination.pet_id == pet_id
    ).first()
    if not vac:
        raise HTTPException(status_code=404, detail="Вакцинация не найдена")
    vac.is_confirmed = True
    vac.confirmed_by = current_user.id
    db.commit()
    return {"message": "Вакцинация подтверждена"}


@router.post("/{pet_id}/vaccination/{vac_id}/reject")
def reject_vaccination(
    pet_id: int,
    vac_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    vac = db.query(Vaccination).filter(
        Vaccination.id == vac_id,
        Vaccination.pet_id == pet_id
    ).first()
    if not vac:
        raise HTTPException(status_code=404, detail="Вакцинация не найдена")
    db.delete(vac)
    db.commit()
    return {"message": "Вакцинация отклонена и удалена"}


@router.post("/{pet_id}/health")
def add_health_log(
    pet_id: int,
    log_date: str = Form(...),
    condition: str = Form("good"),
    temperature: float = Form(None),
    weight: float = Form(None),
    symptoms: str = Form(None),
    notes: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = PetHealthLog(
        pet_id=pet_id,
        recorded_by=current_user.id,
        date=date.fromisoformat(log_date),
        condition=condition,
        temperature=temperature,
        weight=weight,
        symptoms=symptoms,
        notes=notes
    )
    db.add(log)

    if weight:
        pet = db.query(Pet).filter(Pet.id == pet_id).first()
        if pet:
            pet.weight = weight

    db.commit()
    return {"message": "Запись о здоровье добавлена"}


@router.put("/{pet_id}/health/{log_id}")
def update_health_log(
    pet_id: int,
    log_id: int,
    log_date: str = Form(...),
    condition: str = Form("good"),
    temperature: float = Form(None),
    weight: float = Form(None),
    symptoms: str = Form(None),
    notes: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(PetHealthLog).filter(
        PetHealthLog.id == log_id,
        PetHealthLog.pet_id == pet_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    log.date = date.fromisoformat(log_date)
    log.condition = condition
    log.temperature = temperature
    log.weight = weight
    log.symptoms = symptoms
    log.notes = notes

    if weight:
        pet = db.query(Pet).filter(Pet.id == pet_id).first()
        if pet:
            pet.weight = weight

    db.commit()
    return {"message": "Запись обновлена"}


@router.post("/{pet_id}/health/{log_id}/delete")
def delete_health_log(
    pet_id: int,
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(PetHealthLog).filter(
        PetHealthLog.id == log_id,
        PetHealthLog.pet_id == pet_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(log)
    db.commit()
    return {"message": "Запись удалена"}


@router.get("/pending/count")
def get_pending_count(
        db: Session = Depends(get_db),
        current_user: User = Depends(require_vet)
):
    pending_passports = db.query(PetPassport).filter(
        PetPassport.is_confirmed == False,
        PetPassport.passport_number != None
    ).count()
    pending_vacs = db.query(Vaccination).filter(
        Vaccination.is_confirmed == False
    ).count()
    return {
        "pending_passports": pending_passports,
        "pending_vaccinations": pending_vacs,
        "total": pending_passports + pending_vacs
    }


@router.get("/overdue/owners")
def get_overdue_owners(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Владельцы питомцев с просроченными прививками — одним JOIN-запросом"""
    today = date.today()

    # Один запрос с JOIN вместо N отдельных запросов
    rows = (
        db.query(Vaccination, Pet, User)
        .join(Pet, Pet.id == Vaccination.pet_id)
        .join(User, User.id == Pet.owner_id)
        .filter(
            Vaccination.is_confirmed == True,
            Vaccination.next_due_date != None,
            Vaccination.next_due_date < today,
        )
        .order_by(Vaccination.next_due_date.asc())
        .all()
    )

    result = []
    seen = set()  # исключаем дубли (один владелец — несколько просроченных)
    for vac, pet, owner in rows:
        key = f"{owner.id}_{pet.id}_{vac.vaccine_name}"
        if key in seen:
            continue
        seen.add(key)
        days_overdue = (today - vac.next_due_date).days
        result.append({
            "owner_name": owner.full_name or owner.login,
            "email": owner.email or "—",
            "phone": owner.phone or "—",
            "pet_name": pet.name,
            "vaccine_name": vac.vaccine_name,
            "next_due_date": str(vac.next_due_date),
            "days_overdue": days_overdue,
        })

    return result


@router.post("/overdue/notify")
async def notify_overdue_owners(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Отправить Email владельцам с просроченными прививками через FastMail"""
    try:
        from backend.email_service import send_vaccination_reminder
    except ImportError:
        from backend.services.email_service import send_vaccination_reminder

    today = date.today()
    rows = (
        db.query(Vaccination, Pet, User)
        .join(Pet, Pet.id == Vaccination.pet_id)
        .join(User, User.id == Pet.owner_id)
        .filter(
            Vaccination.is_confirmed == True,
            Vaccination.next_due_date != None,
            Vaccination.next_due_date < today,
        )
        .all()
    )

    sent, seen = 0, set()
    for vac, pet, owner in rows:
        key = f"{owner.id}_{pet.id}_{vac.vaccine_name}"
        if key in seen or not owner.email:
            continue
        seen.add(key)
        days_overdue = (today - vac.next_due_date).days
        try:
            await send_vaccination_reminder(
                client_email=owner.email,
                client_name=owner.full_name or owner.login,
                pet_name=pet.name,
                vaccine_name=vac.vaccine_name,
                due_date=str(vac.next_due_date),
                days_left=-days_overdue,  # отрицательное = просрочено
            )
            sent += 1
        except Exception as e:
            print(f"[Email error] {owner.email}: {e}")

    return {"message": f"Уведомления отправлены: {sent}", "sent": sent}

# ══ Процедуры (обработки от паразитов) ══════════════════════════════════════

class ProcedureCreate(BaseModel):
    type: str = "ecto_parasite"
    drug_name: str = ""
    manufacturer: str = ""
    date: str = ""
    doctor: str = ""

@router.post("/{pet_id}/procedure")
def add_procedure(
    pet_id: int,
    data: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    from datetime import date as dt_date
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    proc_date = dt_date.fromisoformat(data.date) if data.date else dt_date.today()
    proc = Procedure(
        pet_id=pet_id,
        vet_id=current_user.id,
        type=data.type,
        drug_name=data.drug_name,
        manufacturer=data.manufacturer,
        description=data.drug_name,
        date=proc_date,
        is_confirmed=True,
    )
    db.add(proc)
    db.commit()
    db.refresh(proc)
    return {"id": proc.id, "message": "Процедура добавлена"}


# ══ Подтверждение паспорта ═══════════════════════════════════════════════════

@router.post("/{pet_id}/confirm")
def confirm_passport_by_vet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        passport = PetPassport(pet_id=pet_id)
        db.add(passport)
    passport.is_confirmed = True
    passport.confirmed_by = current_user.id
    db.commit()
    return {"message": "Паспорт подтверждён"}


# ══ Клиническое обследование ═════════════════════════════════════════════════

@router.post("/{pet_id}/clinical_exam")
def add_clinical_exam(
    pet_id: int,
    exam_date: str = Form(...),
    vet_name: str = Form(default=""),
    authorized_name: str = Form(default=""),
    notes: str = Form(default=""),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    from datetime import date as dt_date
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        passport = PetPassport(pet_id=pet_id)
        db.add(passport)
        db.flush()
    # Храним в JSON поле clinical_exams
    import json
    exams = json.loads(passport.clinical_exams or "[]")
    exams.append({
        "exam_date": exam_date,
        "vet_name": vet_name or current_user.full_name,
        "authorized_name": authorized_name or current_user.full_name,
        "notes": notes,
    })
    passport.clinical_exams = json.dumps(exams, ensure_ascii=False)
    db.commit()
    return {"message": "Запись о клиническом обследовании добавлена"}


# ══ Титры антител к вирусу бешенства ════════════════════════════════════════

class TiterCreate(BaseModel):
    sample_date: str = ""
    laboratory: str = ""
    result: str = ""
    record_date: str = ""
    vet_name: str = ""

@router.post("/{pet_id}/titer")
def add_rabies_titer(
    pet_id: int,
    data: TiterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    from datetime import date as dt_date
    import json
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    passport = db.query(PetPassport).filter(PetPassport.pet_id == pet_id).first()
    if not passport:
        passport = PetPassport(pet_id=pet_id)
        db.add(passport)
        db.flush()
    titers = json.loads(passport.rabies_titers or "[]")
    titers.append({
        "sample_date": data.sample_date,
        "laboratory": data.laboratory,
        "result": data.result,
        "record_date": data.record_date or str(dt_date.today()),
        "vet_name": data.vet_name or current_user.full_name,
        "status": "confirmed",
    })
    passport.rabies_titers = json.dumps(titers, ensure_ascii=False)
    db.commit()
    return {"message": "Запись о титрах добавлена"}
    return {"message": "Запись о титрах добавлена"}


# ══ Архивирование карты питомца ══════════════════════════════════════════════

class ArchiveData(BaseModel):
    reason: str = "other"   # died / moved / other
    note: str = ""

@router.post("/{pet_id}/archive")
def archive_pet(
    pet_id: int,
    data: ArchiveData,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    from datetime import datetime as dt
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    pet.is_archived = True
    pet.archive_reason = data.reason
    pet.archive_note = data.note
    pet.archived_at = dt.utcnow()
    db.commit()
    return {"message": "Карта питомца архивирована"}

@router.post("/{pet_id}/unarchive")
def unarchive_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    pet.is_archived = False
    pet.archive_reason = None
    pet.archive_note = None
    pet.archived_at = None
    db.commit()
    return {"message": "Карта питомца восстановлена"}


# ══ История болезней ═════════════════════════════════════════════════════════

@router.get("/{pet_id}/medical_history")
def get_medical_history(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from backend.models.models import MedicalHistory
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    records = (
        db.query(MedicalHistory)
        .filter(MedicalHistory.pet_id == pet_id)
        .order_by(MedicalHistory.visit_date.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "appointment_id": r.appointment_id,
            "visit_date": str(r.visit_date) if r.visit_date else None,
            "anamnesis": r.anamnesis or "",
            "diagnosis": r.diagnosis or "—",
            "medications": r.medications or "",
            "recommendations": r.recommendations or "",
            "notes": r.notes or "",
            "vet_name": r.vet.full_name if r.vet else "—",
        }
        for r in records
    ]
