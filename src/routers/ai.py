from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db
from src.llm_service import (
    adapt_cv,
    analyze_skill_gap,
    generate_cover_letter,
    ask_mistral,
)

router = APIRouter(tags=["ai"])


@router.post("/ask", response_model=schemas.AskResponse)
def ask(body: schemas.AskRequest):
    answer = ask_mistral(body.question)
    return schemas.AskResponse(question=body.question, answer=answer)


@router.post(
    "/users/{user_id}/offers/{offer_id}/adapt-cv",
    response_model=schemas.AdaptCVResponse,
)
def adapt_cv_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.AdaptCVRequest,
    db: Session = Depends(get_db),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    cv = crud.get_cv(db, body.cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    adapted_content = adapt_cv(
        cv.content, offer.title, offer.company, offer.description or ""
    )

    crud.create_adapted_cv(db, user_id, offer_id, offer.company, adapted_content)

    return schemas.AdaptCVResponse(
        original_cv=cv.content,
        adapted_cv=adapted_content,
        offer_title=offer.title,
        company=offer.company,
    )


@router.post(
    "/users/{user_id}/offers/{offer_id}/skill-gap",
    response_model=schemas.SkillGapResponse,
)
def skill_gap_endpoint(
    user_id: int,
    offer_id: int,
    db: Session = Depends(get_db),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    skills = crud.get_skills(db, user_id)
    skill_names = [s.name for s in skills]

    result = analyze_skill_gap(
        skill_names, offer.title, offer.company, offer.description or ""
    )

    return schemas.SkillGapResponse(
        offer_title=offer.title,
        company=offer.company,
        **result,
    )


@router.post(
    "/users/{user_id}/offers/{offer_id}/cover-letter",
    response_model=schemas.GenerateCoverLetterResponse,
)
def cover_letter_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.GenerateCoverLetterRequest,
    db: Session = Depends(get_db),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    template_content = ""
    if body.template_id:
        template = crud.get_template(db, body.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        template_content = template.content

    skills = crud.get_skills(db, user_id)
    projects = crud.get_projects(db, user_id)
    education = crud.get_education(db, user_id)

    profile_summary = _build_profile_summary(user, skills, projects, education)

    letter = generate_cover_letter(
        profile_summary=profile_summary,
        offer_title=offer.title,
        company=offer.company,
        offer_description=offer.description or "",
        template=template_content,
    )

    return schemas.GenerateCoverLetterResponse(
        offer_title=offer.title,
        company=offer.company,
        cover_letter=letter,
    )


def _build_profile_summary(user, skills, projects, education) -> str:  # type: ignore[no-untyped-def]
    parts = [f"Name: {user.name}"]

    if skills:
        parts.append("Skills: " + ", ".join(s.name for s in skills))

    if projects:
        proj_lines = []
        for p in projects:
            line = p.title
            if p.technologies:
                line += f" ({p.technologies})"
            proj_lines.append(line)
        parts.append("Projects: " + "; ".join(proj_lines))

    if education:
        edu_lines = []
        for e in education:
            line = f"{e.degree} at {e.school}"
            if e.field:
                line += f" in {e.field}"
            edu_lines.append(line)
        parts.append("Education: " + "; ".join(edu_lines))

    return "\n".join(parts)
