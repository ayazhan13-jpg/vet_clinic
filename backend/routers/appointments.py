from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
from backend.database import get_db
from backend.models.models import Appointment, Schedule, User, Pet, AppointmentStatus, MedicalHistory
from backend.schemas.schemas import AppointmentCreate, AppointmentOut
from backend.services.auth import get_current_user, require_vet
from backend.services.email_service import (
    send_appointment_created,
    send_appointment_confirmed,
    send_appointment_cancelled,
    send_appointment_completed,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class PrescriptionData(BaseModel):
    anamnesis: Optional[str] = ""
    diagnosis: Optional[str] = ""
    medications: Optional[str] = ""
    recommendations: Optional[str] = ""
    notes: Optional[str] = ""


@router.post("/", response_model=AppointmentOut)
async def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Appointment).filter(
        Appointment.client_id == current_user.id,
        Appointment.date == data.date,
        Appointment.time == data.time,
        Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже записаны на это время")

    slot = db.query(Schedule).filter(
        Schedule.vet_id == data.vet_id,
        Schedule.date == data.date,
        Schedule.time == data.time,
        Schedule.status == "free"
    ).first()
    if not slot:
        raise HTTPException(status_code=400, detail="Этот слот уже занят")

    slot.status = "busy"
    appointment = Appointment(
        client_id=current_user.id,
        pet_id=data.pet_id,
        vet_id=data.vet_id,
        service_id=data.service_id,
        date=data.date,
        time=data.time,
        status=AppointmentStatus.pending,
        notes=data.notes
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Отправляем уведомление клиенту
    pet = db.query(Pet).filter(Pet.id == data.pet_id).first()
    vet = db.query(User).filter(User.id == data.vet_id).first()
    background_tasks.add_task(
        send_appointment_created,
        client_email=current_user.email,
        client_name=current_user.full_name,
        pet_name=pet.name if pet else "питомец",
        date=str(data.date),
        time=str(data.time)[:5],
        vet_name=vet.full_name if vet else "врач"
    )

    return appointment


@router.get("/my", response_model=List[AppointmentOut])
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Appointment).filter(
        Appointment.client_id == current_user.id
    ).order_by(Appointment.date.desc(), Appointment.time.desc()).all()


@router.get("/vet/schedule")
def get_vet_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    today = date.today()
    appointments = db.query(Appointment).filter(
        Appointment.vet_id == current_user.id
    ).order_by(Appointment.date.asc(), Appointment.time.asc()).all()

    result = []
    for app in appointments:
        is_overdue = (
            app.status == AppointmentStatus.pending and
            app.date < today
        )
        result.append({
            "id": app.id,
            "client_id": app.client_id,
            "pet_id": app.pet_id,
            "vet_id": app.vet_id,
            "service_id": app.service_id,
            "date": str(app.date),
            "time": str(app.time),
            "status": app.status.value if hasattr(app.status, 'value') else app.status,
            "notes": app.notes,
            "vet_message": app.vet_message,
            "is_overdue": is_overdue,
        })
    return result


@router.put("/{appointment_id}/confirm", response_model=AppointmentOut)
async def confirm_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    vet_message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if appointment.vet_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это не ваша запись")

    appointment.status = AppointmentStatus.confirmed
    appointment.vet_message = vet_message or "Ваша запись подтверждена"
    db.commit()
    db.refresh(appointment)

    # Уведомляем клиента
    client = db.query(User).filter(User.id == appointment.client_id).first()
    pet = db.query(Pet).filter(Pet.id == appointment.pet_id).first()
    if client:
        background_tasks.add_task(
            send_appointment_confirmed,
            client_email=client.email,
            client_name=client.full_name,
            pet_name=pet.name if pet else "питомец",
            date=str(appointment.date),
            time=str(appointment.time)[:5],
            vet_name=current_user.full_name,
            vet_message=appointment.vet_message
        )

    return appointment


@router.put("/{appointment_id}/complete", response_model=AppointmentOut)
async def complete_appointment(
    appointment_id: int,
    prescription: PrescriptionData = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    slot = db.query(Schedule).filter(
        Schedule.vet_id == appointment.vet_id,
        Schedule.date == appointment.date,
        Schedule.time == appointment.time
    ).first()
    if slot:
        slot.status = "done"

    # Сохраняем рецепт в поле vet_message
    if prescription:
        parts = []
        if prescription.anamnesis:
            parts.append(f"Анамнез: {prescription.anamnesis}")
        if prescription.diagnosis:
            parts.append(f"Диагноз: {prescription.diagnosis}")
        if prescription.medications:
            parts.append(f"Препараты:\n{prescription.medications}")
        if prescription.recommendations:
            parts.append(f"Рекомендации:\n{prescription.recommendations}")
        if prescription.notes:
            parts.append(f"Заметки: {prescription.notes}")
        appointment.vet_message = "\n\n".join(parts)

    appointment.status = AppointmentStatus.completed
    db.commit()
    db.refresh(appointment)

    # ── Автоматически создаём/обновляем запись в истории болезней ──────────
    if appointment.pet_id:
        existing = db.query(MedicalHistory).filter(
            MedicalHistory.appointment_id == appointment_id
        ).first()
        visit_dt = datetime.combine(appointment.date, appointment.time) if appointment.time else datetime(appointment.date.year, appointment.date.month, appointment.date.day)
        if existing:
            # Обновляем существующую запись (защита от дублирования)
            existing.anamnesis = prescription.anamnesis if prescription else ""
            existing.diagnosis = prescription.diagnosis if prescription else ""
            existing.medications = prescription.medications if prescription else ""
            existing.recommendations = prescription.recommendations if prescription else ""
            existing.notes = prescription.notes if prescription else ""
            existing.updated_at = datetime.utcnow()
        else:
            history = MedicalHistory(
                pet_id=appointment.pet_id,
                appointment_id=appointment_id,
                visit_date=visit_dt,
                anamnesis=prescription.anamnesis if prescription else "",
                diagnosis=prescription.diagnosis if prescription else "",
                medications=prescription.medications if prescription else "",
                recommendations=prescription.recommendations if prescription else "",
                notes=prescription.notes if prescription else "",
                vet_id=current_user.id,
            )
            db.add(history)
        db.commit()

    # Отправляем письмо клиенту с рецептом
    client = db.query(User).filter(User.id == appointment.client_id).first()
    pet = db.query(Pet).filter(Pet.id == appointment.pet_id).first()
    vet = db.query(User).filter(User.id == appointment.vet_id).first()

    if client and client.email and background_tasks:
        background_tasks.add_task(
            send_appointment_completed,
            client_email=client.email,
            client_name=client.full_name,
            pet_name=pet.name if pet else "—",
            date=str(appointment.date),
            vet_name=vet.full_name if vet else "—",
            anamnesis=prescription.anamnesis if prescription else "",
            diagnosis=prescription.diagnosis if prescription else "",
            medications=prescription.medications if prescription else "",
            recommendations=prescription.recommendations if prescription else "",
            notes=prescription.notes if prescription else "",
        )

    return appointment


@router.put("/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    vet_message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if appointment.client_id != current_user.id and current_user.role not in ["vet", "assistant"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    slot = db.query(Schedule).filter(
        Schedule.vet_id == appointment.vet_id,
        Schedule.date == appointment.date,
        Schedule.time == appointment.time
    ).first()
    if slot:
        slot.status = "free"

    appointment.status = AppointmentStatus.cancelled
    appointment.vet_message = vet_message or "Запись отменена"
    db.commit()
    db.refresh(appointment)

    # Уведомляем клиента если отменяет врач
    if current_user.role in ["vet", "assistant"]:
        client = db.query(User).filter(User.id == appointment.client_id).first()
        pet = db.query(Pet).filter(Pet.id == appointment.pet_id).first()
        if client:
            background_tasks.add_task(
                send_appointment_cancelled,
                client_email=client.email,
                client_name=client.full_name,
                pet_name=pet.name if pet else "питомец",
                date=str(appointment.date),
                time=str(appointment.time)[:5],
                vet_message=appointment.vet_message
            )

    return appointment
