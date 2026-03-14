import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://alicepare@localhost:5432/career_db"
)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
