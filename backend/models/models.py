from sqlalchemy import Column, Integer, String, Float, Date, Time, Text, ForeignKey, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base
import enum
from datetime import datetime


class RoleEnum(str, enum.Enum):
    vet = "vet"
    assistant = "assistant"
    client = "client"
    head = "head"  # Начальник горветстанции
    lab = "lab"    # Ветеринарный врач-лаборант


class AppointmentStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    pending = "pending"


class NotificationStatus(str, enum.Enum):
    sent = "sent"
    pending = "pending"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(RoleEnum), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    login = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    pets = relationship("Pet", back_populates="owner")
    appointments = relationship("Appointment", back_populates="client",
                                foreign_keys="Appointment.client_id")
    notifications = relationship("Notification", back_populates="recipient")
    articles = relationship("Article", back_populates="author")
    sent_messages = relationship("Message", back_populates="sender",
                                 foreign_keys="Message.sender_id")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    species = Column(String(50))
    breed = Column(String(50))
    birth_date = Column(Date)
    gender = Column(String(10))
    weight = Column(Float)
    photo_url = Column(String(255))
    is_archived = Column(Boolean, default=False)
    archive_reason = Column(String(100))
    archive_note = Column(Text)
    archived_at = Column(DateTime)

    owner = relationship("User", back_populates="pets")
    procedures = relationship("Procedure", back_populates="pet")
    appointments = relationship("Appointment", back_populates="pet")
    weight_history = relationship("WeightHistory", back_populates="pet")
    passport = relationship("PetPassport", back_populates="pet", uselist=False)
    vaccinations = relationship("Vaccination", back_populates="pet", order_by="Vaccination.date_given")
    health_logs = relationship("PetHealthLog", back_populates="pet", order_by="PetHealthLog.date")


class WeightHistory(Base):
    __tablename__ = "weight_history"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    weight = Column(Float, nullable=False)
    recorded_at = Column(Date, nullable=False)

    pet = relationship("Pet", back_populates="weight_history")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)

    appointments = relationship("Appointment", back_populates="service")


class Schedule(Base):
    __tablename__ = "schedule"

    id = Column(Integer, primary_key=True, index=True)
    vet_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String(20), default="free")

    vet = relationship("User")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    vet_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"))
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    notes = Column(Text)
    vet_message = Column(Text)

    client = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    vet = relationship("User", foreign_keys=[vet_id])
    pet = relationship("Pet", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    messages = relationship("Message", back_populates="appointment",
                            order_by="Message.created_at")


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    vet_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50))
    drug_name = Column(String(200))
    manufacturer = Column(String(200))
    description = Column(Text)
    date = Column(Date, nullable=False)
    cost = Column(Float)
    is_confirmed = Column(Boolean, default=True)

    pet = relationship("Pet", back_populates="procedures")
    vet = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50))
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.pending)

    recipient = relationship("User", back_populates="notifications")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="articles")


class PetPassport(Base):
    __tablename__ = "pet_passports"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False, unique=True)
    microchip_number = Column(String(50))
    passport_number = Column(String(50))
    passport_photo_url = Column(String(255))
    blood_type = Column(String(10))
    allergies = Column(Text)
    chronic_diseases = Column(Text)
    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Новые поля паспорта
    coat_color = Column(String(100))
    special_marks = Column(Text)
    reproduction = Column(String(50))
    chip_location = Column(String(100))
    chip_date = Column(Date)
    tattoo_number = Column(String(50))
    tattoo_date = Column(Date)
    owner_address = Column(String(255))
    owner_city = Column(String(100))
    owner_zip = Column(String(20))
    issue_date = Column(Date)
    felv_status = Column(String(20))
    fiv_status = Column(String(20))
    # JSON поля для сложных данных
    clinical_exams = Column(Text, default="[]")
    rabies_titers = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pet = relationship("Pet", back_populates="passport")


class Vaccination(Base):
    __tablename__ = "vaccinations"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    vet_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vaccine_name = Column(String(100), nullable=False)
    vaccine_type = Column(String(50))
    batch_number = Column(String(50))
    manufacturer = Column(String(200))
    manufacture_date = Column(Date)
    expiry_date = Column(Date)
    date_given = Column(Date, nullable=False)
    next_due_date = Column(Date)
    photo_url = Column(String(255))
    notes = Column(Text)
    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    pet = relationship("Pet", back_populates="vaccinations")
    vet = relationship("User", foreign_keys=[vet_id])


class PetHealthLog(Base):
    __tablename__ = "pet_health_logs"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    condition = Column(String(20), default="good")
    temperature = Column(Float)
    weight = Column(Float)
    symptoms = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    pet = relationship("Pet", back_populates="health_logs")
    recorder = relationship("User")


# --- Чат ---

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages",
                          foreign_keys=[sender_id])


class MedicalHistory(Base):
    """История болезней — автоматически создаётся при завершении приёма"""
    __tablename__ = "medical_history"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, unique=True)
    visit_date = Column(DateTime, nullable=False)
    anamnesis = Column(Text)
    diagnosis = Column(Text)
    medications = Column(Text)
    recommendations = Column(Text)
    notes = Column(Text)
    vet_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pet = relationship("Pet")
    vet = relationship("User", foreign_keys=[vet_id])
    appointment = relationship("Appointment")


class LabOrderStatus(str, enum.Enum):
    pending   = "pending"    # Ожидает забора материала
    collected = "collected"  # Материал забран / В работе
    ready     = "ready"      # Результаты готовы


class LabOrder(Base):
    """Заявка на лабораторный анализ"""
    __tablename__ = "lab_orders"

    id           = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, nullable=False)  # напр. "ЛАБ-1024"
    pet_id       = Column(Integer, ForeignKey("pets.id"), nullable=False)
    vet_id       = Column(Integer, ForeignKey("users.id"), nullable=False)   # назначил
    lab_user_id  = Column(Integer, ForeignKey("users.id"), nullable=True)    # выполнил
    services     = Column(Text, nullable=False)   # JSON-список названий анализов
    scheduled_date = Column(Date, nullable=True)  # запланированная дата забора
    status       = Column(Enum(LabOrderStatus), default=LabOrderStatus.pending)
    results      = Column(Text, nullable=True)    # JSON: {service: {value, unit, ref, flag}}
    notes        = Column(Text, nullable=True)    # примечания врача
    lab_notes    = Column(Text, nullable=True)    # примечания лаборанта
    created_at   = Column(DateTime, default=datetime.utcnow)
    collected_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    pet      = relationship("Pet")
    vet      = relationship("User", foreign_keys=[vet_id])
    lab_user = relationship("User", foreign_keys=[lab_user_id])
