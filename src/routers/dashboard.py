from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}", tags=["dashboard"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offers_by_status = crud.get_offers_by_status_counts(db, user_id)
    total_offers = sum(offers_by_status.values())
    avg_score = crud.get_average_interview_score(db, user_id)
    upcoming = crud.get_upcoming_reminders(db, user_id, limit=5)
    activity = crud.get_recent_activity(db, user_id, limit=10)
    sessions_count = crud.get_interview_sessions_count(db, user_id)
    sessions_week = crud.get_interview_sessions_this_week(db, user_id)

    return schemas.DashboardStats(
        offers_by_status=offers_by_status,
        total_offers=total_offers,
        average_interview_score=avg_score,
        upcoming_reminders=[
            schemas.ReminderResponse(
                id=r.id,
                offer_id=r.offer_id,
                reminder_type=r.reminder_type.value,
                title=r.title,
                description=r.description,
                due_at=r.due_at,
                is_done=r.is_done,
                created_at=r.created_at,
            )
            for r in upcoming
        ],
        recent_activity=activity,
        interview_sessions_count=sessions_count,
        interview_sessions_this_week=sessions_week,
    )


@router.get("/calendar", response_model=schemas.CalendarResponse)
def get_calendar(
    user_id: int,
    start: str = Query(..., description="Start date ISO format (YYYY-MM-DD)"),
    end: str = Query(..., description="End date ISO format (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    raw_events = crud.get_calendar_events(db, user_id, start_dt, end_dt)

    events = [
        schemas.CalendarEvent(
            id=e["id"],
            event_type=e["event_type"],
            title=e["title"],
            date=e["date"],
            offer_id=e.get("offer_id"),
            company=e.get("company"),
            metadata=e.get("metadata"),
        )
        for e in raw_events
    ]

    return schemas.CalendarResponse(events=events)
