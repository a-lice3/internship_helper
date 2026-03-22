import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.llm_service import (
    adapt_cv,
    adapt_cv_latex,
    analyze_pitch,
    analyze_skill_gap,
    chat_edit_cover_letter,
    extract_profile_from_cv,
    fetch_company_info,
    fetch_offer_from_url,
    generate_cover_letter,
    ask_mistral,
    parse_offer,
    suggest_cv_changes,
    transcribe_audio,
)
from src.models import User

router = APIRouter(tags=["ai"])


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/ask", response_model=schemas.AskResponse)
def ask(
    body: schemas.AskRequest,
    current_user: User = Depends(get_current_user),
):
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    cv = crud.get_cv(db, body.cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    adapted_content = adapt_cv(
        cv.content,
        offer.title,
        offer.company,
        offer.description or "",
        user_instructions=current_user.ai_instructions,
    )

    crud.create_adapted_cv(db, user_id, offer_id, offer.company, adapted_content)

    return schemas.AdaptCVResponse(
        original_cv=cv.content,
        adapted_cv=adapted_content,
        offer_title=offer.title,
        company=offer.company,
    )


# ---------- CV Suggestions (non-LaTeX) ----------


@router.post(
    "/users/{user_id}/offers/{offer_id}/suggest-cv-changes",
    response_model=schemas.CVSuggestionsResponse,
)
def suggest_cv_changes_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.CVSuggestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    cv = crud.get_cv(db, body.cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    cv_text = cv.latex_content or cv.content
    result = suggest_cv_changes(
        cv_text,
        offer.title,
        offer.company,
        offer.description or "",
        user_instructions=current_user.ai_instructions,
    )

    import json

    db_obj = crud.create_or_update_cv_offer_analysis(
        db,
        user_id=user_id,
        offer_id=offer_id,
        cv_id=body.cv_id,
        offer_title=offer.title,
        company=offer.company,
        score=result["score"],
        suggested_title=result["suggested_title"],
        suggested_profile=result["suggested_profile"],
        other_suggestions=json.dumps(result["other_suggestions"]),
    )

    return schemas.CVSuggestionsResponse(
        id=db_obj.id,
        cv_id=body.cv_id,
        score=result["score"],
        suggested_title=result["suggested_title"],
        suggested_profile=result["suggested_profile"],
        other_suggestions=result["other_suggestions"],
        offer_title=offer.title,
        company=offer.company,
    )


@router.get(
    "/users/{user_id}/cv-offer-analyses",
    response_model=list[schemas.StoredCVOfferAnalysisResponse],
)
def get_cv_offer_analyses_endpoint(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    import json

    rows = crud.get_cv_offer_analyses(db, user_id)
    return [
        schemas.StoredCVOfferAnalysisResponse(
            id=r.id,
            offer_id=r.offer_id,
            cv_id=r.cv_id,
            offer_title=r.offer_title,
            company=r.company,
            score=r.score,
            suggested_title=r.suggested_title,
            suggested_profile=r.suggested_profile,
            other_suggestions=json.loads(r.other_suggestions),
            created_at=r.created_at,
        )
        for r in rows
    ]


# ---------- CV General Analysis ----------


@router.post(
    "/users/{user_id}/cvs/{cv_id}/analyze",
    response_model=schemas.CVAnalysisResponse,
)
def analyze_cv_endpoint(
    user_id: int,
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    cv = crud.get_cv(db, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    from src.llm_service import analyze_cv_general

    result = analyze_cv_general(
        cv.content,
        user_instructions=current_user.ai_instructions,
    )

    # Persist the analysis
    import json

    crud.create_or_update_cv_general_analysis(
        db,
        user_id=user_id,
        cv_id=cv_id,
        score=result["score"],
        summary=result["summary"],
        strengths=json.dumps(result["strengths"]),
        improvements=json.dumps(result["improvements"]),
    )

    return schemas.CVAnalysisResponse(
        score=result["score"],
        summary=result["summary"],
        strengths=result["strengths"],
        improvements=result["improvements"],
    )


@router.get(
    "/users/{user_id}/cv-analyses",
    response_model=list[schemas.StoredCVAnalysisResponse],
)
def get_cv_analyses_endpoint(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    import json

    rows = crud.get_cv_general_analyses(db, user_id)
    return [
        schemas.StoredCVAnalysisResponse(
            id=r.id,
            cv_id=r.cv_id,
            score=r.score,
            summary=r.summary,
            strengths=json.loads(r.strengths),
            improvements=json.loads(r.improvements),
            created_at=r.created_at,
        )
        for r in rows
    ]


# ---------- Skill Gap (persisted) ----------


@router.post(
    "/users/{user_id}/offers/{offer_id}/skill-gap",
    response_model=schemas.SkillGapResponse,
)
def skill_gap_endpoint(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    skills = crud.get_skills(db, user_id)
    skill_names = [s.name for s in skills]

    # Easter egg: Mistral AI offers always return a perfect match
    if offer.company and "mistral" in offer.company.lower():
        result = {
            "missing_hard_skills": [],
            "missing_soft_skills": [],
            "recommendations": [
                "No missing skill. You are a perfect match for Mistral AI. 🎉"
            ],
        }
    else:
        result = analyze_skill_gap(
            skill_names,
            offer.title,
            offer.company,
            offer.description or "",
            user_instructions=current_user.ai_instructions,
        )

    db_obj = crud.create_skill_gap_analysis(
        db,
        user_id=user_id,
        offer_id=offer_id,
        offer_title=offer.title,
        company=offer.company,
        missing_hard_skills=json.dumps(result["missing_hard_skills"]),
        missing_soft_skills=json.dumps(result["missing_soft_skills"]),
        recommendations=json.dumps(result["recommendations"]),
    )

    return schemas.SkillGapResponse(
        id=db_obj.id,
        offer_title=offer.title,
        company=offer.company,
        **result,
    )


@router.get(
    "/users/{user_id}/skill-gaps",
    response_model=list[schemas.SkillGapAnalysisResponse],
)
def list_skill_gaps(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    rows = crud.get_skill_gap_analyses(db, user_id)
    return [
        schemas.SkillGapAnalysisResponse(
            id=r.id,
            offer_id=r.offer_id,
            offer_title=r.offer_title,
            company=r.company,
            missing_hard_skills=json.loads(r.missing_hard_skills),
            missing_soft_skills=json.loads(r.missing_soft_skills),
            recommendations=json.loads(r.recommendations),
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete("/users/{user_id}/skill-gaps/{analysis_id}")
def delete_skill_gap(
    user_id: int,
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_skill_gap_analysis(db, analysis_id):
        raise HTTPException(status_code=404, detail="Skill gap analysis not found")
    return {"detail": "Deleted"}


# ---------- Cover Letter (persisted) ----------


@router.post(
    "/users/{user_id}/offers/{offer_id}/cover-letter",
    response_model=schemas.GenerateCoverLetterResponse,
)
def cover_letter_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    template_content = ""
    if body.cover_letter_id:
        ref_cl = crud.get_generated_cover_letter(db, body.cover_letter_id)
        if not ref_cl:
            raise HTTPException(status_code=404, detail="Cover letter not found")
        template_content = ref_cl.content
    elif body.template_id:
        template = crud.get_template(db, body.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        template_content = template.content

    skills = crud.get_skills(db, user_id)
    experiences = crud.get_experiences(db, user_id)
    education = crud.get_education(db, user_id)

    profile_summary = _build_profile_summary(
        current_user, skills, experiences, education
    )

    letter = generate_cover_letter(
        profile_summary=profile_summary,
        offer_title=offer.title,
        company=offer.company,
        offer_description=offer.description or "",
        template=template_content,
        user_instructions=current_user.ai_instructions,
    )

    db_obj = crud.create_generated_cover_letter(
        db,
        user_id=user_id,
        offer_id=offer_id,
        template_id=body.template_id,
        offer_title=offer.title,
        company=offer.company,
        content=letter,
    )

    return schemas.GenerateCoverLetterResponse(
        id=db_obj.id,
        offer_title=offer.title,
        company=offer.company,
        cover_letter=letter,
    )


@router.get(
    "/users/{user_id}/cover-letters",
    response_model=list[schemas.GeneratedCoverLetterResponse],
)
def list_cover_letters(
    user_id: int,
    saved_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_generated_cover_letters(db, user_id, saved_only=saved_only)


@router.post(
    "/users/{user_id}/cover-letters",
    response_model=schemas.GeneratedCoverLetterResponse,
)
def create_cover_letter_manual(
    user_id: int,
    body: schemas.CreateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a cover letter manually (from text)."""
    _verify_owner(user_id, current_user)
    obj = crud.create_generated_cover_letter(
        db,
        user_id=user_id,
        offer_id=None,
        template_id=None,
        offer_title=None,
        company=None,
        content=body.content,
        name=body.name,
        saved=True,
    )
    return obj


@router.post(
    "/users/{user_id}/cover-letters/upload",
    response_model=schemas.GeneratedCoverLetterResponse,
)
def upload_cover_letter_pdf(
    user_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF as a cover letter (text extracted automatically)."""
    from src.file_service import extract_text_from_pdf, save_upload, validate_file_magic

    _verify_owner(user_id, current_user)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    raw = file.file.read()
    try:
        validate_file_magic(raw, "pdf")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    file.file.seek(0)

    path = save_upload(user_id, file)
    content = extract_text_from_pdf(path)

    if not content.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    name = file.filename.rsplit(".", 1)[0]
    obj = crud.create_generated_cover_letter(
        db,
        user_id=user_id,
        offer_id=None,
        template_id=None,
        offer_title=None,
        company=None,
        content=content,
        name=name,
        saved=True,
    )
    return obj


@router.delete("/users/{user_id}/cover-letters/{letter_id}")
def delete_cover_letter(
    user_id: int,
    letter_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_generated_cover_letter(db, letter_id):
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return {"detail": "Deleted"}


@router.post(
    "/users/{user_id}/cover-letters/{letter_id}/chat-edit",
    response_model=schemas.ChatEditCoverLetterResponse,
)
def chat_edit_cover_letter_endpoint(
    user_id: int,
    letter_id: int,
    body: schemas.ChatEditCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a chat instruction to modify a cover letter via Mistral."""
    _verify_owner(user_id, current_user)

    updated_content = chat_edit_cover_letter(
        cover_letter_content=body.content,
        user_message=body.message,
        conversation_history=body.conversation_history,
        user_instructions=current_user.ai_instructions,
    )

    # Persist the updated content
    crud.update_generated_cover_letter(db, letter_id, content=updated_content)

    return schemas.ChatEditCoverLetterResponse(updated_content=updated_content)


@router.patch(
    "/users/{user_id}/cover-letters/{letter_id}",
    response_model=schemas.GeneratedCoverLetterResponse,
)
def update_cover_letter_content(
    user_id: int,
    letter_id: int,
    body: schemas.UpdateCoverLetterContentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the cover letter content and/or saved flag."""
    _verify_owner(user_id, current_user)

    obj = crud.update_generated_cover_letter(
        db, letter_id, content=body.content, saved=body.saved
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return obj


# ---------- Adapt CV LaTeX ----------


@router.post(
    "/users/{user_id}/offers/{offer_id}/adapt-cv-latex",
    response_model=schemas.AdaptCVLatexResponse,
)
def adapt_cv_latex_endpoint(
    user_id: int,
    offer_id: int,
    body: schemas.AdaptCVLatexRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    cv = crud.get_cv(db, body.cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    if not cv.latex_content:
        raise HTTPException(status_code=400, detail="This CV has no LaTeX source")

    # Read .cls / .sty support files so Mistral knows the available commands
    support_files_content = ""
    if cv.support_files_dir:
        from pathlib import Path

        support_dir = Path(cv.support_files_dir)
        if support_dir.is_dir():
            parts: list[str] = []
            for ext in ("*.cls", "*.sty"):
                for f in support_dir.rglob(ext):
                    try:
                        content = f.read_text(encoding="utf-8", errors="replace")
                        parts.append(f"% --- {f.name} ---\n{content}")
                    except Exception:
                        continue
            support_files_content = "\n\n".join(parts)

    adapted_latex = adapt_cv_latex(
        cv.latex_content,
        offer.title,
        offer.company,
        offer.description or "",
        support_files_content=support_files_content,
        support_files_dir=cv.support_files_dir,
        user_instructions=current_user.ai_instructions,
    )

    return schemas.AdaptCVLatexResponse(
        original_latex=cv.latex_content,
        adapted_latex=adapted_latex,
        offer_title=offer.title,
        company=offer.company,
        support_files_dir=cv.support_files_dir,
    )


# ---------- Parse Offer ----------


@router.post("/parse-offer", response_model=schemas.ParseOfferResponse)
def parse_offer_endpoint(
    body: schemas.ParseOfferRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.text and not body.url:
        raise HTTPException(status_code=422, detail="Provide either text or url")

    text = body.text or ""
    if body.url:
        try:
            text = fetch_offer_from_url(body.url)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch offer page: {exc}",
            )

    try:
        result = parse_offer(text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Mistral API error: {exc}")
    return schemas.ParseOfferResponse(
        company=result.get("company") or "",
        title=result.get("title") or "",
        locations=result.get("locations"),
        description=result.get("description"),
    )


# ---------- Company Info (Wikipedia) ----------


@router.get("/company-info", response_model=schemas.CompanyInfoResponse)
def company_info_endpoint(
    name: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch company description from Wikipedia."""
    result = fetch_company_info(name)
    return schemas.CompanyInfoResponse(**result)


# ---------- Auto-fill Profile from CV ----------


@router.post(
    "/users/{user_id}/auto-fill-profile",
    response_model=schemas.AutoFillProfileResponse,
)
def auto_fill_profile_endpoint(
    user_id: int,
    cv_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)

    if cv_id is not None:
        cv = crud.get_cv(db, cv_id)
        if not cv or cv.user_id != user_id:
            raise HTTPException(status_code=404, detail="CV not found.")
    else:
        cvs = crud.get_cvs(db, user_id)
        if not cvs:
            raise HTTPException(
                status_code=400, detail="No CV found. Upload a CV first."
            )
        cv = cvs[0]

    cv_text = cv.content

    try:
        extracted = extract_profile_from_cv(cv_text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Mistral API error: {exc}")

    _save_extracted_profile(db, user_id, extracted)

    return _build_autofill_response(extracted)


@router.post(
    "/users/{user_id}/auto-fill-profile/upload",
    response_model=schemas.AutoFillProfileResponse,
)
def auto_fill_profile_from_upload(
    user_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF CV and extract profile data from it (merge mode)."""
    _verify_owner(user_id, current_user)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    from src.file_service import save_upload, extract_text_from_pdf, validate_file_magic

    raw = file.file.read()
    try:
        validate_file_magic(raw, "pdf")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    file.file.seek(0)

    path = save_upload(user_id, file)
    cv_text = extract_text_from_pdf(path)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    try:
        extracted = extract_profile_from_cv(cv_text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Mistral API error: {exc}")

    _save_extracted_profile(db, user_id, extracted)

    return _build_autofill_response(extracted)


def _save_extracted_profile(
    db: Session,
    user_id: int,
    extracted: dict[str, list[dict[str, Any]]],
) -> None:
    """Persist extracted profile data into the database."""
    existing_skills = crud.get_skills(db, user_id)
    existing_skill_names = {s.name.lower() for s in existing_skills}

    for s in extracted.get("skills", []):
        s["name"] = s.get("name") or ""
        name = s["name"]
        if name.lower() not in existing_skill_names:
            crud.create_skill(db, user_id, schemas.SkillCreate(**s))  # type: ignore[arg-type]
            existing_skill_names.add(name.lower())
    for exp in extracted.get("experiences", []):
        exp["title"] = exp.get("title") or ""
        crud.create_experience(db, user_id, schemas.ExperienceCreate(**exp))  # type: ignore[arg-type]
    for ed in extracted.get("education", []):
        ed["school"] = ed.get("school") or ""
        ed["degree"] = ed.get("degree") or ""
        crud.create_education(db, user_id, schemas.EducationCreate(**ed))  # type: ignore[arg-type]
    for lang in extracted.get("languages", []):
        lang["language"] = lang.get("language") or ""
        lang["level"] = lang.get("level") or "intermediate"
        crud.create_language(db, user_id, schemas.LanguageCreate(**lang))  # type: ignore[arg-type]
    for ex in extracted.get("extracurriculars", []):
        ex["name"] = ex.get("name") or ""
        crud.create_extracurricular(db, user_id, schemas.ExtracurricularCreate(**ex))  # type: ignore[arg-type]


def _build_autofill_response(
    extracted: dict[str, list[dict[str, Any]]],
) -> schemas.AutoFillProfileResponse:
    return schemas.AutoFillProfileResponse(
        skills=[schemas.SkillCreate(**s) for s in extracted.get("skills", [])],  # type: ignore[arg-type]
        experiences=[
            schemas.ExperienceCreate(**exp) for exp in extracted.get("experiences", [])  # type: ignore[arg-type]
        ],
        education=[
            schemas.EducationCreate(**ed) for ed in extracted.get("education", [])  # type: ignore[arg-type]
        ],
        languages=[
            schemas.LanguageCreate(**lang) for lang in extracted.get("languages", [])  # type: ignore[arg-type]
        ],
        extracurriculars=[
            schemas.ExtracurricularCreate(**ex)  # type: ignore[arg-type]
            for ex in extracted.get("extracurriculars", [])
        ],
    )


def _build_profile_summary(user, skills, experiences, education) -> str:  # type: ignore[no-untyped-def]
    parts = [f"Name: {user.name}"]

    if skills:
        parts.append("Skills: " + ", ".join(s.name for s in skills))

    if experiences:
        exp_lines = []
        for e in experiences:
            line = e.title
            if e.technologies:
                line += f" ({e.technologies})"
            if e.client:
                line += f" - {e.client}"
            exp_lines.append(line)
        parts.append("Experience: " + "; ".join(exp_lines))

    if education:
        edu_lines = []
        for e in education:
            line = f"{e.degree} at {e.school}"
            if e.field:
                line += f" in {e.field}"
            edu_lines.append(line)
        parts.append("Education: " + "; ".join(edu_lines))

    return "\n".join(parts)


# ---------- Pitch Analysis (persisted) ----------

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".webm", ".ogg", ".m4a", ".flac"}


def _validate_audio_file(file: UploadFile) -> None:
    """Validate that the uploaded file is an audio file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Accepted: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )


def _build_pitch_response(
    db_obj: Any,
    transcription: str,
    analysis: dict[str, Any],
    offer_title: str | None = None,
    company: str | None = None,
) -> schemas.PitchAnalysisResponse:
    return schemas.PitchAnalysisResponse(
        id=db_obj.id,
        offer_title=offer_title,
        company=company,
        transcription=transcription,
        structure_clarity=analysis["structure_clarity"],
        strengths=analysis["strengths"],
        improvements=analysis["improvements"],
        offer_relevance=analysis.get("offer_relevance"),
        overall_score=analysis["overall_score"],
        summary=analysis["summary"],
    )


@router.post(
    "/users/{user_id}/pitch-analysis",
    response_model=schemas.PitchAnalysisResponse,
)
def pitch_analysis_general(
    user_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze an audio pitch (general, no offer context)."""
    _verify_owner(user_id, current_user)

    _validate_audio_file(file)

    audio_content = file.file.read()
    transcription = transcribe_audio(file.filename or "audio.webm", audio_content)

    analysis = analyze_pitch(
        transcription=transcription,
        user_instructions=current_user.ai_instructions,
    )

    db_obj = crud.create_pitch_analysis(
        db,
        user_id=user_id,
        offer_id=None,
        offer_title=None,
        company=None,
        transcription=transcription,
        structure_clarity=str(analysis["structure_clarity"]),
        strengths=json.dumps(analysis["strengths"]),
        improvements=json.dumps(analysis["improvements"]),
        offer_relevance=(
            str(analysis["offer_relevance"])
            if analysis.get("offer_relevance")
            else None
        ),
        overall_score=int(analysis["overall_score"]),  # type: ignore[arg-type]
        summary=str(analysis["summary"]),
    )

    return _build_pitch_response(db_obj, transcription, analysis)


@router.post(
    "/users/{user_id}/offers/{offer_id}/pitch-analysis",
    response_model=schemas.PitchAnalysisResponse,
)
def pitch_analysis_offer(
    user_id: int,
    offer_id: int,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze an audio pitch in the context of a specific internship offer."""
    _verify_owner(user_id, current_user)

    offer = crud.get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    _validate_audio_file(file)

    audio_content = file.file.read()
    transcription = transcribe_audio(file.filename or "audio.webm", audio_content)

    analysis = analyze_pitch(
        transcription=transcription,
        offer_title=offer.title,
        company=offer.company,
        offer_description=offer.description or "",
        user_instructions=current_user.ai_instructions,
    )

    db_obj = crud.create_pitch_analysis(
        db,
        user_id=user_id,
        offer_id=offer_id,
        offer_title=offer.title,
        company=offer.company,
        transcription=transcription,
        structure_clarity=str(analysis["structure_clarity"]),
        strengths=json.dumps(analysis["strengths"]),
        improvements=json.dumps(analysis["improvements"]),
        offer_relevance=(
            str(analysis["offer_relevance"])
            if analysis.get("offer_relevance")
            else None
        ),
        overall_score=int(analysis["overall_score"]),  # type: ignore[arg-type]
        summary=str(analysis["summary"]),
    )

    return _build_pitch_response(
        db_obj, transcription, analysis, offer.title, offer.company
    )


@router.post("/transcribe-audio")
def transcribe_audio_endpoint(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    """Transcribe an audio file using Voxtral. Returns plain text."""
    _validate_audio_file(file)
    audio_content = file.file.read()
    text = transcribe_audio(file.filename or "audio.webm", audio_content)
    return {"transcription": text}


@router.get(
    "/users/{user_id}/pitch-analyses",
    response_model=list[schemas.PitchAnalysisStoredResponse],
)
def list_pitch_analyses(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    rows = crud.get_pitch_analyses(db, user_id)
    return [
        schemas.PitchAnalysisStoredResponse(
            id=r.id,
            offer_id=r.offer_id,
            offer_title=r.offer_title,
            company=r.company,
            transcription=r.transcription,
            structure_clarity=r.structure_clarity,
            strengths=json.loads(r.strengths),
            improvements=json.loads(r.improvements),
            offer_relevance=r.offer_relevance,
            overall_score=r.overall_score,
            summary=r.summary,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete("/users/{user_id}/pitch-analyses/{analysis_id}")
def delete_pitch_analysis(
    user_id: int,
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_pitch_analysis(db, analysis_id):
        raise HTTPException(status_code=404, detail="Pitch analysis not found")
    return {"detail": "Deleted"}
