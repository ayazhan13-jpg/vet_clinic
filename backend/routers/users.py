from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.models import User, RoleEnum
from backend.schemas.schemas import UserOut
from backend.services.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/vets", response_model=List[UserOut])
def get_vets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Список всех врачей и ассистентов"""
    return db.query(User).filter(
        User.role.in_([RoleEnum.vet, RoleEnum.assistant, RoleEnum.head])
    ).all()

@router.get("/clients", response_model=List[UserOut])
def get_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Список всех клиентов"""
    return db.query(User).filter(
        User.role == RoleEnum.client
    ).all()