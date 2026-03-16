from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db

router = APIRouter(prefix="/users/{user_id}/cvs", tags=["cvs"])


@router.post("", response_model=schemas.CVResponse)
def upload_cv(user_id: int, cv: schemas.CVCreate, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_cv(db, user_id, cv)


@router.get("", response_model=list[schemas.CVResponse])
def list_cvs(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_cvs(db, user_id)
