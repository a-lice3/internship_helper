import os
from pathlib import Path

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://alicepare@localhost:5432/career_db"
)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
TESTING = os.getenv("TESTING", "").lower() in ("1", "true", "yes")

if not MISTRAL_API_KEY and not TESTING:
    raise RuntimeError(
        "MISTRAL_API_KEY environment variable is required. "
        "Set it before starting the application."
    )

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
