# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.models import User
from backend.services.auth import (
    verify_password, create_access_token,
    get_current_user, hash_password
)
from backend.schemas.schemas import UserCreate, UserOut, Token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.login == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.login, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserOut)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.login == user_data.login) | (User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким логином или email уже существует"
        )
    user = User(
        login=user_data.login,
        email=user_data.email,
        phone=user_data.phone,
        full_name=user_data.full_name,
        role="client",
        password_hash=hash_password(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
