import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/memos", tags=["memos"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _memo_response(memo) -> schemas.MemoResponse:
    tags = []
    if memo.tags:
        try:
            tags = json.loads(memo.tags)
        except (json.JSONDecodeError, TypeError):
            pass
    return schemas.MemoResponse(
        id=memo.id,
        title=memo.title,
        content=memo.content,
        tags=tags,
        offer_id=memo.offer_id,
        skill_name=memo.skill_name,
        is_favorite=memo.is_favorite,
        created_at=memo.created_at,
        updated_at=memo.updated_at,
    )


@router.post("", response_model=schemas.MemoResponse)
def create_memo(
    user_id: int,
    memo: schemas.MemoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    db_memo = crud.create_memo(db, user_id, memo)
    return _memo_response(db_memo)


@router.get("", response_model=schemas.PaginatedResponse[schemas.MemoResponse])
def list_memos(
    user_id: int,
    search: str | None = Query(None),
    tag: str | None = Query(None),
    offer_id: int | None = Query(None),
    favorites_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    total = crud.count_memos(
        db,
        user_id,
        search=search,
        tag=tag,
        offer_id=offer_id,
        favorites_only=favorites_only,
    )
    memos = crud.get_memos(
        db,
        user_id,
        search=search,
        tag=tag,
        offer_id=offer_id,
        favorites_only=favorites_only,
        skip=offset,
        limit=limit,
    )
    items = [_memo_response(m) for m in memos]
    return schemas.PaginatedResponse(
        items=items, total=total, limit=limit, offset=offset
    )


@router.get("/{memo_id}", response_model=schemas.MemoResponse)
def get_memo(
    user_id: int,
    memo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    memo = crud.get_memo(db, memo_id)
    if not memo or memo.user_id != user_id:
        raise HTTPException(status_code=404, detail="Memo not found")
    return _memo_response(memo)


@router.patch("/{memo_id}", response_model=schemas.MemoResponse)
def update_memo(
    user_id: int,
    memo_id: int,
    update: schemas.MemoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    existing = crud.get_memo(db, memo_id)
    if not existing or existing.user_id != user_id:
        raise HTTPException(status_code=404, detail="Memo not found")
    memo = crud.update_memo(db, memo_id, update)
    return _memo_response(memo)


@router.delete("/{memo_id}")
def delete_memo(
    user_id: int,
    memo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    existing = crud.get_memo(db, memo_id)
    if not existing or existing.user_id != user_id:
        raise HTTPException(status_code=404, detail="Memo not found")
    crud.delete_memo(db, memo_id)
    return {"detail": "Memo deleted"}
