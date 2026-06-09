import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models.models import Pet, User
from backend.schemas.schemas import PetOut
from backend.services.auth import get_current_user, require_vet

router = APIRouter(prefix="/pets", tags=["Pets"])

UPLOAD_DIR = "uploads/pets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_photo(photo: UploadFile) -> str:
    """Сохраняет фото и возвращает URL"""
    ext = os.path.splitext(photo.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        ext = '.jpg'
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(photo.file.read())
    return f"/uploads/pets/{filename}"


@router.post("/", response_model=PetOut)
def create_pet(
    name: str = Form(...),
    species: Optional[str] = Form(None),
    breed: Optional[str] = Form(None),
    birth_date: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    weight: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo_url = None
    if photo and photo.filename:
        photo_url = save_photo(photo)

    new_pet = Pet(
        owner_id=current_user.id,
        name=name,
        species=species,
        breed=breed,
        birth_date=birth_date,
        gender=gender,
        weight=weight,
        photo_url=photo_url
    )
    db.add(new_pet)
    db.commit()
    db.refresh(new_pet)
    return new_pet


@router.get("/my", response_model=List[PetOut])
def get_my_pets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Pet).filter(Pet.owner_id == current_user.id).all()


@router.get("/all/list", response_model=List[PetOut])
def get_all_pets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    return db.query(Pet).all()


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant"]:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return pet


@router.put("/{pet_id}", response_model=PetOut)
def update_pet(
    pet_id: int,
    name: str = Form(...),
    species: Optional[str] = Form(None),
    breed: Optional[str] = Form(None),
    birth_date: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    weight: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant"]:
        raise HTTPException(status_code=403, detail="Нет доступа")

    pet.name = name
    pet.species = species
    pet.breed = breed
    pet.birth_date = birth_date
    pet.gender = gender
    pet.weight = weight

    # Обновляем фото только если загружено новое
    if photo and photo.filename:
        # Удаляем старое фото если есть
        if pet.photo_url:
            old_path = pet.photo_url.lstrip('/')
            if os.path.exists(old_path):
                os.remove(old_path)
        pet.photo_url = save_photo(photo)

    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}")
def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from backend.models.models import Appointment, Procedure, WeightHistory
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant"]:
        raise HTTPException(status_code=403, detail="Нет доступа")
    db.query(Appointment).filter(Appointment.pet_id == pet_id).delete()
    db.query(Procedure).filter(Procedure.pet_id == pet_id).delete()
    db.query(WeightHistory).filter(WeightHistory.pet_id == pet_id).delete()
    db.delete(pet)
    db.commit()
    return {"message": "Питомец удалён"}


@router.post("/{pet_id}/delete")
def delete_pet_post(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from backend.models.models import Appointment, Procedure, WeightHistory
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != current_user.id and current_user.role not in ["vet", "assistant"]:
        raise HTTPException(status_code=403, detail="Нет доступа")
    db.query(Appointment).filter(Appointment.pet_id == pet_id).delete()
    db.query(Procedure).filter(Procedure.pet_id == pet_id).delete()
    db.query(WeightHistory).filter(WeightHistory.pet_id == pet_id).delete()
    db.delete(pet)
    db.commit()
    return {"message": "Питомец удалён"}
