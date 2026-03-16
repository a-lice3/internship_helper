from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db

router = APIRouter(prefix="/users/{user_id}/templates", tags=["cover letter templates"])


@router.post("", response_model=schemas.CoverLetterTemplateResponse)
def create_template(
    user_id: int, tpl: schemas.CoverLetterTemplateCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_template(db, user_id, tpl)


@router.get("", response_model=list[schemas.CoverLetterTemplateResponse])
def list_templates(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_templates(db, user_id)


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    if not crud.delete_template(db, template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"detail": "Template deleted"}
