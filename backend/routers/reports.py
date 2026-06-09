from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_
from datetime import date, timedelta, datetime as dt_dt
from typing import Optional
from collections import Counter
from backend.database import get_db
from backend.models.models import Appointment, Vaccination, PetHealthLog, User, Pet, AppointmentStatus, MedicalHistory, Procedure
from backend.services.auth import require_head

router = APIRouter(prefix="/reports", tags=["Reports"])

MONTHS_RU = {1:'Янв',2:'Фев',3:'Мар',4:'Апр',5:'Май',6:'Июн',
             7:'Июл',8:'Авг',9:'Сен',10:'Окт',11:'Ноя',12:'Дек'}

def _build_clients_growth(db: Session):
    """Уникальные клиенты по месяцам за последние 12 мес. (по первому приёму)."""
    today = date.today()
    try:
        year_ago = today.replace(year=today.year - 1)
    except ValueError:
        year_ago = today - timedelta(days=365)
    appts = db.query(Appointment).filter(
        Appointment.date >= year_ago,
        Appointment.client_id != None
    ).order_by(Appointment.date).all()
    seen = {}
    for a in appts:
        key = f"{a.date.year}-{a.date.month:02d}"
        if a.client_id not in seen:
            seen[a.client_id] = key
    monthly = {}
    for key in seen.values():
        monthly[key] = monthly.get(key, 0) + 1
    return [
        {"month": MONTHS_RU.get(int(k.split('-')[1]), k), "count": v}
        for k, v in sorted(monthly.items())
    ]


@router.get("/summary")
def get_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()

    period_days = (date_to - date_from).days + 1

    # Приёмы за период
    appointments = db.query(Appointment).filter(
        Appointment.date >= date_from,
        Appointment.date <= date_to
    ).all()

    total     = len(appointments)
    completed = len([a for a in appointments if a.status == AppointmentStatus.completed])
    cancelled = len([a for a in appointments if a.status == AppointmentStatus.cancelled])
    pending   = len([a for a in appointments if a.status == AppointmentStatus.pending])
    confirmed = len([a for a in appointments if a.status == AppointmentStatus.confirmed])

    # По врачам
    by_vet = {}
    for a in appointments:
        vet = db.query(User).filter(User.id == a.vet_id).first()
        name = vet.full_name if vet else f"ID {a.vet_id}"
        if name not in by_vet:
            by_vet[name] = {"total": 0, "completed": 0, "cancelled": 0}
        by_vet[name]["total"] += 1
        if a.status == AppointmentStatus.completed: by_vet[name]["completed"] += 1
        if a.status == AppointmentStatus.cancelled:  by_vet[name]["cancelled"] += 1

    # Вакцинации за период
    vaccinations = db.query(Vaccination).filter(
        Vaccination.date_given >= date_from,
        Vaccination.date_given <= date_to
    ).all()

    vac_by_type = {}
    for v in vaccinations:
        vac_by_type[v.vaccine_name] = vac_by_type.get(v.vaccine_name, 0) + 1

    # Динамика по дням
    daily = {}
    for a in appointments:
        d = str(a.date)
        daily[d] = daily.get(d, 0) + 1
    daily_list = [{"date": k, "count": v} for k, v in sorted(daily.items())]

    # ── Тренд: сравниваем с предыдущим аналогичным периодом (не год назад) ──
    prev_start = date_from - timedelta(days=period_days)
    prev_end   = date_from - timedelta(days=1)
    prev_appointments = db.query(Appointment).filter(
        Appointment.date >= prev_start,
        Appointment.date <= prev_end
    ).all()
    prev_total     = len(prev_appointments)
    prev_completed = len([a for a in prev_appointments if a.status == AppointmentStatus.completed])
    avg_per_day      = round(total / period_days, 2) if period_days > 0 else 0
    avg_per_day_prev = round(prev_total / period_days, 2) if period_days > 0 else 0
    trend_pct = round((total - prev_total) / prev_total * 100, 1) if prev_total > 0 else 0

    # ── Прогноз на следующий квартал ─────────────────────────────────────────
    next_q_start = date_to + timedelta(days=1)
    next_q_end   = next_q_start + timedelta(days=90)
    upcoming_vacs = db.query(Vaccination).filter(
        Vaccination.next_due_date >= next_q_start,
        Vaccination.next_due_date <= next_q_end,
        Vaccination.is_confirmed == True
    ).all()
    overdue_vacs = db.query(Vaccination).filter(
        Vaccination.next_due_date < date.today(),
        Vaccination.is_confirmed == True
    ).all()

    completion_rate = round(completed / total * 100, 1) if total > 0 else 0
    forecast_appointments  = round(avg_per_day * 90)
    forecast_completed     = round(forecast_appointments * completion_rate / 100)
    avg_vac_per_day        = len(vaccinations) / period_days if period_days > 0 else 0
    forecast_vaccinations_count = round(avg_vac_per_day * 90)

    # ══ ПРОГНОЗ ЗАКУПКИ ВАКЦИН ════════════════════════════════════════════════
    # Точный подсчёт: сколько доз каждой вакцины нужно в следующем квартале
    vac_counter = Counter()
    vac_pets = {}
    for v in upcoming_vacs:
        vac_counter[v.vaccine_name] += 1
        if v.vaccine_name not in vac_pets:
            vac_pets[v.vaccine_name] = []
        pet_obj = db.query(Pet).filter(Pet.id == v.pet_id).first()
        vac_pets[v.vaccine_name].append(pet_obj.name if pet_obj else "—")

    medicine_forecast = []
    for vname, cnt in sorted(vac_counter.items(), key=lambda x: -x[1]):
        is_required = 'бешенство' in vname.lower()
        medicine_forecast.append({
            "name": vname,
            "category": "Вакцины",
            "method": "exact",
            "used_in_period": None,
            "forecast_qty": cnt,
            "basis": f"Плановых прививок в следующем квартале: {cnt} животных",
            "is_vaccine": True,
            "is_required": is_required,
            "pets": vac_pets.get(vname, [])[:5],
        })

        # Список ближайших прививок
    upcoming_vac_list = []
    for v in sorted(upcoming_vacs, key=lambda x: x.next_due_date)[:20]:
        pet_obj = db.query(Pet).filter(Pet.id == v.pet_id).first()
        upcoming_vac_list.append({
            "pet_name": pet_obj.name if pet_obj else "—",
            "vaccine": v.vaccine_name,
            "due_date": str(v.next_due_date)
        })

    # ── Сезонность: приёмы по месяцам (последние 12 мес. от даты TO) ────────
    year_ago = date_to - timedelta(days=365)
    all_year_appts = db.query(Appointment).filter(
        Appointment.date >= year_ago,
        Appointment.date <= date_to,
        Appointment.status == AppointmentStatus.completed
    ).all()

    months_ru = {1:'Янв',2:'Фев',3:'Мар',4:'Апр',5:'Май',6:'Июн',
                 7:'Июл',8:'Авг',9:'Сен',10:'Окт',11:'Ноя',12:'Дек'}
    monthly = {}
    for a in all_year_appts:
        key = f"{a.date.year}-{a.date.month:02d}"
        monthly[key] = monthly.get(key, 0) + 1
    seasonality = [
        {"month": months_ru[int(k.split('-')[1])], "year_month": k, "count": v}
        for k, v in sorted(monthly.items())
    ]

    # ── Диагнозы по месяцам — тоже за тот же год ─────────────────────────────
    year_history = db.query(MedicalHistory).filter(
        MedicalHistory.visit_date >= dt_dt.combine(year_ago, dt_dt.min.time()),
        MedicalHistory.visit_date <= dt_dt.combine(date_to, dt_dt.max.time())
    ).all()
    diag_monthly = {}
    for h in year_history:
        if h.diagnosis and h.diagnosis.strip() and h.visit_date:
            m = h.visit_date.month
            key = months_ru.get(m, str(m))
            diag_monthly[key] = diag_monthly.get(key, 0) + 1
    diag_seasonality = [{"month": k, "count": v} for k, v in diag_monthly.items()]

    # ── Топ диагнозов за ВЫБРАННЫЙ период (date_from..date_to) ───────────────
    top_diagnoses_period = db.query(MedicalHistory).filter(
        MedicalHistory.visit_date >= dt_dt.combine(date_from, dt_dt.min.time()),
        MedicalHistory.visit_date <= dt_dt.combine(date_to, dt_dt.max.time())
    ).all()
    diag_counter_period = Counter()
    for h in top_diagnoses_period:
        if h.diagnosis and h.diagnosis.strip() and h.diagnosis != '—':
            diag_counter_period[h.diagnosis.strip()] += 1
    top_diagnoses = [
        {"diagnosis": k, "count": v}
        for k, v in diag_counter_period.most_common(10)
    ]

    # ── Пиковые дни недели ────────────────────────────────────────────────────
    weekday_counts = {0:0,1:0,2:0,3:0,4:0}
    weekday_names  = {0:'Пн',1:'Вт',2:'Ср',3:'Чт',4:'Пт'}
    for a in appointments:
        wd = a.date.weekday()
        if wd in weekday_counts:
            weekday_counts[wd] += 1
    busiest_day = max(weekday_counts, key=weekday_counts.get) if weekday_counts else 0

    # ── Виды животных в реестре ───────────────────────────────────────────────
    species_ru = {
        'cat': 'Кошки', 'dog': 'Собаки', 'rabbit': 'Кролики',
        'bird': 'Птицы', 'hamster': 'Хомяки', 'guinea_pig': 'Морские свинки',
        'reptile': 'Рептилии', 'fish': 'Рыбы', 'other': 'Прочие'
    }
    all_pets = db.query(Pet).filter(
        or_(Pet.is_archived == False, Pet.is_archived == None)
    ).all()
    species_counter = Counter(p.species or 'other' for p in all_pets)
    species_data = [
        {"name": species_ru.get(k, k), "value": v}
        for k, v in species_counter.most_common()
        if v > 0
    ]

    # ── Охват вакцинацией по видам животных ──────────────────────────────────
    species_vaccination_data = []
    for sp_key, sp_name in species_ru.items():
        pets_of_species = [p for p in all_pets if (p.species or 'other') == sp_key]
        if not pets_of_species:
            continue
        total_sp = len(pets_of_species)
        pet_ids = [p.id for p in pets_of_species]
        vaccinated_count = len(set(
            v.pet_id for v in db.query(Vaccination).filter(
                Vaccination.pet_id.in_(pet_ids),
                Vaccination.is_confirmed == True,
                Vaccination.next_due_date >= date.today()
            ).all()
        ))
        pct = round(vaccinated_count / total_sp * 100) if total_sp > 0 else 0
        species_vaccination_data.append({
            "name": sp_name, "total": total_sp,
            "vaccinated": vaccinated_count, "not_vaccinated": total_sp - vaccinated_count,
            "pct": pct
        })
    species_vaccination_data.sort(key=lambda x: -x["total"])

    # ── Операции и услуги по категориям прейскуранта (за выбранный период) ───
    service_categories = {
        'Хирургия': [
            'кастрац', 'стерилиз', 'овариогистер', 'удаление матки',
            'кесарево', 'кесар', 'операци', 'грыжесечен', 'остеосинтез',
            'урологическ', 'лапаротоми', 'ушивани', 'обработка ран',
            'вправлени', 'удаление зуба', 'зубного камня', 'купировани',
            'удаление прибылых', 'удаление глазного', 'извлечени',
            'новообразовани', 'вывих',
        ],
        'Терапия и уколы': [
            'инъекц', 'укол', 'подкожн', 'внутримышечн',
            'внутривенн', 'капельниц', 'инфузи', 'оксигенотерапи',
            'физиопроцедур', 'катетериз', 'пункци', 'лапароцентез',
            'перитони', 'промывани', 'очистка', 'параанальн',
            'клизм', 'вакцинаци',
        ],
        'Лаборатория': [
            'анализ крови', 'биохим', 'серологич', 'паразитологич',
            'соскоб', 'микроспори', 'анализ мочи', 'пунктат',
            'вагинит', 'постит', 'взятие крови', 'взятие проб',
            'исследование', 'лаборатор', 'lab',
        ],
        'Уход и регистрация': [
            'стрижк', 'груминг', 'когт', 'клюв', 'резц',
            'чипировани', 'чип', 'биркован', 'идентификаци',
            'осмотр', 'взвешивани', 'консультац', 'рентген',
        ],
    }
    period_procs = db.query(Procedure).filter(
        Procedure.date >= date_from,
        Procedure.date <= date_to
    ).all()
    period_history = db.query(MedicalHistory).filter(
        MedicalHistory.visit_date >= dt_dt.combine(date_from, dt_dt.min.time()),
        MedicalHistory.visit_date <= dt_dt.combine(date_to, dt_dt.max.time())
    ).all()
    surgery_data = []
    for category, keywords in service_categories.items():
        count = sum(1 for p in period_procs
            if any(kw in (p.description or '').lower() or kw in (p.drug_name or '').lower()
                   or kw in (p.type or '').lower() for kw in keywords))
        count += sum(1 for h in period_history
            if any(kw in (h.diagnosis or '').lower() or kw in (h.medications or '').lower()
                   or kw in (h.notes or '').lower() for kw in keywords))
        surgery_data.append({"name": category, "count": count})

    # ── Динамика приёмов по врачам по месяцам ────────────────────────────────
    all_year_appts_vet = db.query(Appointment).filter(Appointment.date >= year_ago).all()
    vet_monthly = {}
    vet_id_to_name = {}
    for a in all_year_appts_vet:
        if a.vet_id not in vet_id_to_name:
            vo = db.query(User).filter(User.id == a.vet_id).first()
            vet_id_to_name[a.vet_id] = vo.full_name.split()[0] if vo else f"#{a.vet_id}"
        vname = vet_id_to_name[a.vet_id]
        key = f"{a.date.year}-{a.date.month:02d}"
        if key not in vet_monthly:
            vet_monthly[key] = {}
        vet_monthly[key][vname] = vet_monthly[key].get(vname, 0) + 1
    vet_monthly_list = [
        {"month": months_ru[int(k.split('-')[1])], "year_month": k, **v}
        for k, v in sorted(vet_monthly.items())
    ]
    vet_names_list = list({n for row in vet_monthly_list for n in row if n not in ('month', 'year_month')})

    # ── Динамика уникальных клиентов по врачам ────────────────────────────────
    vet_clients_monthly = {}
    for a in all_year_appts_vet:
        vname = vet_id_to_name.get(a.vet_id, f"#{a.vet_id}")
        key = f"{a.date.year}-{a.date.month:02d}"
        if key not in vet_clients_monthly:
            vet_clients_monthly[key] = {}
        if vname not in vet_clients_monthly[key]:
            vet_clients_monthly[key][vname] = set()
        vet_clients_monthly[key][vname].add(a.client_id)
    vet_clients_list = [
        {"month": months_ru[int(k.split('-')[1])], "year_month": k,
         **{vn: len(cls) for vn, cls in v.items()}}
        for k, v in sorted(vet_clients_monthly.items())
    ]

    # ── Топ-диагнозы по месяцам (сезонная структура) ─────────────────────────
    season_top = {}
    for h in year_history:
        if not h.visit_date:
            continue
        m_key = months_ru.get(h.visit_date.month, '')
        if not m_key:
            continue
        if m_key not in season_top:
            season_top[m_key] = Counter()
        diag = (h.diagnosis or '').strip()
        if diag and diag != '—':
            season_top[m_key][diag] += 1
    season_top_out = {
        month: [{"diagnosis": d, "count": c} for d, c in counter.most_common(3)]
        for month, counter in season_top.items()
        if counter
    }

    # ── KPI врачей за ВЫБРАННЫЙ период ───────────────────────────────────────
    staff_kpi = []
    for vet_name_key, vet_stats in by_vet.items():
        vet_obj = db.query(User).filter(User.full_name == vet_name_key).first()
        # Уникальные клиенты за период
        unique_clients = len(set(
            a.client_id for a in appointments
            if a.vet_id == (vet_obj.id if vet_obj else -1)
        ))
        completion_rate_vet = round(
            vet_stats['completed'] / vet_stats['total'] * 100
        ) if vet_stats['total'] > 0 else 0
        staff_kpi.append({
            "vet": vet_name_key,
            "total": vet_stats['total'],
            "completed": vet_stats['completed'],
            "cancelled": vet_stats['cancelled'],
            "completion_rate": completion_rate_vet,
            "unique_clients": unique_clients,
        })
    staff_kpi.sort(key=lambda x: -x['total'])

    return {
        "period": {"from": str(date_from), "to": str(date_to)},
        "appointments": {
            "total": total, "completed": completed,
            "cancelled": cancelled, "pending": pending, "confirmed": confirmed,
            "by_vet": [{"vet": k, **v} for k, v in by_vet.items()],
            "daily": daily_list
        },
        "vaccinations": {
            "total": len(vaccinations),
            "by_type": [{"name": k, "count": v} for k, v in sorted(vac_by_type.items(), key=lambda x: -x[1])],
            "upcoming_next_quarter": len(upcoming_vacs),
            "overdue": len(overdue_vacs)
        },
        "health": {
            "total_logs": db.query(PetHealthLog).filter(
                PetHealthLog.date >= date_from,
                PetHealthLog.date <= date_to
            ).count(),
            "by_condition": {"good": 0, "fair": 0, "poor": 0}
        },
        "forecast": {
            "period": f"{next_q_start} — {next_q_end}",
            "expected_vaccinations": len(upcoming_vacs),
            "overdue_vaccinations": len(overdue_vacs),
            "forecast_appointments": forecast_appointments,
            "forecast_completed": forecast_completed,
            "forecast_vaccinations": forecast_vaccinations_count,
            "upcoming_vaccines": upcoming_vac_list,
            "medicine_forecast": medicine_forecast,
        },
        "analytics": {
            "avg_per_day": avg_per_day,
            "avg_per_day_prev_period": avg_per_day_prev,
            "trend_pct": trend_pct,
            "trend_label": f"vs. предыдущий период ({str(prev_start)} — {str(prev_end)})",
            "completion_rate": completion_rate,
            "busiest_day": weekday_names.get(busiest_day, 'Пн'),
            "prev_period_total": prev_total,
        },
        "diagnoses": {
            "top": top_diagnoses,
            "seasonality": diag_seasonality,
            "season_top": season_top_out,
        },
        "seasonality": seasonality,
        "species": species_data,
        "species_vaccination": species_vaccination_data,
        "surgery": surgery_data,
        "staff_monthly": {"by_month": vet_monthly_list, "vets": vet_names_list},
        "staff_clients": {"by_month": vet_clients_list, "vets": vet_names_list},
        "staff_kpi": staff_kpi,
        "general": {
            "total_clients": db.query(User).filter(User.role == "client").count(),
            "total_pets": db.query(Pet).count(),
            "clients_growth": _build_clients_growth(db)
        }
    }


@router.get("/vaccines/history")
def get_vaccines_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    today = date.today()
    # Берём все вакцинации, сортируем по дате убывания
    vaccinations = db.query(Vaccination).order_by(Vaccination.date_given.desc()).all()

    # Оставляем только последнюю запись по каждому питомцу+вакцине
    latest = {}
    for v in vaccinations:
        key = (v.pet_id, v.vaccine_name)
        if key not in latest:
            latest[key] = v

    result = []
    for v in latest.values():
        pet = db.query(Pet).filter(Pet.id == v.pet_id).first()
        owner = db.query(User).filter(User.id == pet.owner_id).first() if pet else None
        if v.next_due_date:
            days_left = (v.next_due_date - today).days
            status = "overdue" if days_left < 0 else ("soon" if days_left <= 30 else "ok")
        else:
            status = "no_schedule"
            days_left = None
        result.append({
            "id": v.id,
            "pet_name": pet.name if pet else "—",
            "pet_species": pet.species if pet else "—",
            "owner_name": owner.full_name if owner else "—",
            "owner_phone": owner.phone if owner else None,
            "owner_email": owner.email if owner else None,
            "vaccine_name": v.vaccine_name,
            "date_given": str(v.date_given),
            "next_due_date": str(v.next_due_date) if v.next_due_date else None,
            "days_left": days_left,
            "status": status,
            "is_confirmed": v.is_confirmed,
        })
    # Сортируем: сначала просроченные, потом скоро, потом ок
    order = {"overdue": 0, "soon": 1, "ok": 2, "no_schedule": 3}
    result.sort(key=lambda x: (order.get(x["status"], 3), x["next_due_date"] or ""))
    return result


@router.get("/vaccines/overdue")
def get_overdue_vaccines(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    today = date.today()
    # Берём все подтверждённые вакцинации, сортируем по дате убывания
    all_vacs = db.query(Vaccination).filter(
        Vaccination.is_confirmed == True
    ).order_by(Vaccination.date_given.desc()).all()

    # Для каждого питомца+вакцина берём только последнюю запись
    latest = {}
    for v in all_vacs:
        key = (v.pet_id, v.vaccine_name)
        if key not in latest:
            latest[key] = v

    # Из последних записей оставляем только просроченные
    result = []
    for v in latest.values():
        if not v.next_due_date or v.next_due_date >= today:
            continue  # актуальная или без даты — пропускаем
        pet = db.query(Pet).filter(Pet.id == v.pet_id).first()
        owner = db.query(User).filter(User.id == pet.owner_id).first() if pet else None
        result.append({
            "pet_name": pet.name if pet else "—",
            "pet_species": pet.species if pet else "—",
            "owner_name": owner.full_name if owner else "—",
            "owner_phone": owner.phone if owner else None,
            "owner_email": owner.email if owner else None,
            "vaccine_name": v.vaccine_name,
            "next_due_date": str(v.next_due_date) if v.next_due_date else None,
            "days_overdue": (today - v.next_due_date).days if v.next_due_date else None,
        })
    result.sort(key=lambda x: -(x["days_overdue"] or 0))
    return result


@router.post("/vaccines/notify-overdue")
async def notify_overdue_vaccines(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    from backend.services.email_service import send_email
    today = date.today()
    all_vacs = db.query(Vaccination).filter(
        Vaccination.is_confirmed == True
    ).order_by(Vaccination.date_given.desc()).all()
    latest_notify = {}
    for v in all_vacs:
        key = (v.pet_id, v.vaccine_name)
        if key not in latest_notify:
            latest_notify[key] = v
    overdue = [v for v in latest_notify.values()
               if v.next_due_date and v.next_due_date < today]
    notified = set()
    sent_count = 0
    for v in overdue:
        pet = db.query(Pet).filter(Pet.id == v.pet_id).first()
        if not pet:
            continue
        owner = db.query(User).filter(User.id == pet.owner_id).first()
        if not owner or not owner.email:
            continue
        key = (owner.id, v.vaccine_name, v.pet_id)
        if key in notified:
            continue
        notified.add(key)
        days_overdue = (today - v.next_due_date).days
        body = f"""<p>Уважаемый(ая) <b>{owner.full_name}</b>,</p>
        <p>у вашего питомца <b>{pet.name}</b> просрочена вакцинация:</p>
        <ul>
            <li><b>Вакцина:</b> {v.vaccine_name}</li>
            <li><b>Срок ревакцинации:</b> {v.next_due_date}</li>
            <li><b>Просрочено на:</b> {days_overdue} дн.</li>
        </ul>
        <p>Запишитесь на приём: ГБУ «Городская ветеринарная станция г. Байконур», тел. +7 (33622) 4-62-68</p>"""
        await send_email(owner.email, f"⚠️ Просрочена вакцинация питомца {pet.name}", body)
        sent_count += 1
    return {"sent": sent_count}


def mnk_forecast(monthly_data: dict, future_months: list) -> dict:
    """
    Прогноз методом наименьших квадратов (МНК).
    monthly_data: {(year, month): count} — история по месяцам
    future_months: [(year, month), ...] — месяцы для прогноза
    Возвращает: {(year, month): predicted_count}
    """
    if len(monthly_data) < 3:
        # Недостаточно данных для МНК
        return {}

    # Нумеруем точки: x = 1,2,3,...
    sorted_keys = sorted(monthly_data.keys())
    x_vals = list(range(1, len(sorted_keys) + 1))
    y_vals = [monthly_data[k] for k in sorted_keys]

    n = len(x_vals)
    sum_x  = sum(x_vals)
    sum_y  = sum(y_vals)
    sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
    sum_x2 = sum(x * x for x in x_vals)

    # МНК: y = a + b*x
    b = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
    a = (sum_y - b * sum_x) / n

    # Прогноз на будущие месяцы
    result = {}
    for i, month_key in enumerate(future_months):
        x_future = len(sorted_keys) + i + 1
        predicted = a + b * x_future
        result[month_key] = max(0, round(predicted))  # не может быть отрицательным

    return result


@router.get("/vaccines/procurement")
def get_procurement_forecast(
    period: str = "quarter",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    today = date.today()
    days = 90 if period == "quarter" else 365
    period_label = "квартал" if period == "quarter" else "год"
    next_start = today + timedelta(days=1)
    next_end = today + timedelta(days=days)

    divisor = 4 if period == "quarter" else 1

    # ── Данные из базы: берём только последнюю запись по каждой вакцине/питомцу ──
    all_vacs = db.query(Vaccination).filter(
        Vaccination.is_confirmed == True
    ).order_by(Vaccination.pet_id, Vaccination.vaccine_name, Vaccination.date_given.desc()).all()

    # Для каждого питомца берём только последнюю запись каждой вакцины
    latest = {}  # (pet_id, vaccine_name) -> Vaccination
    for v in all_vacs:
        key = (v.pet_id, v.vaccine_name)
        if key not in latest:
            latest[key] = v

    upcoming_list = [v for v in latest.values()
                     if v.next_due_date and next_start <= v.next_due_date <= next_end]
    overdue_list  = [v for v in latest.values()
                     if v.next_due_date and v.next_due_date < today]

    hist_start = next_start - timedelta(days=365)
    hist_end   = next_end   - timedelta(days=365)
    historical = db.query(Vaccination).filter(
        Vaccination.date_given >= hist_start,
        Vaccination.date_given <= hist_end,
        Vaccination.is_confirmed == True
    ).all()

    from collections import defaultdict
    counts = defaultdict(lambda: {"upcoming": 0, "overdue": 0, "historical": 0})
    for v in upcoming_list:
        counts[v.vaccine_name]["upcoming"] += 1
    for v in overdue_list:
        counts[v.vaccine_name]["overdue"] += 1
    for v in historical:
        counts[v.vaccine_name]["historical"] += 1

    # ── МНК: помесячный прогноз по всей истории вакцинаций ───────────────────────
    # Берём всю историю подтверждённых вакцинаций из базы
    all_history = db.query(Vaccination).filter(
        Vaccination.is_confirmed == True,
        Vaccination.date_given != None
    ).all()

    # Группируем по вакцине и месяцу
    vac_monthly = defaultdict(lambda: defaultdict(int))
    for v in all_history:
        key = (v.date_given.year, v.date_given.month)
        vac_monthly[v.vaccine_name][key] += 1

    # Определяем будущие месяцы прогноза
    from datetime import date as dt
    future_months = []
    cur = next_start.replace(day=1)
    while cur <= next_end:
        future_months.append((cur.year, cur.month))
        # следующий месяц
        if cur.month == 12:
            cur = cur.replace(year=cur.year+1, month=1)
        else:
            cur = cur.replace(month=cur.month+1)

    # Считаем МНК-прогноз для каждой вакцины
    mnk_totals = {}
    for vname, monthly_data in vac_monthly.items():
        forecast = mnk_forecast(monthly_data, future_months)
        mnk_totals[vname] = sum(forecast.values())

    RESERVE = 0.10  # +10% запас (стандарт для госучреждений)

    items = []
    for vname, c in counts.items():
        from_db   = c["upcoming"] + c["overdue"]
        from_hist = c["historical"]
        mnk_pred  = mnk_totals.get(vname, 0)
        # Берём максимум из трёх источников данных системы + 10% запас
        base         = max(from_db, from_hist, mnk_pred)
        total_needed = round(base * (1 + RESERVE))
        items.append({
            "vaccine_name":     vname,
            "upcoming_count":   c["upcoming"],
            "overdue_count":    c["overdue"],
            "historical_count": c["historical"],
            "mnk_forecast":     mnk_pred,
            "base_needed":      base,
            "reserve_pct":      10,
            "total_needed":     total_needed,
        })
    items.sort(key=lambda x: -x["total_needed"])

    return {
        "period":       period_label,
        "period_start": str(next_start),
        "period_end":   str(next_end),
        "items":        items,
        "total_doses":  sum(r["total_needed"] for r in items),
        "reserve_pct":  10,
    }


@router.get("/vaccines/monthly-chart")
def get_vaccines_monthly_chart(
    vaccine: str = "Бешенство",
    months_ahead: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_head)
):
    """
    Помесячные данные для графика: факт + МНК-прогноз.
    Возвращает историю по месяцам и прогноз на months_ahead месяцев вперёд.
    """
    today = date.today()

    # Вся история по выбранной вакцине
    all_history = db.query(Vaccination).filter(
        Vaccination.is_confirmed == True,
        Vaccination.vaccine_name == vaccine,
        Vaccination.date_given != None
    ).all()

    # Группируем по месяцам
    from collections import defaultdict
    monthly_data = defaultdict(int)
    for v in all_history:
        key = (v.date_given.year, v.date_given.month)
        monthly_data[key] += 1

    if not monthly_data:
        return {"vaccine": vaccine, "actual": [], "forecast": [], "has_enough_data": False}

    # Формируем непрерывный ряд от первого месяца до сегодня
    sorted_keys = sorted(monthly_data.keys())
    first = sorted_keys[0]
    cur_y, cur_m = first
    continuous = {}
    while (cur_y, cur_m) <= (today.year, today.month):
        continuous[(cur_y, cur_m)] = monthly_data.get((cur_y, cur_m), 0)
        if cur_m == 12:
            cur_y += 1
            cur_m = 1
        else:
            cur_m += 1

    # МНК
    keys_list = sorted(continuous.keys())
    x_vals = list(range(1, len(keys_list) + 1))
    y_vals = [continuous[k] for k in keys_list]

    has_enough = len(keys_list) >= 3
    forecast_points = []

    if has_enough:
        n = len(x_vals)
        sum_x  = sum(x_vals)
        sum_y  = sum(y_vals)
        sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
        sum_x2 = sum(x * x for x in x_vals)
        denom = n * sum_x2 - sum_x ** 2
        if denom != 0:
            b = (n * sum_xy - sum_x * sum_y) / denom
            a = (sum_y - b * sum_x) / n

            # Прогноз на months_ahead месяцев вперёд
            f_y, f_m = today.year, today.month
            for i in range(1, months_ahead + 1):
                if f_m == 12:
                    f_y += 1
                    f_m = 1
                else:
                    f_m += 1
                x_f = len(keys_list) + i
                predicted = max(0, round(a + b * x_f))
                forecast_points.append({
                    "month": f"{f_y}-{f_m:02d}",
                    "count": predicted
                })

    # Формируем факт
    actual_points = [
        {"month": f"{y}-{m:02d}", "count": continuous[(y, m)]}
        for y, m in keys_list
    ]

    # Список всех доступных вакцин для селектора
    all_vaccines = db.query(Vaccination.vaccine_name).filter(
        Vaccination.is_confirmed == True
    ).distinct().all()
    vaccine_list = sorted([v[0] for v in all_vaccines])

    return {
        "vaccine": vaccine,
        "actual": actual_points,
        "forecast": forecast_points,
        "has_enough_data": has_enough,
        "available_vaccines": vaccine_list,
    }
