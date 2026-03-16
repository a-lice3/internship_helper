from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db

router = APIRouter(prefix="/users/{user_id}/offers", tags=["offers"])


@router.post("", response_model=schemas.InternshipOfferResponse)
def create_offer(
    user_id: int, offer: schemas.InternshipOfferCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_offer(db, user_id, offer)


@router.get("", response_model=list[schemas.InternshipOfferResponse])
def list_offers(
    user_id: int,
    status: str | None = Query(
        None,
        description="Filter by status: applied, screened, interview, rejected, accepted",
    ),
    db: Session = Depends(get_db),
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_offers(db, user_id, status=status)


@router.get("/{offer_id}", response_model=schemas.InternshipOfferResponse)
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.patch("/{offer_id}", response_model=schemas.InternshipOfferResponse)
def update_offer(
    offer_id: int, update: schemas.InternshipOfferUpdate, db: Session = Depends(get_db)
):
    offer = crud.update_offer(db, offer_id, update)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer
