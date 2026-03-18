from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/by-email/{email}", response_model=schemas.UserResponse)
def get_user_by_email(
    email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a user by email. Only the authenticated user can look up their own email."""
    if current_user.email != email:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a user by ID. Only the authenticated user can access their own data."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user
