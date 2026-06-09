# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal
from backend.models.models import (
    User, Pet, Appointment, Vaccination, PetHealthLog,
    Schedule, RoleEnum, AppointmentStatus
)
from backend.services.auth import hash_password
from datetime import date, timedelta, time
import random

db = SessionLocal()

# --- Клиенты ---
clients_data = [
    ('Иванова Мария', 'ivanova@mail.ru', 'ivanova', '+79001234567'),
    ('Петров Алексей', 'petrov_a@mail.ru', 'petrov_a', '+79007654321'),
    ('Сидорова Анна', 'sidorova@mail.ru', 'sidorova', '+79009876543'),
    ('Козлов Дмитрий', 'kozlov@mail.ru', 'kozlov', '+79001112233'),
    ('Смирнова Елена', 'smirnova@mail.ru', 'smirnova', '+79004445566'),
    ('Новиков Игорь', 'novikov@mail.ru', 'novikov', '+79007778899'),
    ('Морозова Ольга', 'morozova@mail.ru', 'morozova', '+79002223344'),
    ('Волков Сергей', 'volkov@mail.ru', 'volkov', '+79005556677'),
    ('Захарова Юлия', 'zaharova@mail.ru', 'zaharova', '+79008889900'),
    ('Попов Андрей', 'popov@mail.ru', 'popov', '+79003334455'),
]

clients = []
for full_name, email, login, phone in clients_data:
    existing = db.query(User).filter(User.login == login).first()
    if not existing:
        u = User(
            full_name=full_name, email=email, login=login,
            phone=phone, role=RoleEnum.client,
            password_hash=hash_password('12345')
        )
        db.add(u)
        db.flush()
        clients.append(u)
    else:
        clients.append(existing)

print(f'Клиентов: {len(clients)}')

# --- Питомцы ---
pets_data = [
    ('Мурка', 'cat', 'Персидская', 'female', 4.2, '2020-03-15'),
    ('Шарик', 'dog', 'Лабрадор', 'male', 28.5, '2019-06-20'),
    ('Барсик', 'cat', 'Британская', 'male', 5.1, '2021-01-10'),
    ('Рекс', 'dog', 'Немецкая овчарка', 'male', 35.0, '2018-11-05'),
    ('Белка', 'rabbit', 'Карликовый', 'female', 1.8, '2022-04-12'),
    ('Пушок', 'cat', 'Мейн-кун', 'male', 7.3, '2020-08-25'),
    ('Тузик', 'dog', 'Такса', 'male', 9.5, '2021-05-18'),
    ('Клёпа', 'cat', 'Сиамская', 'female', 3.8, '2022-02-14'),
    ('Бобик', 'dog', 'Спаниель', 'male', 15.2, '2019-09-30'),
    ('Масяня', 'cat', 'Русская голубая', 'female', 4.0, '2021-12-01'),
    ('Дружок', 'dog', 'Хаски', 'male', 25.0, '2020-07-07'),
    ('Снежок', 'rabbit', 'Ангорский', 'male', 2.1, '2023-01-20'),
    ('Рыжик', 'cat', 'Абиссинская', 'male', 4.5, '2021-06-15'),
    ('Найда', 'dog', 'Бордер-колли', 'female', 18.0, '2020-03-10'),
    ('Кеша', 'bird', 'Попугай', 'male', 0.1, '2022-09-01'),
]

pets = []
for i, (name, species, breed, gender, weight, birth_date) in enumerate(pets_data):
    owner = clients[i % len(clients)]
    existing = db.query(Pet).filter(Pet.name == name, Pet.owner_id == owner.id).first()
    if not existing:
        p = Pet(
            owner_id=owner.id, name=name, species=species,
            breed=breed, gender=gender, weight=weight,
            birth_date=date.fromisoformat(birth_date)
        )
        db.add(p)
        db.flush()
        pets.append(p)
    else:
        pets.append(existing)

print(f'Питомцев: {len(pets)}')

# --- Врачи ---
vets = db.query(User).filter(User.role.in_([RoleEnum.vet, RoleEnum.assistant])).all()
print(f'Врачей: {len(vets)}')

# --- Записи на приём (2025-2026) ---
statuses = [
    AppointmentStatus.completed,
    AppointmentStatus.completed,
    AppointmentStatus.completed,
    AppointmentStatus.completed,
    AppointmentStatus.confirmed,
    AppointmentStatus.cancelled,
]

notes_list = [
    'Плановый осмотр', 'Вакцинация', 'Лечение',
    'Консультация', 'Повторный приём', None
]

count = 0
# Генерируем с января 2025 по текущую дату
start_date = date(2025, 1, 1)
end_date = date.today()
total_days = (end_date - start_date).days

for i in range(200):
    day = start_date + timedelta(days=random.randint(0, total_days))
    if day.weekday() >= 5:
        day = day + timedelta(days=random.randint(1, 2))
    t = time(
        random.choice([8, 9, 10, 11, 12, 13, 15, 16, 17]),
        random.choice([0, 30])
    )
    pet = random.choice(pets)
    vet = random.choice(vets)
    status = random.choice(statuses)

    existing_app = db.query(Appointment).filter(
        Appointment.pet_id == pet.id,
        Appointment.date == day,
        Appointment.time == t
    ).first()
    if existing_app:
        continue

    app = Appointment(
        client_id=pet.owner_id,
        pet_id=pet.id,
        vet_id=vet.id,
        date=day,
        time=t,
        status=status,
        notes=random.choice(notes_list),
        vet_message='Принято' if status == AppointmentStatus.confirmed else None
    )
    db.add(app)

    slot = db.query(Schedule).filter(
        Schedule.vet_id == vet.id,
        Schedule.date == day,
        Schedule.time == t
    ).first()
    if slot:
        if status == AppointmentStatus.completed:
            slot.status = 'done'
        elif status == AppointmentStatus.cancelled:
            slot.status = 'free'
        else:
            slot.status = 'busy'

    count += 1

print(f'Записей на приём: {count}')

# --- Вакцинации ---
vaccine_types = [
    ('Бешенство', 'rabies'),
    ('Чума плотоядных', 'distemper'),
    ('Гепатит', 'hepatitis'),
    ('Парвовироз', 'parvovirus'),
    ('Лептоспироз', 'leptospirosis'),
    ('Комплексная (кошки)', 'feline_combo'),
    ('Лейкемия кошек', 'feline_leukemia'),
    ('Бордетеллёз', 'bordetella'),
]

intervals = {
    'rabies': 365, 'distemper': 365, 'hepatitis': 365,
    'parvovirus': 365, 'leptospirosis': 365,
    'feline_combo': 365, 'feline_leukemia': 365, 'bordetella': 180
}

vac_notes = ['Без реакции', 'Хорошо перенёс', 'Небольшая вялость после', None]

vac_count = 0
for pet in pets:
    num_vacs = random.randint(2, 5)
    used_types = set()
    for _ in range(num_vacs):
        vaccine_name, vaccine_type = random.choice(vaccine_types)
        if vaccine_type in used_types:
            continue
        used_types.add(vaccine_type)

        given = date(2025, 1, 1) + timedelta(days=random.randint(0, 480))
        if given > date.today():
            given = date.today() - timedelta(days=random.randint(1, 30))

        next_due = given + timedelta(days=intervals.get(vaccine_type, 365))
        vet = random.choice(vets)

        v = Vaccination(
            pet_id=pet.id,
            vet_id=vet.id,
            vaccine_name=vaccine_name,
            vaccine_type=vaccine_type,
            batch_number=f'BTH-{random.randint(1000, 9999)}',
            date_given=given,
            next_due_date=next_due,
            notes=random.choice(vac_notes)
        )
        db.add(v)
        vac_count += 1

print(f'Вакцинаций: {vac_count}')

# --- Записи о здоровье ---
health_count = 0
conditions = ['good', 'good', 'good', 'good', 'fair', 'fair', 'poor']
symptom_list = ['Вялость', 'Отказ от еды', 'Кашель', 'Чихание', 'Диарея', None]

for pet in pets:
    num_logs = random.randint(4, 10)
    for j in range(num_logs):
        log_date = date(2025, 1, 1) + timedelta(days=random.randint(0, 480))
        if log_date > date.today():
            log_date = date.today() - timedelta(days=random.randint(0, 10))
        condition = random.choice(conditions)
        h = PetHealthLog(
            pet_id=pet.id,
            recorded_by=random.choice(vets).id,
            date=log_date,
            condition=condition,
            temperature=round(random.uniform(37.5, 39.8), 1),
            weight=round(pet.weight + random.uniform(-1.0, 1.0), 1),
            symptoms=random.choice(symptom_list) if condition != 'good' else None,
            notes=random.choice(['Норма', 'Наблюдение', 'Улучшение', None])
        )
        db.add(h)
        health_count += 1

print(f'Записей о здоровье: {health_count}')

db.commit()
db.close()
print('Готово! Данные успешно сгенерированы.')