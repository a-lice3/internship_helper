"""Interview simulation router: REST endpoints + WebSocket."""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.config import JWT_SECRET_KEY, JWT_ALGORITHM
from src.database import get_db, SessionLocal
from src.interview_service import (
    build_interviewer_system_prompt,
    build_profile_summary,
    generate_first_question,
    generate_hint,
    generate_next_question,
    predict_questions,
    run_post_interview_analysis,
)
from src.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["interview"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/users/{user_id}/interview-sessions",
    response_model=schemas.InterviewSessionResponse,
)
def create_session(
    user_id: int,
    body: schemas.InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer_title = None
    company = None
    if body.offer_id:
        offer = crud.get_offer(db, body.offer_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        offer_title = offer.title
        company = offer.company

    session_uuid = str(uuid.uuid4())
    db_session = crud.create_interview_session(
        db,
        user_id=user_id,
        session_id=session_uuid,
        interview_type=body.interview_type,
        difficulty=body.difficulty,
        language=body.language,
        duration_minutes=body.duration_minutes,
        enable_hints=body.enable_hints,
        offer_id=body.offer_id,
        offer_title=offer_title,
        company=company,
    )
    return _session_to_response(db_session)


@router.get(
    "/users/{user_id}/interview-sessions",
    response_model=list[schemas.InterviewSessionResponse],
)
def list_sessions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    sessions = crud.get_interview_sessions(db, user_id)
    return [_session_to_response(s) for s in sessions]


@router.get(
    "/users/{user_id}/interview-sessions/{session_id}",
    response_model=schemas.InterviewSessionDetailResponse,
)
def get_session(
    user_id: int,
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    db_session = crud.get_interview_session_by_pk(db, session_id)
    if not db_session or db_session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_detail_to_response(db_session)


@router.delete("/users/{user_id}/interview-sessions/{session_id}")
def delete_session(
    user_id: int,
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    db_session = crud.get_interview_session_by_pk(db, session_id)
    if not db_session or db_session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    crud.delete_interview_session(db, session_id)
    return {"detail": "Deleted"}


# ---------- Analysis ----------


@router.post(
    "/users/{user_id}/interview-sessions/{session_id}/analyze",
    response_model=schemas.InterviewAnalysisResponse,
)
async def analyze_session(
    user_id: int,
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run post-interview analysis on a completed session."""
    _verify_owner(user_id, current_user)
    db_session = crud.get_interview_session_by_pk(db, session_id)
    if not db_session or db_session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.status.value not in ("completed", "analyzed"):
        raise HTTPException(
            status_code=400, detail="Session must be completed before analysis"
        )

    # Check if analysis already exists
    existing = crud.get_interview_analysis(db, db_session.id)
    if existing:
        turns = crud.get_interview_turns(db, db_session.id)
        return _analysis_to_response(existing, turns)

    turns = crud.get_interview_turns(db, db_session.id)
    turn_dicts = [
        {"question": t.question_text, "answer": t.answer_transcript or ""}
        for t in turns
    ]

    result = await run_post_interview_analysis(
        interview_type=db_session.interview_type.value,
        difficulty=db_session.difficulty.value,
        language=db_session.language,
        offer_title=db_session.offer_title or "",
        company=db_session.company or "",
        turns=turn_dicts,
    )

    # Save analysis
    db_analysis = crud.create_interview_analysis(
        db,
        session_pk=db_session.id,
        overall_score=result.get("overall_score", 50),
        communication_score=result.get("communication_score", 50),
        confidence_score=result.get("confidence_score", 50),
        strengths=json.dumps(result.get("strengths", [])),
        weaknesses=json.dumps(result.get("weaknesses", [])),
        improvements=json.dumps(result.get("improvements", [])),
        summary=result.get("summary", ""),
        technical_score=result.get("technical_score"),
        behavioral_score=result.get("behavioral_score"),
        filler_words_analysis=result.get("filler_words_analysis"),
        star_method_usage=result.get("star_method_usage"),
        full_transcript=result.get("full_transcript"),
    )

    # Save per-turn feedback
    per_turn = result.get("per_turn_feedback", [])
    for ptf in per_turn:
        turn_num = ptf.get("turn_number", 0)
        matching = [t for t in turns if t.turn_number == turn_num]
        if matching:
            crud.update_interview_turn_scores(
                db,
                turn_id=matching[0].id,
                clarity_score=ptf.get("clarity_score"),
                relevance_score=ptf.get("relevance_score"),
                structure_score=ptf.get("structure_score"),
                feedback=ptf.get("feedback"),
                better_answer=ptf.get("better_answer"),
            )

    crud.update_interview_session_status(db, db_session.session_id, "analyzed")

    # Re-fetch turns with updated scores
    turns = crud.get_interview_turns(db, db_session.id)
    return _analysis_to_response(db_analysis, turns)


@router.get(
    "/users/{user_id}/interview-sessions/{session_id}/analysis",
    response_model=schemas.InterviewAnalysisResponse,
)
def get_analysis(
    user_id: int,
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    db_session = crud.get_interview_session_by_pk(db, session_id)
    if not db_session or db_session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    analysis = crud.get_interview_analysis(db, db_session.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    turns = crud.get_interview_turns(db, db_session.id)
    return _analysis_to_response(analysis, turns)


# ---------- Question Prediction ----------


@router.post(
    "/users/{user_id}/offers/{offer_id}/predict-questions",
    response_model=list[schemas.PredictedQuestion],
)
async def predict_questions_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.PredictQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    questions = await predict_questions(
        offer_title=offer.title,
        company=offer.company,
        offer_description=offer.description or "",
        interview_type=body.interview_type,
        difficulty=body.difficulty,
        language=body.language,
        count=body.count,
    )
    return [
        schemas.PredictedQuestion(
            question=q.get("question", ""),
            category=q.get("category", ""),
            difficulty=q.get("difficulty", ""),
            tip=q.get("tip", ""),
        )
        for q in questions
    ]


# ---------- Progress ----------


@router.get(
    "/users/{user_id}/interview-progress",
    response_model=schemas.InterviewProgressResponse,
)
def interview_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    sessions = crud.get_interview_sessions(db, user_id)
    analyzed = [
        s for s in sessions if s.status.value == "analyzed" and s.analysis is not None
    ]

    total = len(sessions)
    scores = [s.analysis.overall_score for s in analyzed if s.analysis]
    avg = sum(scores) / len(scores) if scores else None

    # Score trend: last 10 sessions
    trend = list(reversed(scores[:10]))

    # Best / worst category
    comm_scores = [s.analysis.communication_score for s in analyzed if s.analysis]
    conf_scores = [s.analysis.confidence_score for s in analyzed if s.analysis]
    tech_scores = [
        s.analysis.technical_score
        for s in analyzed
        if s.analysis and s.analysis.technical_score is not None
    ]
    beh_scores = [
        s.analysis.behavioral_score
        for s in analyzed
        if s.analysis and s.analysis.behavioral_score is not None
    ]

    category_avgs: dict[str, float] = {}
    if comm_scores:
        category_avgs["communication"] = sum(comm_scores) / len(comm_scores)
    if conf_scores:
        category_avgs["confidence"] = sum(conf_scores) / len(conf_scores)
    if tech_scores:
        category_avgs["technical"] = sum(tech_scores) / len(tech_scores)
    if beh_scores:
        category_avgs["behavioral"] = sum(beh_scores) / len(beh_scores)

    best = max(category_avgs, key=category_avgs.get) if category_avgs else None  # type: ignore[arg-type]
    worst = min(category_avgs, key=category_avgs.get) if category_avgs else None  # type: ignore[arg-type]

    # Total practice minutes
    total_minutes = 0
    for s in sessions:
        if s.started_at and s.ended_at:
            delta = (s.ended_at - s.started_at).total_seconds() / 60
            total_minutes += int(delta)

    # Sessions this week
    from datetime import timedelta

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    this_week = len([s for s in sessions if s.created_at and s.created_at > week_ago])

    return schemas.InterviewProgressResponse(
        total_sessions=total,
        average_score=round(avg, 1) if avg else None,
        score_trend=trend,
        best_category=best,
        worst_category=worst,
        total_practice_minutes=total_minutes,
        sessions_this_week=this_week,
    )


# ---------------------------------------------------------------------------
# WebSocket Interview (token passed as query parameter)
# ---------------------------------------------------------------------------


def _authenticate_ws_token(token: str, db: Session) -> User | None:
    """Validate a JWT token and return the User, or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            return None
        user = db.query(User).filter(User.id == int(user_id_str)).first()
        return user
    except (JWTError, ValueError):
        return None


@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint for live interview simulation.

    The JWT token is passed as a query parameter: ws://host/ws/interview/{id}?token=xxx
    """
    await websocket.accept()

    db = SessionLocal()
    try:
        # Authenticate via token
        user = _authenticate_ws_token(token, db)
        if not user:
            await websocket.send_json(
                {"type": "error", "data": {"message": "Unauthorized"}}
            )
            await websocket.close()
            return

        db_session = crud.get_interview_session(db, session_id)
        if not db_session:
            await websocket.send_json(
                {"type": "error", "data": {"message": "Session not found"}}
            )
            await websocket.close()
            return

        # Verify the connecting user owns this session
        if db_session.user_id != user.id:
            await websocket.send_json(
                {"type": "error", "data": {"message": "Unauthorized"}}
            )
            await websocket.close()
            return

        # Load user profile for prompt context
        skills = crud.get_skills(db, user.id)
        experiences = crud.get_experiences(db, user.id)
        education = crud.get_education(db, user.id)
        user_profile = build_profile_summary(user, skills, experiences, education)

        # Load offer if present
        offer_description = ""
        if db_session.offer_id:
            offer = crud.get_offer(db, db_session.offer_id)
            if offer:
                offer_description = offer.description or ""

        # Build system prompt
        system_prompt = build_interviewer_system_prompt(
            interview_type=db_session.interview_type.value,
            difficulty=db_session.difficulty.value,
            language=db_session.language,
            offer_title=db_session.offer_title or "",
            company=db_session.company or "",
            offer_description=offer_description,
            user_profile=user_profile,
        )

        # Mark session as active
        crud.update_interview_session_status(db, session_id, "active")

        # Send ready
        await websocket.send_json(
            {
                "type": "session.ready",
                "data": {
                    "session_id": session_id,
                    "duration_minutes": db_session.duration_minutes,
                },
            }
        )

        # Generate first question
        first_question = await asyncio.to_thread(generate_first_question, system_prompt)

        turn_number = 1
        conversation_history: list[dict[str, str]] = []

        # Save first question to DB
        db_turn = crud.create_interview_turn(
            db,
            session_pk=db_session.id,
            turn_number=turn_number,
            question_text=first_question,
        )

        await websocket.send_json(
            {
                "type": "ai.question",
                "data": {
                    "question_number": turn_number,
                    "text": first_question,
                },
            }
        )

        # Start timer
        start_time = datetime.utcnow()
        duration_seconds = db_session.duration_minutes * 60

        # Main interview loop
        while True:
            # Check time limit
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            remaining = duration_seconds - elapsed
            if remaining <= 0:
                await websocket.send_json(
                    {
                        "type": "timer",
                        "data": {
                            "elapsed_seconds": int(elapsed),
                            "remaining_seconds": 0,
                        },
                    }
                )
                break

            # Wait for client message
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_json(), timeout=min(remaining, 30)
                )
            except asyncio.TimeoutError:
                # Send timer update and continue waiting
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                remaining = duration_seconds - elapsed
                if remaining <= 0:
                    break
                await websocket.send_json(
                    {
                        "type": "timer",
                        "data": {
                            "elapsed_seconds": int(elapsed),
                            "remaining_seconds": int(max(0, remaining)),
                        },
                    }
                )
                continue

            msg_type = raw.get("type", "")

            if msg_type == "interview.end":
                break

            elif msg_type == "turn.end":
                # User finished answering
                answer_text = raw.get("data", {}).get("transcript", "")
                answer_duration = raw.get("data", {}).get("duration_seconds")
                skipped = not answer_text.strip()

                # Save answer
                crud.update_interview_turn_answer(
                    db,
                    turn_id=db_turn.id,
                    answer_transcript=answer_text,
                    answer_duration_seconds=answer_duration,
                    skipped=skipped,
                )

                conversation_history.append(
                    {
                        "question": (
                            first_question
                            if turn_number == 1
                            else (
                                conversation_history[-1]["question"]
                                if conversation_history
                                else ""
                            )
                        ),
                        "answer": answer_text,
                    }
                )
                # Fix: always use current question
                conversation_history[-1]["question"] = db_turn.question_text

                # Check if time to end
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                if duration_seconds - elapsed <= 10:
                    break

                # Generate next question
                await websocket.send_json({"type": "ai.thinking"})
                next_question = await asyncio.to_thread(
                    generate_next_question,
                    system_prompt,
                    conversation_history,
                    answer_text,
                )

                turn_number += 1
                db_turn = crud.create_interview_turn(
                    db,
                    session_pk=db_session.id,
                    turn_number=turn_number,
                    question_text=next_question,
                )

                await websocket.send_json(
                    {
                        "type": "ai.question",
                        "data": {
                            "question_number": turn_number,
                            "text": next_question,
                        },
                    }
                )

            elif msg_type == "question.skip":
                crud.update_interview_turn_answer(
                    db,
                    turn_id=db_turn.id,
                    answer_transcript="",
                    skipped=True,
                )
                conversation_history.append(
                    {"question": db_turn.question_text, "answer": "(skipped)"}
                )

                elapsed = (datetime.utcnow() - start_time).total_seconds()
                if duration_seconds - elapsed <= 10:
                    break

                await websocket.send_json({"type": "ai.thinking"})
                next_question = await asyncio.to_thread(
                    generate_next_question,
                    system_prompt,
                    conversation_history,
                    "(The candidate skipped this question.)",
                )

                turn_number += 1
                db_turn = crud.create_interview_turn(
                    db,
                    session_pk=db_session.id,
                    turn_number=turn_number,
                    question_text=next_question,
                )

                await websocket.send_json(
                    {
                        "type": "ai.question",
                        "data": {
                            "question_number": turn_number,
                            "text": next_question,
                        },
                    }
                )

            elif msg_type == "hint.request":
                if db_session.enable_hints:
                    partial = raw.get("data", {}).get("partial_transcript", "")
                    hint = await asyncio.to_thread(
                        generate_hint,
                        db_turn.question_text,
                        partial,
                        db_session.language,
                    )
                    await websocket.send_json({"type": "hint", "data": {"text": hint}})

        # Interview ended
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        crud.update_interview_session_status(db, session_id, "completed")

        await websocket.send_json(
            {
                "type": "interview.summary",
                "data": {
                    "questions_answered": turn_number,
                    "duration_seconds": int(elapsed),
                },
            }
        )
        await websocket.send_json(
            {"type": "session.closed", "data": {"reason": "completed"}}
        )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
        crud.update_interview_session_status(db, session_id, "completed")
    except Exception as exc:
        logger.error("WebSocket error for session %s: %s", session_id, exc)
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(exc)}})
        except Exception:
            pass
        crud.update_interview_session_status(db, session_id, "completed")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _session_to_response(s: Any) -> schemas.InterviewSessionResponse:
    return schemas.InterviewSessionResponse(
        id=s.id,
        session_id=s.session_id,
        offer_id=s.offer_id,
        interview_type=s.interview_type.value,
        difficulty=s.difficulty.value,
        language=s.language,
        duration_minutes=s.duration_minutes,
        enable_hints=s.enable_hints,
        status=s.status.value,
        offer_title=s.offer_title,
        company=s.company,
        started_at=s.started_at,
        ended_at=s.ended_at,
        created_at=s.created_at,
    )


def _session_detail_to_response(s: Any) -> schemas.InterviewSessionDetailResponse:
    turns = [_turn_to_response(t) for t in s.turns]
    analysis = None
    if s.analysis:
        analysis = _analysis_to_response(s.analysis, s.turns)
    return schemas.InterviewSessionDetailResponse(
        id=s.id,
        session_id=s.session_id,
        offer_id=s.offer_id,
        interview_type=s.interview_type.value,
        difficulty=s.difficulty.value,
        language=s.language,
        duration_minutes=s.duration_minutes,
        enable_hints=s.enable_hints,
        status=s.status.value,
        offer_title=s.offer_title,
        company=s.company,
        started_at=s.started_at,
        ended_at=s.ended_at,
        created_at=s.created_at,
        turns=turns,
        analysis=analysis,
    )


def _turn_to_response(t: Any) -> schemas.InterviewTurnResponse:
    return schemas.InterviewTurnResponse(
        id=t.id,
        turn_number=t.turn_number,
        question_text=t.question_text,
        question_category=t.question_category,
        answer_transcript=t.answer_transcript,
        answer_duration_seconds=t.answer_duration_seconds,
        skipped=t.skipped,
        clarity_score=t.clarity_score,
        relevance_score=t.relevance_score,
        structure_score=t.structure_score,
        feedback=t.feedback,
        better_answer=t.better_answer,
    )


def _analysis_to_response(
    a: Any, turns: list[Any]
) -> schemas.InterviewAnalysisResponse:
    turn_responses = [_turn_to_response(t) for t in turns]
    return schemas.InterviewAnalysisResponse(
        id=a.id,
        overall_score=a.overall_score,
        communication_score=a.communication_score,
        technical_score=a.technical_score,
        behavioral_score=a.behavioral_score,
        confidence_score=a.confidence_score,
        strengths=(
            json.loads(a.strengths) if isinstance(a.strengths, str) else a.strengths
        ),
        weaknesses=(
            json.loads(a.weaknesses) if isinstance(a.weaknesses, str) else a.weaknesses
        ),
        improvements=(
            json.loads(a.improvements)
            if isinstance(a.improvements, str)
            else a.improvements
        ),
        summary=a.summary,
        filler_words_analysis=a.filler_words_analysis,
        star_method_usage=a.star_method_usage,
        full_transcript=a.full_transcript,
        per_turn_feedback=turn_responses,
        created_at=a.created_at,
    )
