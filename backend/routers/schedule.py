from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta, time as dt_time
from backend.database import get_db
from backend.models.models import Schedule, User, RoleEnum
from backend.schemas.schemas import ScheduleCreate, ScheduleOut
from backend.services.auth import get_current_user, require_vet

router = APIRouter(prefix="/schedule", tags=["Schedule"])


@router.get("/free", response_model=List[ScheduleOut])
def get_free_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Schedule).filter(
        Schedule.status == "free"
    ).order_by(Schedule.date, Schedule.time).all()


@router.get("/all", response_model=List[ScheduleOut])
def get_all_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Слоты только текущего врача"""
    return db.query(Schedule).filter(
        Schedule.vet_id == current_user.id
    ).order_by(Schedule.date, Schedule.time).all()


@router.post("/generate")
def generate_schedule(
    days_ahead: int = 180,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    morning_slots = []
    t = dt_time(8, 30)
    while t < dt_time(14, 0):
        morning_slots.append(t)
        h, m = t.hour, t.minute + 30
        if m >= 60:
            h, m = h + 1, m - 60
        t = dt_time(h, m)

    afternoon_slots = []
    t = dt_time(15, 0)
    while t < dt_time(18, 0):
        afternoon_slots.append(t)
        h, m = t.hour, t.minute + 30
        if m >= 60:
            h, m = h + 1, m - 60
        t = dt_time(h, m)

    all_times = morning_slots + afternoon_slots
    vets = db.query(User).filter(
        User.role.in_([RoleEnum.vet, RoleEnum.assistant])
    ).all()

    created = 0
    today = date.today()
    for i in range(days_ahead):
        day = today + timedelta(days=i)
        if day.weekday() >= 5:
            continue
        for vet in vets:
            for t in all_times:
                exists = db.query(Schedule).filter(
                    Schedule.vet_id == vet.id,
                    Schedule.date == day,
                    Schedule.time == t
                ).first()
                if not exists:
                    db.add(Schedule(
                        vet_id=vet.id,
                        date=day,
                        time=t,
                        status="free"
                    ))
                    created += 1
    db.commit()
    return {"message": f"Создано слотов: {created}"}


@router.post("/", response_model=ScheduleOut)
def create_slot(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    slot = Schedule(
        vet_id=current_user.id,
        date=data.date,
        time=data.time,
        status="free"
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    slot = db.query(Schedule).filter(Schedule.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    if slot.status == "busy":
        raise HTTPException(status_code=400, detail="Нельзя удалить занятый слот")
    db.delete(slot)
    db.commit()
    return {"message": "Слот удалён"}