import uuid
import zipfile
from pathlib import Path

import pdfplumber
from fastapi import UploadFile

from src.config import UPLOAD_DIR

# ---------------------------------------------------------------------------
# Security constants
# ---------------------------------------------------------------------------
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB per file
MAX_ZIP_EXTRACTED_SIZE = 50 * 1024 * 1024  # 50 MB total extracted
MAX_ZIP_FILES = 100  # max files inside a zip


PDF_MAGIC = b"%PDF"
ZIP_MAGIC = b"PK\x03\x04"


def validate_file_magic(content: bytes, expected_type: str) -> None:
    """Check that file content matches expected type via magic bytes."""
    if expected_type == "pdf" and not content[:4].startswith(PDF_MAGIC):
        raise ValueError("File content does not look like a valid PDF")
    if expected_type == "zip" and not content[:4].startswith(ZIP_MAGIC):
        raise ValueError("File content does not look like a valid ZIP")
    # .tex and audio files are not easily validated by magic bytes — skip


def _safe_filename(original: str | None, extension: str | None = None) -> str:
    """Return a UUID-based filename, preserving only the extension."""
    if extension is None and original:
        ext = Path(original).suffix.lower()
    else:
        ext = extension or ""
    return f"{uuid.uuid4().hex}{ext}"


def _read_upload_limited(file: UploadFile) -> bytes:
    """Read upload content and enforce size limit."""
    content = file.file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise ValueError(
            f"File too large ({len(content)} bytes). Maximum is {MAX_UPLOAD_SIZE} bytes."
        )
    return content


def _validate_path_within(path: Path, parent: Path) -> None:
    """Ensure a resolved path is inside the expected parent directory."""
    if not path.resolve().is_relative_to(parent.resolve()):
        raise ValueError("Path traversal detected")


def save_upload(user_id: int, file: UploadFile) -> Path:
    """Save an uploaded file to disk and return its path."""
    user_dir = UPLOAD_DIR / f"users/{user_id}/templates"
    user_dir.mkdir(parents=True, exist_ok=True)

    content = _read_upload_limited(file)
    dest = user_dir / _safe_filename(file.filename)
    _validate_path_within(dest, user_dir)
    with open(dest, "wb") as f:
        f.write(content)
    return dest


def save_cv_upload(user_id: int, file: UploadFile) -> Path:
    """Save an uploaded CV file (PDF or .tex) to disk."""
    user_dir = UPLOAD_DIR / f"users/{user_id}/cvs"
    user_dir.mkdir(parents=True, exist_ok=True)

    content = _read_upload_limited(file)
    dest = user_dir / _safe_filename(file.filename)
    _validate_path_within(dest, user_dir)
    with open(dest, "wb") as f:
        f.write(content)
    return dest


def save_cv_zip_upload(user_id: int, file: UploadFile) -> tuple[Path, Path]:
    """Extract a .zip LaTeX project. Returns (main_tex_path, project_dir)."""
    user_dir = UPLOAD_DIR / f"users/{user_id}/cvs"
    user_dir.mkdir(parents=True, exist_ok=True)

    content = _read_upload_limited(file)
    zip_path = user_dir / _safe_filename(file.filename, ".zip")
    _validate_path_within(zip_path, user_dir)
    with open(zip_path, "wb") as f:
        f.write(content)

    # Create a directory for the extracted project
    stem = zip_path.stem
    project_dir = user_dir / stem
    project_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        # Guard against zip bombs and path traversal
        entries = zf.infolist()
        if len(entries) > MAX_ZIP_FILES:
            zip_path.unlink()
            raise ValueError(
                f"Zip contains too many files ({len(entries)}). Maximum is {MAX_ZIP_FILES}."
            )
        total_size = sum(e.file_size for e in entries)
        if total_size > MAX_ZIP_EXTRACTED_SIZE:
            zip_path.unlink()
            raise ValueError(
                f"Zip extracted size too large ({total_size} bytes). "
                f"Maximum is {MAX_ZIP_EXTRACTED_SIZE} bytes."
            )
        for entry in entries:
            target = (project_dir / entry.filename).resolve()
            if not target.is_relative_to(project_dir.resolve()):
                zip_path.unlink()
                raise ValueError(f"Zip contains path traversal entry: {entry.filename}")
        zf.extractall(project_dir)

    # Remove the zip file after extraction
    zip_path.unlink()

    # Find the main .tex file
    tex_file = _find_main_tex(project_dir)
    if not tex_file:
        raise ValueError("No .tex file found in the zip archive")

    return tex_file, project_dir


def _find_main_tex(project_dir: Path) -> Path | None:
    """Find the main .tex file in an extracted zip project."""
    tex_files = list(project_dir.rglob("*.tex"))
    if not tex_files:
        return None
    if len(tex_files) == 1:
        return tex_files[0]

    # Prefer main.tex or cv.tex or resume.tex
    for preferred in ("main.tex", "cv.tex", "resume.tex"):
        for tf in tex_files:
            if tf.name.lower() == preferred:
                return tf

    # Prefer .tex files that contain \documentclass
    for tf in tex_files:
        try:
            content = tf.read_text(encoding="utf-8", errors="replace")
            if r"\documentclass" in content:
                return tf
        except Exception:
            continue

    # Fallback to first .tex file
    return tex_files[0]


def extract_text_from_pdf(path: Path) -> str:
    """Extract text content from a PDF file."""
    with pdfplumber.open(path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def compile_latex(
    user_id: int,
    cv_id: int,
    latex_content: str,
    support_files_dir: str | None = None,
) -> Path:
    """Compile LaTeX content to PDF. Returns path to generated PDF.

    If support_files_dir is provided, all files from that directory (e.g. .cls,
    .sty, images) are copied into the temp build directory so that the LaTeX
    compiler can find them.
    """
    import shutil
    import subprocess
    import tempfile

    # Find a LaTeX compiler
    compiler = (
        shutil.which("pdflatex") or shutil.which("tectonic") or shutil.which("xelatex")
    )
    if not compiler:
        raise FileNotFoundError("No LaTeX compiler found")

    with tempfile.TemporaryDirectory() as tmpdir:
        # Copy support files first (before writing the .tex)
        if support_files_dir:
            src_dir = Path(support_files_dir)
            if src_dir.is_dir():
                shutil.copytree(src_dir, tmpdir, dirs_exist_ok=True)

        tex_path = Path(tmpdir) / "cv.tex"
        tex_path.write_text(latex_content, encoding="utf-8")

        compiler_name = Path(compiler).name
        if compiler_name == "tectonic":
            cmd = [compiler, str(tex_path)]
        else:
            cmd = [
                compiler,
                "-no-shell-escape",
                "-interaction=nonstopmode",
                "-output-directory",
                tmpdir,
                str(tex_path),
            ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        pdf_in_tmp = Path(tmpdir) / "cv.pdf"
        if not pdf_in_tmp.exists():
            raise RuntimeError(
                result.stderr or result.stdout or "Compilation produced no PDF"
            )

        # Copy to permanent location
        out_dir = UPLOAD_DIR / f"users/{user_id}/cvs"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"cv_{cv_id}.pdf"
        shutil.copy2(pdf_in_tmp, out_path)

    return out_path


def compile_latex_tmp(
    latex_content: str,
    support_files_dir: str | None = None,
) -> int:
    """Compile LaTeX in a temp dir and return the page count of the PDF.

    Raises RuntimeError if compilation fails.
    """
    import shutil
    import subprocess
    import tempfile

    compiler = (
        shutil.which("pdflatex") or shutil.which("tectonic") or shutil.which("xelatex")
    )
    if not compiler:
        raise FileNotFoundError("No LaTeX compiler found")

    with tempfile.TemporaryDirectory() as tmpdir:
        if support_files_dir:
            src_dir = Path(support_files_dir)
            if src_dir.is_dir():
                shutil.copytree(src_dir, tmpdir, dirs_exist_ok=True)

        tex_path = Path(tmpdir) / "cv.tex"
        tex_path.write_text(latex_content, encoding="utf-8")

        compiler_name = Path(compiler).name
        if compiler_name == "tectonic":
            cmd = [compiler, str(tex_path)]
        else:
            cmd = [
                compiler,
                "-no-shell-escape",
                "-interaction=nonstopmode",
                "-output-directory",
                tmpdir,
                str(tex_path),
            ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        pdf_in_tmp = Path(tmpdir) / "cv.pdf"
        if not pdf_in_tmp.exists():
            raise RuntimeError(
                result.stderr or result.stdout or "Compilation produced no PDF"
            )

        with pdfplumber.open(pdf_in_tmp) as pdf:
            return len(pdf.pages)


def delete_file(path: str) -> None:
    """Delete a file from disk if it exists."""
    p = Path(path)
    if p.exists():
        p.unlink()
