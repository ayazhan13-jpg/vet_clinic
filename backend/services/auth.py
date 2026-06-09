from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.models import User
from backend.schemas.schemas import TokenData
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        login: str = payload.get("sub")
        role: str = payload.get("role")
        if login is None:
            raise credentials_exception
        token_data = TokenData(login=login, role=role)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.login == token_data.login).first()
    if user is None:
        raise credentials_exception
    return user


def require_vet(current_user: User = Depends(get_current_user)) -> User:
    """Врачи, ассистенты и начальник"""
    if current_user.role not in ["vet", "assistant", "head"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access only for clinic personal"
        )
    return current_user


def require_head(current_user: User = Depends(get_current_user)) -> User:
    """Только начальник горветстанции"""
    if current_user.role != "head":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для начальника ГВС"
        )
    return current_user


def require_lab(current_user: User = Depends(get_current_user)) -> User:
    """Лаборант"""
    if current_user.role not in ["lab", "vet", "assistant", "head"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для лаборатории"
        )
    return current_user


def require_client(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access only for personal clients"
        )
    return current_user
