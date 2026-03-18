import os
from pathlib import Path

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://alicepare@localhost:5432/career_db"
)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
