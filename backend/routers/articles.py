from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.models import Article, User
from backend.schemas.schemas import ArticleCreate, ArticleOut
from backend.services.auth import get_current_user, require_vet

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.post("/", response_model=ArticleOut)
def create_article(
    data: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Только врач создаёт статью"""
    article = Article(
        title=data.title,
        content=data.content,
        author_id=current_user.id
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("/", response_model=List[ArticleOut])
def get_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Все пользователи читают статьи"""
    return db.query(Article).order_by(Article.created_at.desc()).all()


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить конкретную статью"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("/{article_id}")
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vet)
):
    """Врач удаляет статью"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"message": "Article deleted"}