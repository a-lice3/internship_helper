from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}/goals", tags=["goals"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("", response_model=schemas.GoalResponse)
def create_goal(
    user_id: int,
    goal: schemas.GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    db_goal = crud.create_goal(db, user_id, goal)
    return schemas.GoalResponse(
        id=db_goal.id,
        title=db_goal.title,
        frequency=db_goal.frequency.value,
        target_count=db_goal.target_count,
        is_active=db_goal.is_active,
        created_at=db_goal.created_at,
    )


@router.get("", response_model=list[schemas.GoalResponse])
def list_goals(
    user_id: int,
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    goals = crud.get_goals(db, user_id, active_only=active_only)
    return [
        schemas.GoalResponse(
            id=g.id,
            title=g.title,
            frequency=g.frequency.value,
            target_count=g.target_count,
            is_active=g.is_active,
            created_at=g.created_at,
        )
        for g in goals
    ]


@router.get("/summary", response_model=schemas.DailyGoalsSummary)
def get_goals_summary(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_daily_goals_summary(db, user_id, date.today())


@router.patch("/{goal_id}", response_model=schemas.GoalResponse)
def update_goal(
    user_id: int,
    goal_id: int,
    update: schemas.GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    goal = crud.update_goal(db, goal_id, update)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return schemas.GoalResponse(
        id=goal.id,
        title=goal.title,
        frequency=goal.frequency.value,
        target_count=goal.target_count,
        is_active=goal.is_active,
        created_at=goal.created_at,
    )


@router.delete("/{goal_id}")
def delete_goal(
    user_id: int,
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_goal(db, goal_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"detail": "Goal deleted"}


@router.post("/{goal_id}/progress", response_model=schemas.GoalProgressResponse)
def log_progress(
    user_id: int,
    goal_id: int,
    progress: schemas.GoalProgressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    entry = crud.log_goal_progress(
        db,
        goal_id,
        user_id,
        date.today(),
        progress.completed_count,
        progress.notes,
    )
    return schemas.GoalProgressResponse(
        id=entry.id,
        goal_id=entry.goal_id,
        date=entry.date,
        completed_count=entry.completed_count,
        notes=entry.notes,
    )


@router.get("/{goal_id}/progress", response_model=list[schemas.GoalProgressResponse])
def get_progress(
    user_id: int,
    goal_id: int,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    entries = crud.get_goal_progress(db, goal_id, start_date, end_date)
    return [
        schemas.GoalProgressResponse(
            id=e.id,
            goal_id=e.goal_id,
            date=e.date,
            completed_count=e.completed_count,
            notes=e.notes,
        )
        for e in entries
    ]
