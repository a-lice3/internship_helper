"""Authentication router: register, login, and current user."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.UserRegister, db: Session = Depends(get_db)):
    """Create a new account and return a JWT token."""
    existing = crud.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_create = schemas.UserCreate(
        name=body.name, email=body.email, password=body.password
    )
    hashed = hash_password(body.password)
    user = crud.create_user(db, user_create, hashed_password=hashed)

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            ai_instructions=user.ai_instructions,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email + password and return a JWT token."""
    user = crud.get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            ai_instructions=user.ai_instructions,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user
