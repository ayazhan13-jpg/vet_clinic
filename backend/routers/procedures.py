from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.models import Procedure, WeightHistory, User
from backend.schemas.schemas import ProcedureCreate, ProcedureOut, WeightHistoryCreate, WeightHistoryOut
from backend.services.auth import get_current_user, require_vet

router = APIRouter(prefix="/procedures", tags=["Procedures"])


@router.post("/", response_model=ProcedureOut)
def create_procedure(
    data: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Только врач добавляет процедуру"""
    procedure = Procedure(
        pet_id=data.pet_id,
        vet_id=current_user.id,
        type=data.type,
        description=data.description,
        date=data.date,
        cost=data.cost
    )
    db.add(procedure)
    db.commit()
    db.refresh(procedure)
    return procedure


@router.get("/pet/{pet_id}", response_model=List[ProcedureOut])
def get_pet_procedures(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """История процедур питомца"""
    return db.query(Procedure).filter(Procedure.pet_id == pet_id).all()


@router.post("/weight/{pet_id}", response_model=WeightHistoryOut)
def add_weight(
    pet_id: int,
    data: WeightHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Врач добавляет запись веса питомца"""
    record = WeightHistory(
        pet_id=pet_id,
        weight=data.weight,
        recorded_at=data.recorded_at
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/weight/{pet_id}", response_model=List[WeightHistoryOut])
def get_weight_history(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """График динамики веса питомца"""
    return db.query(WeightHistory).filter(
        WeightHistory.pet_id == pet_id
    ).order_by(WeightHistory.recorded_at).all()