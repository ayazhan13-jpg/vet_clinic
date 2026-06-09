# -*- coding: utf-8 -*-
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from backend.database import get_db
from backend.models.models import LabOrder, LabOrderStatus, User, Pet, Procedure
from backend.services.auth import get_current_user, require_vet, require_lab
from backend.services.email_service import send_lab_results_ready, send_lab_results_to_vet

router = APIRouter(prefix="/lab", tags=["Laboratory"])

# ── Счётчик для генерации номера заявки ──────────────────────────────────────
def generate_order_number(db: Session) -> str:
    last = db.query(LabOrder).order_by(LabOrder.id.desc()).first()
    next_id = (last.id + 1) if last else 1
    return f"ЛАБ-{next_id:04d}"


# ── Схемы ─────────────────────────────────────────────────────────────────────
class LabOrderCreate(BaseModel):
    pet_id: int
    services: List[str]          # список названий анализов из прейскуранта
    scheduled_date: Optional[date] = None
    notes: Optional[str] = None

class ResultField(BaseModel):
    value: str
    unit: Optional[str] = ""
    ref: Optional[str] = ""      # референсный диапазон
    flag: Optional[str] = ""     # "H" / "L" / ""

class LabResultsSubmit(BaseModel):
    results: dict                # {service_name: {value, unit, ref, flag}}
    lab_notes: Optional[str] = ""


# ── Вспомогательный serializer ────────────────────────────────────────────────
def order_to_dict(o: LabOrder, db: Session) -> dict:
    pet = db.query(Pet).filter(Pet.id == o.pet_id).first()
    owner = db.query(User).filter(User.id == pet.owner_id).first() if pet else None
    vet  = db.query(User).filter(User.id == o.vet_id).first()
    lab_user = db.query(User).filter(User.id == o.lab_user_id).first() if o.lab_user_id else None
    return {
        "id": o.id,
        "order_number": o.order_number,
        "pet_id": o.pet_id,
        "pet_name": pet.name if pet else "—",
        "pet_species": pet.species if pet else "",
        "owner_name": owner.full_name if owner else "—",
        "owner_email": owner.email if owner else "",
        "vet_id": o.vet_id,
        "vet_name": vet.full_name if vet else "—",
        "lab_user_name": lab_user.full_name if lab_user else None,
        "services": json.loads(o.services) if o.services else [],
        "scheduled_date": str(o.scheduled_date) if o.scheduled_date else None,
        "status": o.status.value if hasattr(o.status, "value") else o.status,
        "results": json.loads(o.results) if o.results else {},
        "notes": o.notes,
        "lab_notes": o.lab_notes,
        "created_at": str(o.created_at),
        "collected_at": str(o.collected_at) if o.collected_at else None,
        "completed_at": str(o.completed_at) if o.completed_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/orders")
def create_order(
    data: LabOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Врач создаёт заявку на анализы"""
    pet = db.query(Pet).filter(Pet.id == data.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")

    order = LabOrder(
        order_number=generate_order_number(db),
        pet_id=data.pet_id,
        vet_id=current_user.id,
        services=json.dumps(data.services, ensure_ascii=False),
        scheduled_date=data.scheduled_date,
        notes=data.notes,
        status=LabOrderStatus.pending,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order_to_dict(order, db)


@router.get("/orders")
def get_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab)
):
    """Список заявок — для лаборанта и врача"""
    q = db.query(LabOrder)
    if status:
        q = q.filter(LabOrder.status == status)
    # Врач видит только свои заявки, лаборант — все
    if current_user.role in ["vet", "assistant"]:
        q = q.filter(LabOrder.vet_id == current_user.id)
    orders = q.order_by(LabOrder.created_at.desc()).all()
    return [order_to_dict(o, db) for o in orders]


@router.get("/orders/pet/{pet_id}")
def get_pet_orders(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Заявки конкретного питомца — для паспорта"""
    orders = db.query(LabOrder).filter(
        LabOrder.pet_id == pet_id
    ).order_by(LabOrder.created_at.desc()).all()
    return [order_to_dict(o, db) for o in orders]


@router.get("/orders/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab)
):
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return order_to_dict(order, db)


@router.put("/orders/{order_id}/collect")
def collect_material(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab)
):
    """Материал забран — статус pending → collected"""
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.status != LabOrderStatus.pending:
        raise HTTPException(status_code=400, detail="Материал уже забран")
    order.status = LabOrderStatus.collected
    order.collected_at = datetime.utcnow()
    order.lab_user_id = current_user.id
    db.commit()
    return order_to_dict(order, db)


@router.put("/orders/{order_id}/results")
async def submit_results(
    order_id: int,
    data: LabResultsSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab)
):
    """Лаборант вносит результаты и утверждает"""
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.status == LabOrderStatus.ready:
        raise HTTPException(status_code=400, detail="Результаты уже утверждены")

    services = json.loads(order.services)
    # Проверяем только что результаты вообще переданы
    if not data.results:
        raise HTTPException(status_code=422, detail="Результаты не заполнены")

    order.results = json.dumps(data.results, ensure_ascii=False)
    order.lab_notes = data.lab_notes
    order.status = LabOrderStatus.ready
    order.completed_at = datetime.utcnow()
    order.lab_user_id = current_user.id
    db.commit()

    # Вшиваем результаты в процедуры питомца (type='lab')
    for svc, res in data.results.items():
        svc_type = res.get("type", "generic")
        if svc_type in ("oak", "biohim"):
            params = res.get("params", {})
            parts = [f"{p}: {v.get('value','')} {v.get('unit','')}" for p, v in params.items() if v.get('value')]
            desc = f"{svc}: " + "; ".join(parts[:5])
        elif svc_type == "knotta":
            desc = f"{svc}: {res.get('value','—')}"
        elif svc_type == "serology":
            items = res.get("items", {})
            parts = [f"{k}: {v}" for k, v in items.items() if v]
            desc = f"{svc}: " + "; ".join(parts)
        elif svc_type == "plt":
            desc = f"{svc}: PLT={res.get('value','—')} 10⁹/л"
        else:
            val = res.get("value", "")
            unit = res.get("unit", "")
            flag = res.get("flag", "")
            desc = f"{svc}: {val} {unit}".strip()
            if flag:
                desc += f" [{flag}]"
        proc = Procedure(
            pet_id=order.pet_id,
            vet_id=order.vet_id,
            type="lab",
            description=desc,
            date=date.today(),
            cost=0
        )
        db.add(proc)
    db.commit()

    # Уведомление клиенту
    pet = db.query(Pet).filter(Pet.id == order.pet_id).first()
    owner = db.query(User).filter(User.id == pet.owner_id).first() if pet else None
    if owner and owner.email:
        background_tasks.add_task(
            send_lab_results_ready,
            client_email=owner.email,
            client_name=owner.full_name,
            pet_name=pet.name,
            order_number=order.order_number,
            services=services,
        )

    # Уведомление врачу
    vet = db.query(User).filter(User.id == order.vet_id).first()
    if vet and vet.email:
        background_tasks.add_task(
            send_lab_results_to_vet,
            vet_email=vet.email,
            vet_name=vet.full_name,
            pet_name=pet.name if pet else "—",
            owner_name=owner.full_name if owner else "—",
            order_number=order.order_number,
            services=services,
            results=data.results,
        )

    return order_to_dict(order, db)


@router.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if order.status != LabOrderStatus.pending:
        raise HTTPException(status_code=400, detail="Нельзя удалить заявку в работе")
    db.delete(order)
    db.commit()
    return {"message": "Заявка удалена"}


@router.get("/notifications/vet")
def get_vet_lab_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Количество готовых анализов которые врач ещё не видел"""
    ready_orders = db.query(LabOrder).filter(
        LabOrder.vet_id == current_user.id,
        LabOrder.status == LabOrderStatus.ready
    ).order_by(LabOrder.completed_at.desc()).all()

    return {
        "count": len(ready_orders),
        "orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "pet_name": db.query(Pet).filter(Pet.id == o.pet_id).first().name if o.pet_id else "—",
                "completed_at": str(o.completed_at) if o.completed_at else None,
            }
            for o in ready_orders[:5]  # последние 5
        ]
    }
