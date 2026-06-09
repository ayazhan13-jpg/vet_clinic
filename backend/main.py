# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database import engine, Base, SessionLocal
from backend.models.models import *
from backend.routers.auth import router as auth_router
from backend.routers.pets import router as pets_router
from backend.routers.appointments import router as appointments_router
from backend.routers.procedures import router as procedures_router
from backend.routers.articles import router as articles_router
from backend.routers.schedule import router as schedule_router
from backend.routers.users import router as users_router
from backend.routers.passport import router as passport_router
from backend.routers.reports import router as reports_router
from backend.routers.chat import router as chat_router
from backend.routers.lab import router as lab_router
from datetime import date, timedelta, time as dt_time
import os
import asyncio

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)


def auto_generate_schedule():
    db = SessionLocal()
    try:
        morning = []
        t = dt_time(8, 30)
        while t < dt_time(14, 0):
            morning.append(t)
            h, m = t.hour, t.minute + 30
            if m >= 60: h, m = h + 1, m - 60
            t = dt_time(h, m)
        afternoon = []
        t = dt_time(15, 0)
        while t < dt_time(18, 0):
            afternoon.append(t)
            h, m = t.hour, t.minute + 30
            if m >= 60: h, m = h + 1, m - 60
            t = dt_time(h, m)
        all_times = morning + afternoon
        vets = db.query(User).filter(
            User.role.in_([RoleEnum.vet, RoleEnum.assistant])
        ).all()
        today = date.today()
        created = 0
        for i in range(180):
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
                        db.add(Schedule(vet_id=vet.id, date=day, time=t, status="free"))
                        created += 1
        db.commit()
        print(f"Автогенерация: создано {created} слотов")
    finally:
        db.close()


async def send_vaccination_reminders():
    """Отправляем напоминания о прививках которые через 7 или 30 дней"""
    from backend.services.email_service import send_vaccination_reminder
    db = SessionLocal()
    try:
        today = date.today()
        remind_days = [7, 30]
        sent = 0

        for days in remind_days:
            target_date = today + timedelta(days=days)
            vaccinations = db.query(Vaccination).filter(
                Vaccination.next_due_date == target_date,
                Vaccination.is_confirmed == True
            ).all()

            for vac in vaccinations:
                pet = db.query(Pet).filter(Pet.id == vac.pet_id).first()
                if not pet:
                    continue
                owner = db.query(User).filter(User.id == pet.owner_id).first()
                if not owner:
                    continue

                await send_vaccination_reminder(
                    client_email=owner.email,
                    client_name=owner.full_name,
                    pet_name=pet.name,
                    vaccine_name=vac.vaccine_name,
                    due_date=str(vac.next_due_date),
                    days_left=days
                )
                sent += 1

        print(f"Напоминания о прививках: отправлено {sent}")
    finally:
        db.close()


app = FastAPI(title="Vet Clinic AIS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://172.20.10.2:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(pets_router)
app.include_router(appointments_router)
app.include_router(procedures_router)
app.include_router(articles_router)
app.include_router(schedule_router)
app.include_router(users_router)
app.include_router(passport_router)
app.include_router(reports_router)
app.include_router(chat_router)
app.include_router(lab_router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup_event():
    auto_generate_schedule()
    await send_vaccination_reminders()


@app.get("/")
def root():
    return {"message": "System is running!"}
