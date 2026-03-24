from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.file_service import extract_text_from_pdf, save_upload, validate_file_magic
from src.models import User

router = APIRouter(prefix="/users/{user_id}/templates", tags=["cover letter templates"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("", response_model=schemas.CoverLetterTemplateResponse)
def create_template(
    user_id: int,
    tpl: schemas.CoverLetterTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_template(db, user_id, tpl)


@router.post("/upload", response_model=schemas.CoverLetterTemplateResponse)
def upload_template_pdf(
    user_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    name: str | None = None,
):
    _verify_owner(user_id, current_user)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    raw = file.file.read()
    try:
        validate_file_magic(raw, "pdf")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    file.file.seek(0)

    path = save_upload(user_id, file)
    content = extract_text_from_pdf(path)

    if not content.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    template_name = name or file.filename.rsplit(".", 1)[0]
    return crud.create_template_from_pdf(db, user_id, template_name, content, str(path))


@router.get(
    "", response_model=schemas.PaginatedResponse[schemas.CoverLetterTemplateResponse]
)
def list_templates(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    total = crud.count_templates(db, user_id)
    items = crud.get_templates(db, user_id, skip=offset, limit=limit)
    return schemas.PaginatedResponse(
        items=items, total=total, limit=limit, offset=offset
    )


@router.delete("/{template_id}")
def delete_template(
    user_id: int,
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_template(db, template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"detail": "Template deleted"}
