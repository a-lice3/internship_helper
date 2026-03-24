from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/offers", tags=["offers"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("", response_model=schemas.InternshipOfferResponse)
def create_offer(
    user_id: int,
    offer: schemas.InternshipOfferCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_offer(db, user_id, offer)


@router.get(
    "", response_model=schemas.PaginatedResponse[schemas.InternshipOfferResponse]
)
def list_offers(
    user_id: int,
    status: str | None = Query(
        None,
        description="Filter by status: applied, screened, interview, rejected, accepted",
    ),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    total = crud.count_offers(db, user_id, status=status)
    items = crud.get_offers(db, user_id, status=status, skip=offset, limit=limit)
    return schemas.PaginatedResponse(
        items=items, total=total, limit=limit, offset=offset
    )


@router.get("/{offer_id}", response_model=schemas.InternshipOfferResponse)
def get_offer(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.patch("/{offer_id}", response_model=schemas.InternshipOfferResponse)
def update_offer(
    user_id: int,
    offer_id: int,
    update: schemas.InternshipOfferUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    offer = crud.update_offer(db, offer_id, update)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.delete("/{offer_id}")
def delete_offer(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_offer(db, offer_id):
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"detail": "Offer deleted"}
