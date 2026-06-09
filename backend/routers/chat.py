from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from backend.database import get_db
from backend.models.models import Message, Appointment, User
from backend.services.auth import get_current_user
from backend.services.email_service import send_new_message_notification

router = APIRouter(prefix="/chat", tags=["Chat"])


class MessageCreate(BaseModel):
    text: str


class MessageOut(BaseModel):
    id: int
    appointment_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    text: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


def check_access(appointment: Appointment, current_user: User):
    if (appointment.client_id != current_user.id and
            appointment.vet_id != current_user.id and
            current_user.role not in ["vet", "assistant"]):
        raise HTTPException(status_code=403, detail="Нет доступа к этому чату")


@router.get("/appointment/{appointment_id}", response_model=List[MessageOut])
def get_messages(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Приём не найден")
    check_access(appointment, current_user)

    messages = db.query(Message).filter(
        Message.appointment_id == appointment_id
    ).order_by(Message.created_at.asc()).all()

    for msg in messages:
        if msg.sender_id != current_user.id and not msg.is_read:
            msg.is_read = True
    db.commit()

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append(MessageOut(
            id=msg.id,
            appointment_id=msg.appointment_id,
            sender_id=msg.sender_id,
            sender_name=sender.full_name if sender else "Неизвестно",
            sender_role=sender.role.value if sender else "client",
            text=msg.text,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))
    return result


@router.post("/appointment/{appointment_id}", response_model=MessageOut)
async def send_message(
    appointment_id: int,
    data: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Приём не найден")
    check_access(appointment, current_user)

    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")

    msg = Message(
        appointment_id=appointment_id,
        sender_id=current_user.id,
        text=data.text.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Определяем получателя и отправляем email если у него нет открытого чата
    if current_user.id == appointment.client_id:
        recipient_id = appointment.vet_id
    else:
        recipient_id = appointment.client_id

    recipient = db.query(User).filter(User.id == recipient_id).first()
    if recipient:
        background_tasks.add_task(
            send_new_message_notification,
            recipient_email=recipient.email,
            recipient_name=recipient.full_name,
            sender_name=current_user.full_name,
            message_preview=data.text.strip(),
            appointment_date=f"{appointment.date} в {str(appointment.time)[:5]}"
        )

    return MessageOut(
        id=msg.id,
        appointment_id=msg.appointment_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        sender_role=current_user.role.value,
        text=msg.text,
        is_read=msg.is_read,
        created_at=msg.created_at,
    )


@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["vet", "assistant"]:
        appointments = db.query(Appointment).filter(
            Appointment.vet_id == current_user.id
        ).all()
    else:
        appointments = db.query(Appointment).filter(
            Appointment.client_id == current_user.id
        ).all()

    appointment_ids = [a.id for a in appointments]
    if not appointment_ids:
        return {"unread": 0}

    unread = db.query(Message).filter(
        Message.appointment_id.in_(appointment_ids),
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).count()

    return {"unread": unread}


@router.get("/dialogs")
def get_dialogs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["vet", "assistant"]:
        appointments = db.query(Appointment).filter(
            Appointment.vet_id == current_user.id
        ).all()
    else:
        appointments = db.query(Appointment).filter(
            Appointment.client_id == current_user.id
        ).all()

    result = []
    for app in appointments:
        messages = db.query(Message).filter(
            Message.appointment_id == app.id
        ).order_by(Message.created_at.desc()).all()

        if not messages:
            continue

        last_msg = messages[0]
        unread = sum(
            1 for m in messages
            if m.sender_id != current_user.id and not m.is_read
        )

        if current_user.role in ["vet", "assistant"]:
            other = db.query(User).filter(User.id == app.client_id).first()
        else:
            other = db.query(User).filter(User.id == app.vet_id).first()

        result.append({
            "appointment_id": app.id,
            "appointment_date": str(app.date),
            "appointment_time": str(app.time)[:5],
            "appointment_status": app.status.value if hasattr(app.status, 'value') else app.status,
            "other_user_name": other.full_name if other else "Неизвестно",
            "last_message": last_msg.text,
            "last_message_time": last_msg.created_at.strftime("%d.%m %H:%M"),
            "unread": unread,
        })

    result.sort(key=lambda x: x["last_message_time"], reverse=True)
    return result
