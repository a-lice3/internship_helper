from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/offers/{offer_id}/notes", tags=["notes"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _verify_offer(db: Session, user_id: int, offer_id: int) -> None:
    offer = crud.get_offer(db, offer_id)
    if not offer or offer.user_id != user_id:
        raise HTTPException(status_code=404, detail="Offer not found")


@router.post("", response_model=schemas.OfferNoteResponse)
def create_note(
    user_id: int,
    offer_id: int,
    note: schemas.OfferNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    _verify_offer(db, user_id, offer_id)
    return crud.create_offer_note(db, user_id, offer_id, note)


@router.get("", response_model=list[schemas.OfferNoteResponse])
def list_notes(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    _verify_offer(db, user_id, offer_id)
    return crud.get_offer_notes(db, offer_id)


@router.patch("/{note_id}", response_model=schemas.OfferNoteResponse)
def update_note(
    user_id: int,
    offer_id: int,
    note_id: int,
    update: schemas.OfferNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    _verify_offer(db, user_id, offer_id)
    existing = crud.get_offer_note(db, note_id)
    if not existing or existing.offer_id != offer_id:
        raise HTTPException(status_code=404, detail="Note not found")
    return crud.update_offer_note(db, note_id, update)


@router.delete("/{note_id}")
def delete_note(
    user_id: int,
    offer_id: int,
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    _verify_offer(db, user_id, offer_id)
    existing = crud.get_offer_note(db, note_id)
    if not existing or existing.offer_id != offer_id:
        raise HTTPException(status_code=404, detail="Note not found")
    crud.delete_offer_note(db, note_id)
    return {"detail": "Note deleted"}
