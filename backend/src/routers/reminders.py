from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/reminders", tags=["reminders"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("", response_model=schemas.ReminderResponse)
def create_reminder(
    user_id: int,
    reminder: schemas.ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_reminder(db, user_id, reminder)


@router.get("", response_model=list[schemas.ReminderResponse])
def list_reminders(
    user_id: int,
    include_done: bool = Query(False, description="Include completed reminders"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_reminders(db, user_id, include_done=include_done)


@router.get("/{reminder_id}", response_model=schemas.ReminderResponse)
def get_reminder(
    user_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    reminder = crud.get_reminder(db, reminder_id)
    if not reminder or reminder.user_id != user_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.patch("/{reminder_id}", response_model=schemas.ReminderResponse)
def update_reminder(
    user_id: int,
    reminder_id: int,
    update: schemas.ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    existing = crud.get_reminder(db, reminder_id)
    if not existing or existing.user_id != user_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder = crud.update_reminder(db, reminder_id, update)
    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(
    user_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    existing = crud.get_reminder(db, reminder_id)
    if not existing or existing.user_id != user_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    crud.delete_reminder(db, reminder_id)
    return {"detail": "Reminder deleted"}
