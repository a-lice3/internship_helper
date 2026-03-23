from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/cvs", tags=["cvs"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("", response_model=schemas.CVResponse)
def upload_cv(
    user_id: int,
    cv: schemas.CVCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_cv(db, user_id, cv)


@router.post("/upload", response_model=schemas.CVResponse)
def upload_cv_file(
    user_id: int,
    file: UploadFile,
    name: str = Form("Untitled CV"),
    company: str = Form(""),
    job_title: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF, LaTeX (.tex), or .zip (LaTeX project) file as a CV."""
    _verify_owner(user_id, current_user)

    filename = file.filename or ""
    is_pdf = filename.lower().endswith(".pdf")
    is_latex = filename.lower().endswith(".tex")
    is_zip = filename.lower().endswith(".zip")

    if not is_pdf and not is_latex and not is_zip:
        raise HTTPException(
            status_code=400,
            detail="Only .pdf, .tex, and .zip files are accepted",
        )

    from src.file_service import (
        save_cv_upload,
        save_cv_zip_upload,
        extract_text_from_pdf,
        validate_file_magic,
    )

    # Read content once for validation
    raw = file.file.read()
    try:
        if is_pdf:
            validate_file_magic(raw, "pdf")
        elif is_zip:
            validate_file_magic(raw, "zip")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Reset file cursor so save functions can read it
    file.file.seek(0)

    content = ""
    latex_content = None
    file_path = ""
    support_files_dir = None

    if is_zip:
        try:
            tex_path, project_dir = save_cv_zip_upload(user_id, file)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        latex_content = tex_path.read_text(encoding="utf-8", errors="replace")
        content = latex_content
        file_path = str(tex_path)
        support_files_dir = str(project_dir)
    elif is_pdf:
        path = save_cv_upload(user_id, file)
        content = extract_text_from_pdf(path)
        if not content.strip():
            content = "(PDF uploaded — text extraction unavailable)"
        file_path = str(path)
    elif is_latex:
        path = save_cv_upload(user_id, file)
        latex_content = path.read_text(encoding="utf-8", errors="replace")
        content = latex_content
        file_path = str(path)

    return crud.create_cv_from_file(
        db,
        user_id,
        name=name or filename,
        content=content,
        latex_content=latex_content,
        file_path=file_path,
        support_files_dir=support_files_dir,
        company=company or None,
        job_title=job_title or None,
    )


@router.get("", response_model=list[schemas.CVResponse])
def list_cvs(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_cvs(db, user_id)


@router.get("/{cv_id}/download")
def download_cv(
    user_id: int,
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the original uploaded file for a CV."""
    _verify_owner(user_id, current_user)
    cv = crud.get_cv(db, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    if not cv.file_path:
        raise HTTPException(status_code=404, detail="No file associated with this CV")

    from pathlib import Path

    p = Path(cv.file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(p),
        filename=p.name,
        media_type="application/octet-stream",
    )


@router.post("/{cv_id}/compile-pdf")
def compile_latex_to_pdf(
    user_id: int,
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compile a LaTeX CV to PDF and return the file."""
    _verify_owner(user_id, current_user)
    cv = crud.get_cv(db, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    if not cv.latex_content:
        raise HTTPException(
            status_code=400, detail="This CV has no LaTeX content to compile"
        )

    from src.file_service import compile_latex

    try:
        pdf_path = compile_latex(
            user_id, cv_id, cv.latex_content, support_files_dir=cv.support_files_dir
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="No LaTeX compiler found. Install pdflatex or tectonic to compile.",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=f"LaTeX compilation failed: {e}")

    return FileResponse(
        path=str(pdf_path),
        filename=f"{cv.name}.pdf",
        media_type="application/pdf",
    )


@router.patch("/{cv_id}", response_model=schemas.CVResponse)
def update_cv(
    user_id: int,
    cv_id: int,
    body: schemas.CVUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    cv = crud.update_cv(db, cv_id, body)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.post("/{cv_id}/chat-edit", response_model=schemas.ChatEditCVResponse)
async def chat_edit_cv_endpoint(
    user_id: int,
    cv_id: int,
    body: schemas.ChatEditCVRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a chat instruction to edit a LaTeX CV."""
    _verify_owner(user_id, current_user)

    cv = crud.get_cv(db, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    if not cv.latex_content:
        raise HTTPException(status_code=400, detail="This CV has no LaTeX source")

    # Read support files for context
    support_files_content = ""
    if cv.support_files_dir:
        from pathlib import Path

        support_dir = Path(cv.support_files_dir)
        if support_dir.is_dir():
            parts: list[str] = []
            for ext in ("*.cls", "*.sty"):
                for f in support_dir.rglob(ext):
                    try:
                        content = f.read_text(encoding="utf-8", errors="replace")
                        parts.append(f"% --- {f.name} ---\n{content}")
                    except Exception:
                        continue
            support_files_content = "\n\n".join(parts)

    from src.llm_service import chat_edit_cv_async

    updated_latex = await chat_edit_cv_async(
        latex_content=cv.latex_content,
        user_message=body.message,
        conversation_history=body.conversation_history,
        support_files_content=support_files_content,
        user_instructions=current_user.ai_instructions,
    )

    # Persist the change
    crud.update_cv(db, cv_id, schemas.CVUpdate(latex_content=updated_latex))

    return schemas.ChatEditCVResponse(updated_latex=updated_latex)


@router.post("/{cv_id}/toggle-default", response_model=schemas.CVResponse)
def toggle_default_cv(
    user_id: int,
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a CV as the default. Only one CV can be default at a time."""
    _verify_owner(user_id, current_user)
    cv = crud.set_default_cv(db, user_id, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.delete("/{cv_id}")
def delete_cv(
    user_id: int,
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_cv(db, cv_id):
        raise HTTPException(status_code=404, detail="CV not found")
    return {"detail": "CV deleted"}
