from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, time, datetime
from backend.models.models import RoleEnum, AppointmentStatus, NotificationStatus


# --- Пользователи ---

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    login: str
    password: str
    role: RoleEnum = RoleEnum.client

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    login: str
    role: RoleEnum

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    login: str
    password: str


# --- Токен ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    login: Optional[str] = None
    role: Optional[str] = None


# --- Питомцы ---

class PetCreate(BaseModel):
    name: str
    species: Optional[str] = None
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    photo_url: Optional[str] = None

class PetOut(BaseModel):
    id: int
    owner_id: int
    name: str
    species: Optional[str]
    breed: Optional[str]
    birth_date: Optional[date]
    gender: Optional[str]
    weight: Optional[float]
    photo_url: Optional[str]

    class Config:
        from_attributes = True


# --- История веса ---

class WeightHistoryCreate(BaseModel):
    weight: float
    recorded_at: date

class WeightHistoryOut(BaseModel):
    id: int
    pet_id: int
    weight: float
    recorded_at: date

    class Config:
        from_attributes = True


# --- Услуги ---

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class ServiceOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float

    class Config:
        from_attributes = True


# --- Расписание ---

class ScheduleCreate(BaseModel):
    vet_id: Optional[int] = None
    date: date
    time: time
    status: Optional[str] = "free"

class ScheduleOut(BaseModel):
    id: int
    vet_id: int
    date: date
    time: time
    status: str

    class Config:
        from_attributes = True


# --- Записи на приём ---

class AppointmentCreate(BaseModel):
    pet_id: int
    vet_id: int
    service_id: Optional[int] = None
    date: date
    time: time
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    client_id: int
    pet_id: int
    vet_id: int
    service_id: Optional[int]
    date: date
    time: time
    status: AppointmentStatus
    notes: Optional[str]
    vet_message: Optional[str]

    class Config:
        from_attributes = True


# --- Процедуры ---

class ProcedureCreate(BaseModel):
    pet_id: int
    type: Optional[str] = None
    description: Optional[str] = None
    date: date
    cost: Optional[float] = None

class ProcedureOut(BaseModel):
    id: int
    pet_id: int
    vet_id: int
    type: Optional[str]
    description: Optional[str]
    date: date
    cost: Optional[float]

    class Config:
        from_attributes = True


# --- Уведомления ---

class NotificationOut(BaseModel):
    id: int
    recipient_id: int
    type: Optional[str]
    message: str
    created_at: datetime
    status: NotificationStatus

    class Config:
        from_attributes = True


# --- Статьи ---

class ArticleCreate(BaseModel):
    title: str
    content: str

class ArticleOut(BaseModel):
    id: int
    title: str
    content: str
    author_id: Optional[int]
    created_at: datetime



    class Config:
        from_attributes = True