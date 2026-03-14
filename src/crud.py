# src/crud.py
from sqlalchemy.orm import Session
from src import schemas
from src.database import User as DBUser


def create_user(db: Session, user: schemas.UserCreate):
    """
    Crée un utilisateur dans la DB et renvoie un dict compatible avec les tests
    """
    db_user = DBUser(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "name": db_user.name, "email": db_user.email}


def get_user(db: Session, user_id: int):
    """
    Récupère un utilisateur par ID. Retourne None si non trouvé
    """
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if user:
        return {"id": user.id, "name": user.name, "email": user.email}
    return None
