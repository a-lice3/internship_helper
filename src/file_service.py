from pathlib import Path

import pdfplumber
from fastapi import UploadFile

from src.config import UPLOAD_DIR


def save_upload(user_id: int, file: UploadFile) -> Path:
    """Save an uploaded file to disk and return its path."""
    user_dir = UPLOAD_DIR / f"users/{user_id}/templates"
    user_dir.mkdir(parents=True, exist_ok=True)

    dest = user_dir / file.filename  # type: ignore[operator]
    with open(dest, "wb") as f:
        f.write(file.file.read())
    return dest


def extract_text_from_pdf(path: Path) -> str:
    """Extract text content from a PDF file."""
    with pdfplumber.open(path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def delete_file(path: str) -> None:
    """Delete a file from disk if it exists."""
    p = Path(path)
    if p.exists():
        p.unlink()
