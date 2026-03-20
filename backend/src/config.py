import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

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

# France Travail API
FRANCE_TRAVAIL_CLIENT_ID = os.getenv("FRANCE_TRAVAIL_CLIENT_ID", "")
FRANCE_TRAVAIL_CLIENT_SECRET = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET", "")

# WTTJ / Algolia
ALGOLIA_APP_ID = os.getenv("ALGOLIA_APP_ID", "")
ALGOLIA_API_KEY = os.getenv("ALGOLIA_API_KEY", "")

# JWT settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not JWT_SECRET_KEY and not TESTING:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is required. "
        "Set it before starting the application."
    )
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
