from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from backend.database import get_db
from backend.models.models import Appointment, Schedule, User, Pet, AppointmentStatus
from backend.schemas.schemas import AppointmentCreate, AppointmentOut
from backend.services.auth import get_current_user, require_vet
from backend.services.email_service import (
    send_appointment_created,
    send_appointment_confirmed,
    send_appointment_cancelled,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post("/", response_model=AppointmentOut)
async def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Если врач создаёт запись для клиента — используем client_id из данных
    is_vet = current_user.role.value in ["vet", "assistant", "head"]
    actual_client_id = data.client_id if (is_vet and data.client_id) else current_user.id

    existing = db.query(Appointment).filter(
        Appointment.client_id == actual_client_id,
        Appointment.date == data.date,
        Appointment.time == data.time,
        Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Уже есть запись на это время")

    # Для записей от врача слот может не существовать (создаётся автоматически)
    slot = db.query(Schedule).filter(
        Schedule.vet_id == data.vet_id,
        Schedule.date == data.date,
        Schedule.time == data.time,
    ).first()
    if slot and slot.status == "free":
        slot.status = "busy"
    elif not slot and not is_vet:
        raise HTTPException(status_code=400, detail="Этот слот уже занят")

    appointment = Appointment(
        client_id=actual_client_id,
        pet_id=data.pet_id,
        vet_id=data.vet_id,
        service_id=data.service_id,
        date=data.date,
        time=data.time,
        status=AppointmentStatus.confirmed if is_vet else AppointmentStatus.pending,
        notes=data.notes
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Уведомление клиенту
    client = db.query(User).filter(User.id == actual_client_id).first()
    pet = db.query(Pet).filter(Pet.id == data.pet_id).first()
    vet = db.query(User).filter(User.id == data.vet_id).first()
    if client:
        background_tasks.add_task(
            send_appointment_created,
            client_email=client.email,
            client_name=client.full_name,
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
def complete_appointment(
    appointment_id: int,
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

    appointment.status = AppointmentStatus.completed
    db.commit()
    db.refresh(appointment)
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
