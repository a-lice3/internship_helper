from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db
from src.file_service import extract_text_from_pdf, save_upload

router = APIRouter(prefix="/users/{user_id}/templates", tags=["cover letter templates"])


@router.post("", response_model=schemas.CoverLetterTemplateResponse)
def create_template(
    user_id: int, tpl: schemas.CoverLetterTemplateCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_template(db, user_id, tpl)


@router.post("/upload", response_model=schemas.CoverLetterTemplateResponse)
def upload_template_pdf(
    user_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    name: str | None = None,
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    path = save_upload(user_id, file)
    content = extract_text_from_pdf(path)

    if not content.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    template_name = name or file.filename.rsplit(".", 1)[0]
    return crud.create_template_from_pdf(db, user_id, template_name, content, str(path))


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
