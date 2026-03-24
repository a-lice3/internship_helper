import json
from datetime import date as date_type, datetime, timedelta

from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from src import models, schemas

# ---------- User ----------


def create_user(
    db: Session, user: schemas.UserCreate, hashed_password: str
) -> models.User:
    db_user = models.User(
        name=user.name, email=user.email, hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


# ---------- Skill ----------


def create_skill(db: Session, user_id: int, skill: schemas.SkillCreate) -> models.Skill:
    db_skill = models.Skill(
        user_id=user_id,
        name=skill.name,
        category=models.SkillCategory(skill.category),
        level=skill.level,
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def get_skills(db: Session, user_id: int) -> list[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.user_id == user_id).all()


def update_skill(
    db: Session, skill_id: int, update: schemas.SkillUpdate
) -> models.Skill | None:
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        if field == "category" and value is not None:
            value = models.SkillCategory(value)
        setattr(skill, field, value)
    db.commit()
    db.refresh(skill)
    return skill


def delete_skill(db: Session, skill_id: int) -> bool:
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        return False
    db.delete(skill)
    db.commit()
    return True


# ---------- Experience ----------


def create_experience(
    db: Session, user_id: int, exp: schemas.ExperienceCreate
) -> models.Experience:
    db_exp = models.Experience(
        user_id=user_id,
        title=exp.title,
        description=exp.description,
        technologies=exp.technologies,
        client=exp.client,
        start_date=exp.start_date,
        end_date=exp.end_date,
    )
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


def get_experiences(db: Session, user_id: int) -> list[models.Experience]:
    return (
        db.query(models.Experience).filter(models.Experience.user_id == user_id).all()
    )


def update_experience(
    db: Session, exp_id: int, update: schemas.ExperienceUpdate
) -> models.Experience | None:
    exp = db.query(models.Experience).filter(models.Experience.id == exp_id).first()
    if not exp:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    db.commit()
    db.refresh(exp)
    return exp


def delete_experience(db: Session, exp_id: int) -> bool:
    exp = db.query(models.Experience).filter(models.Experience.id == exp_id).first()
    if not exp:
        return False
    db.delete(exp)
    db.commit()
    return True


# ---------- Education ----------


def create_education(
    db: Session, user_id: int, edu: schemas.EducationCreate
) -> models.Education:
    db_edu = models.Education(
        user_id=user_id,
        school=edu.school,
        degree=edu.degree,
        field=edu.field,
        description=edu.description,
        start_date=edu.start_date,
        end_date=edu.end_date,
    )
    db.add(db_edu)
    db.commit()
    db.refresh(db_edu)
    return db_edu


def get_education(db: Session, user_id: int) -> list[models.Education]:
    return db.query(models.Education).filter(models.Education.user_id == user_id).all()


def update_education(
    db: Session, edu_id: int, update: schemas.EducationUpdate
) -> models.Education | None:
    edu = db.query(models.Education).filter(models.Education.id == edu_id).first()
    if not edu:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(edu, field, value)
    db.commit()
    db.refresh(edu)
    return edu


def delete_education(db: Session, edu_id: int) -> bool:
    edu = db.query(models.Education).filter(models.Education.id == edu_id).first()
    if not edu:
        return False
    db.delete(edu)
    db.commit()
    return True


# ---------- Language ----------


def create_language(
    db: Session, user_id: int, lang: schemas.LanguageCreate
) -> models.Language:
    db_lang = models.Language(
        user_id=user_id,
        language=lang.language,
        level=models.LanguageLevel(lang.level),
    )
    db.add(db_lang)
    db.commit()
    db.refresh(db_lang)
    return db_lang


def get_languages(db: Session, user_id: int) -> list[models.Language]:
    return db.query(models.Language).filter(models.Language.user_id == user_id).all()


def update_language(
    db: Session, lang_id: int, update: schemas.LanguageUpdate
) -> models.Language | None:
    lang = db.query(models.Language).filter(models.Language.id == lang_id).first()
    if not lang:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        if field == "level" and value is not None:
            value = models.LanguageLevel(value)
        setattr(lang, field, value)
    db.commit()
    db.refresh(lang)
    return lang


def delete_language(db: Session, lang_id: int) -> bool:
    lang = db.query(models.Language).filter(models.Language.id == lang_id).first()
    if not lang:
        return False
    db.delete(lang)
    db.commit()
    return True


# ---------- Extracurricular ----------


def create_extracurricular(
    db: Session, user_id: int, extra: schemas.ExtracurricularCreate
) -> models.Extracurricular:
    db_extra = models.Extracurricular(
        user_id=user_id,
        name=extra.name,
        description=extra.description,
    )
    db.add(db_extra)
    db.commit()
    db.refresh(db_extra)
    return db_extra


def get_extracurriculars(db: Session, user_id: int) -> list[models.Extracurricular]:
    return (
        db.query(models.Extracurricular)
        .filter(models.Extracurricular.user_id == user_id)
        .all()
    )


def update_extracurricular(
    db: Session, extra_id: int, update: schemas.ExtracurricularUpdate
) -> models.Extracurricular | None:
    extra = (
        db.query(models.Extracurricular)
        .filter(models.Extracurricular.id == extra_id)
        .first()
    )
    if not extra:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(extra, field, value)
    db.commit()
    db.refresh(extra)
    return extra


def delete_extracurricular(db: Session, extra_id: int) -> bool:
    extra = (
        db.query(models.Extracurricular)
        .filter(models.Extracurricular.id == extra_id)
        .first()
    )
    if not extra:
        return False
    db.delete(extra)
    db.commit()
    return True


# ---------- Clear profile ----------


def clear_profile(db: Session, user_id: int) -> None:
    """Delete all profile data for a user."""
    db.query(models.Skill).filter(models.Skill.user_id == user_id).delete()
    db.query(models.Experience).filter(models.Experience.user_id == user_id).delete()
    db.query(models.Education).filter(models.Education.user_id == user_id).delete()
    db.query(models.Language).filter(models.Language.user_id == user_id).delete()
    db.query(models.Extracurricular).filter(
        models.Extracurricular.user_id == user_id
    ).delete()
    db.commit()


# ---------- Cover Letter Template ----------


def create_template(
    db: Session, user_id: int, tpl: schemas.CoverLetterTemplateCreate
) -> models.CoverLetterTemplate:
    db_tpl = models.CoverLetterTemplate(
        user_id=user_id,
        name=tpl.name,
        content=tpl.content,
    )
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl


def create_template_from_pdf(
    db: Session, user_id: int, name: str, content: str, file_path: str
) -> models.CoverLetterTemplate:
    db_tpl = models.CoverLetterTemplate(
        user_id=user_id,
        name=name,
        content=content,
        file_path=file_path,
    )
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl


def get_templates(
    db: Session, user_id: int, skip: int = 0, limit: int | None = None
) -> list[models.CoverLetterTemplate]:
    query = db.query(models.CoverLetterTemplate).filter(
        models.CoverLetterTemplate.user_id == user_id
    )
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_templates(db: Session, user_id: int) -> int:
    return (
        db.query(models.CoverLetterTemplate)
        .filter(models.CoverLetterTemplate.user_id == user_id)
        .count()
    )


def get_template(db: Session, template_id: int) -> models.CoverLetterTemplate | None:
    return (
        db.query(models.CoverLetterTemplate)
        .filter(models.CoverLetterTemplate.id == template_id)
        .first()
    )


def delete_template(db: Session, template_id: int) -> bool:
    tpl = (
        db.query(models.CoverLetterTemplate)
        .filter(models.CoverLetterTemplate.id == template_id)
        .first()
    )
    if not tpl:
        return False
    file_path = tpl.file_path
    db.delete(tpl)
    db.commit()
    if file_path:
        from src.file_service import delete_file

        delete_file(file_path)
    return True


# ---------- Internship Offer ----------


def create_offer(
    db: Session, user_id: int, offer: schemas.InternshipOfferCreate
) -> models.InternshipOffer:
    db_offer = models.InternshipOffer(
        user_id=user_id,
        company=offer.company,
        title=offer.title,
        description=offer.description,
        link=offer.link,
        locations=offer.locations,
        date_applied=offer.date_applied,
        status=models.OfferStatus(offer.status),
    )
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer


def get_offers(
    db: Session,
    user_id: int,
    status: str | None = None,
    skip: int = 0,
    limit: int | None = None,
) -> list[models.InternshipOffer]:
    query = db.query(models.InternshipOffer).filter(
        models.InternshipOffer.user_id == user_id
    )
    if status:
        query = query.filter(
            models.InternshipOffer.status == models.OfferStatus(status)
        )
    query = query.order_by(models.InternshipOffer.created_at.desc())
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_offers(db: Session, user_id: int, status: str | None = None) -> int:
    query = db.query(models.InternshipOffer).filter(
        models.InternshipOffer.user_id == user_id
    )
    if status:
        query = query.filter(
            models.InternshipOffer.status == models.OfferStatus(status)
        )
    return query.count()


def get_offer(db: Session, offer_id: int) -> models.InternshipOffer | None:
    return (
        db.query(models.InternshipOffer)
        .filter(models.InternshipOffer.id == offer_id)
        .first()
    )


def update_offer(
    db: Session, offer_id: int, update: schemas.InternshipOfferUpdate
) -> models.InternshipOffer | None:
    db_offer = (
        db.query(models.InternshipOffer)
        .filter(models.InternshipOffer.id == offer_id)
        .first()
    )
    if not db_offer:
        return None
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value is not None:
            value = models.OfferStatus(value)
        setattr(db_offer, field, value)
    db.commit()
    db.refresh(db_offer)
    return db_offer


def delete_offer(db: Session, offer_id: int) -> bool:
    offer = (
        db.query(models.InternshipOffer)
        .filter(models.InternshipOffer.id == offer_id)
        .first()
    )
    if not offer:
        return False
    # Delete related records that lack ondelete CASCADE
    db.query(models.CVOfferAnalysis).filter(
        models.CVOfferAnalysis.offer_id == offer_id
    ).delete()
    db.query(models.GeneratedCoverLetter).filter(
        models.GeneratedCoverLetter.offer_id == offer_id
    ).delete()
    db.query(models.SkillGapAnalysis).filter(
        models.SkillGapAnalysis.offer_id == offer_id
    ).delete()
    db.delete(offer)
    db.commit()
    return True


# ---------- CV ----------


def create_cv(db: Session, user_id: int, cv: schemas.CVCreate) -> models.CV:
    # Auto-set as default if no default CV exists for this user
    has_default = (
        db.query(models.CV)
        .filter(
            models.CV.user_id == user_id, models.CV.is_default == True  # noqa: E712
        )
        .first()
        is not None
    )
    db_cv = models.CV(
        user_id=user_id,
        name=cv.name,
        content=cv.content,
        latex_content=cv.latex_content,
        support_files_dir=cv.support_files_dir,
        company=cv.company,
        job_title=cv.job_title,
        offer_id=cv.offer_id,
        is_default=not has_default,
    )
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


def get_cvs(
    db: Session, user_id: int, skip: int = 0, limit: int | None = None
) -> list[models.CV]:
    query = (
        db.query(models.CV)
        .filter(models.CV.user_id == user_id)
        .order_by(models.CV.created_at.desc())
    )
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_cvs(db: Session, user_id: int) -> int:
    return db.query(models.CV).filter(models.CV.user_id == user_id).count()


def get_cv(db: Session, cv_id: int) -> models.CV | None:
    return db.query(models.CV).filter(models.CV.id == cv_id).first()


def create_cv_from_file(
    db: Session,
    user_id: int,
    name: str,
    content: str,
    file_path: str,
    latex_content: str | None = None,
    support_files_dir: str | None = None,
    company: str | None = None,
    job_title: str | None = None,
    offer_id: int | None = None,
) -> models.CV:
    # Auto-set as default if no default CV exists for this user
    has_default = (
        db.query(models.CV)
        .filter(
            models.CV.user_id == user_id, models.CV.is_default == True  # noqa: E712
        )
        .first()
        is not None
    )
    db_cv = models.CV(
        user_id=user_id,
        name=name,
        content=content,
        latex_content=latex_content,
        file_path=file_path,
        support_files_dir=support_files_dir,
        company=company,
        job_title=job_title,
        offer_id=offer_id,
        is_default=not has_default,
    )
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


def update_cv(db: Session, cv_id: int, update: schemas.CVUpdate) -> models.CV | None:
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
    if not cv:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(cv, field, value)
    db.commit()
    db.refresh(cv)
    return cv


def set_default_cv(db: Session, user_id: int, cv_id: int) -> models.CV | None:
    """Set a CV as default, removing default from all other CVs for this user.
    Cannot unset — must always have exactly one default CV."""
    cv = (
        db.query(models.CV)
        .filter(models.CV.id == cv_id, models.CV.user_id == user_id)
        .first()
    )
    if not cv:
        return None
    # Unset all other defaults for this user
    db.query(models.CV).filter(
        models.CV.user_id == user_id, models.CV.id != cv_id
    ).update({"is_default": False})
    cv.is_default = True
    db.commit()
    db.refresh(cv)
    return cv


def get_default_cv(db: Session, user_id: int) -> models.CV | None:
    return (
        db.query(models.CV)
        .filter(
            models.CV.user_id == user_id, models.CV.is_default == True  # noqa: E712
        )
        .first()
    )


def delete_cv(db: Session, cv_id: int) -> bool:
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
    if not cv:
        return False
    file_path = cv.file_path
    db.delete(cv)
    db.commit()
    if file_path:
        from src.file_service import delete_file

        delete_file(file_path)
    return True


def create_adapted_cv(
    db: Session, user_id: int, offer_id: int, company: str, content: str
) -> models.CV:
    db_cv = models.CV(
        user_id=user_id,
        offer_id=offer_id,
        company=company,
        content=content,
        is_adapted=True,
    )
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


# ---------- Generated Cover Letter ----------


def create_generated_cover_letter(
    db: Session,
    user_id: int,
    offer_id: int | None,
    template_id: int | None,
    offer_title: str | None,
    company: str | None,
    content: str,
    name: str | None = None,
    saved: bool = False,
) -> models.GeneratedCoverLetter:
    obj = models.GeneratedCoverLetter(
        user_id=user_id,
        offer_id=offer_id,
        template_id=template_id,
        name=name,
        offer_title=offer_title,
        company=company,
        content=content,
        saved=saved,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_generated_cover_letter(
    db: Session, letter_id: int
) -> models.GeneratedCoverLetter | None:
    return (
        db.query(models.GeneratedCoverLetter)
        .filter(models.GeneratedCoverLetter.id == letter_id)
        .first()
    )


def get_generated_cover_letters(
    db: Session, user_id: int, saved_only: bool = False
) -> list[models.GeneratedCoverLetter]:
    q = db.query(models.GeneratedCoverLetter).filter(
        models.GeneratedCoverLetter.user_id == user_id
    )
    if saved_only:
        q = q.filter(models.GeneratedCoverLetter.saved.is_(True))
    return q.order_by(models.GeneratedCoverLetter.created_at.desc()).all()


def update_generated_cover_letter(
    db: Session,
    letter_id: int,
    content: str | None = None,
    saved: bool | None = None,
) -> models.GeneratedCoverLetter | None:
    obj = (
        db.query(models.GeneratedCoverLetter)
        .filter(models.GeneratedCoverLetter.id == letter_id)
        .first()
    )
    if not obj:
        return None
    if content is not None:
        obj.content = content
    if saved is not None:
        obj.saved = saved
    db.commit()
    db.refresh(obj)
    return obj


def delete_generated_cover_letter(db: Session, letter_id: int) -> bool:
    obj = (
        db.query(models.GeneratedCoverLetter)
        .filter(models.GeneratedCoverLetter.id == letter_id)
        .first()
    )
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- Skill Gap Analysis ----------


def create_skill_gap_analysis(
    db: Session,
    user_id: int,
    offer_id: int,
    offer_title: str,
    company: str,
    missing_hard_skills: str,
    missing_soft_skills: str,
    recommendations: str,
) -> models.SkillGapAnalysis:
    obj = models.SkillGapAnalysis(
        user_id=user_id,
        offer_id=offer_id,
        offer_title=offer_title,
        company=company,
        missing_hard_skills=missing_hard_skills,
        missing_soft_skills=missing_soft_skills,
        recommendations=recommendations,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_skill_gap_analyses(db: Session, user_id: int) -> list[models.SkillGapAnalysis]:
    return (
        db.query(models.SkillGapAnalysis)
        .filter(models.SkillGapAnalysis.user_id == user_id)
        .order_by(models.SkillGapAnalysis.created_at.desc())
        .all()
    )


def delete_skill_gap_analysis(db: Session, analysis_id: int) -> bool:
    obj = (
        db.query(models.SkillGapAnalysis)
        .filter(models.SkillGapAnalysis.id == analysis_id)
        .first()
    )
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- Pitch Analysis ----------


def create_pitch_analysis(
    db: Session,
    user_id: int,
    offer_id: int | None,
    offer_title: str | None,
    company: str | None,
    transcription: str,
    structure_clarity: str,
    strengths: str,
    improvements: str,
    offer_relevance: str | None,
    overall_score: int,
    summary: str,
) -> models.PitchAnalysis:
    obj = models.PitchAnalysis(
        user_id=user_id,
        offer_id=offer_id,
        offer_title=offer_title,
        company=company,
        transcription=transcription,
        structure_clarity=structure_clarity,
        strengths=strengths,
        improvements=improvements,
        offer_relevance=offer_relevance,
        overall_score=overall_score,
        summary=summary,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_pitch_analyses(db: Session, user_id: int) -> list[models.PitchAnalysis]:
    return (
        db.query(models.PitchAnalysis)
        .filter(models.PitchAnalysis.user_id == user_id)
        .order_by(models.PitchAnalysis.created_at.desc())
        .all()
    )


def delete_pitch_analysis(db: Session, analysis_id: int) -> bool:
    obj = (
        db.query(models.PitchAnalysis)
        .filter(models.PitchAnalysis.id == analysis_id)
        .first()
    )
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- Interview Session ----------


def create_interview_session(
    db: Session,
    user_id: int,
    session_id: str,
    interview_type: str,
    difficulty: str,
    language: str,
    duration_minutes: int,
    enable_hints: bool,
    offer_id: int | None = None,
    offer_title: str | None = None,
    company: str | None = None,
) -> models.InterviewSession:
    obj = models.InterviewSession(
        session_id=session_id,
        user_id=user_id,
        offer_id=offer_id,
        interview_type=models.InterviewType(interview_type),
        difficulty=models.InterviewDifficulty(difficulty),
        language=language,
        duration_minutes=duration_minutes,
        enable_hints=enable_hints,
        offer_title=offer_title,
        company=company,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_interview_session(
    db: Session, session_id: str
) -> models.InterviewSession | None:
    return (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.session_id == session_id)
        .first()
    )


def get_interview_session_by_pk(db: Session, pk: int) -> models.InterviewSession | None:
    return (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.id == pk)
        .first()
    )


def get_interview_sessions(
    db: Session, user_id: int, skip: int = 0, limit: int | None = None
) -> list[models.InterviewSession]:
    query = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .order_by(models.InterviewSession.created_at.desc())
    )
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_interview_sessions(db: Session, user_id: int) -> int:
    return (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .count()
    )


def update_interview_session_status(
    db: Session, session_id: str, status: str
) -> models.InterviewSession | None:
    from datetime import datetime as dt

    obj = get_interview_session(db, session_id)
    if not obj:
        return None
    obj.status = models.InterviewSessionStatus(status)
    if status == "active" and obj.started_at is None:
        obj.started_at = dt.utcnow()
    if status in ("completed", "analyzed"):
        obj.ended_at = dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def delete_interview_session(db: Session, pk: int) -> bool:
    obj = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.id == pk)
        .first()
    )
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- Interview Turn ----------


def create_interview_turn(
    db: Session,
    session_pk: int,
    turn_number: int,
    question_text: str,
    question_category: str | None = None,
) -> models.InterviewTurn:
    obj = models.InterviewTurn(
        session_id=session_pk,
        turn_number=turn_number,
        question_text=question_text,
        question_category=question_category,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_interview_turn_answer(
    db: Session,
    turn_id: int,
    answer_transcript: str,
    answer_duration_seconds: int | None = None,
    skipped: bool = False,
) -> models.InterviewTurn | None:
    obj = (
        db.query(models.InterviewTurn)
        .filter(models.InterviewTurn.id == turn_id)
        .first()
    )
    if not obj:
        return None
    obj.answer_transcript = answer_transcript
    obj.answer_duration_seconds = answer_duration_seconds
    obj.skipped = skipped
    db.commit()
    db.refresh(obj)
    return obj


def update_interview_turn_scores(
    db: Session,
    turn_id: int,
    clarity_score: int | None,
    relevance_score: int | None,
    structure_score: int | None,
    feedback: str | None,
    better_answer: str | None,
) -> models.InterviewTurn | None:
    obj = (
        db.query(models.InterviewTurn)
        .filter(models.InterviewTurn.id == turn_id)
        .first()
    )
    if not obj:
        return None
    obj.clarity_score = clarity_score
    obj.relevance_score = relevance_score
    obj.structure_score = structure_score
    obj.feedback = feedback
    obj.better_answer = better_answer
    db.commit()
    db.refresh(obj)
    return obj


def get_interview_turns(db: Session, session_pk: int) -> list[models.InterviewTurn]:
    return (
        db.query(models.InterviewTurn)
        .filter(models.InterviewTurn.session_id == session_pk)
        .order_by(models.InterviewTurn.turn_number)
        .all()
    )


# ---------- Interview Analysis ----------


def create_interview_analysis(
    db: Session,
    session_pk: int,
    overall_score: int,
    communication_score: int,
    confidence_score: int,
    strengths: str,
    weaknesses: str,
    improvements: str,
    summary: str,
    technical_score: int | None = None,
    behavioral_score: int | None = None,
    filler_words_analysis: str | None = None,
    star_method_usage: str | None = None,
    full_transcript: str | None = None,
) -> models.InterviewAnalysis:
    obj = models.InterviewAnalysis(
        session_id=session_pk,
        overall_score=overall_score,
        communication_score=communication_score,
        technical_score=technical_score,
        behavioral_score=behavioral_score,
        confidence_score=confidence_score,
        strengths=strengths,
        weaknesses=weaknesses,
        improvements=improvements,
        summary=summary,
        filler_words_analysis=filler_words_analysis,
        star_method_usage=star_method_usage,
        full_transcript=full_transcript,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_interview_analysis(
    db: Session, session_pk: int
) -> models.InterviewAnalysis | None:
    return (
        db.query(models.InterviewAnalysis)
        .filter(models.InterviewAnalysis.session_id == session_pk)
        .first()
    )


# ---------- Scraped Offers ----------


def create_scraped_offer(
    db: Session,
    user_id: int,
    source: str,
    source_id: str,
    company: str,
    title: str,
    description: str | None,
    locations: str | None,
    link: str | None,
    contract_type: str | None,
    salary: str | None,
    published_at: str | None,
    match_score: float | None,
    match_reasons: str | None,
) -> models.ScrapedOffer:
    obj = models.ScrapedOffer(
        user_id=user_id,
        source=source,
        source_id=source_id,
        company=company,
        title=title,
        description=description,
        locations=locations,
        link=link,
        contract_type=contract_type,
        salary=salary,
        published_at=published_at,
        match_score=match_score,
        match_reasons=match_reasons,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_scraped_offers(
    db: Session, user_id: int, skip: int = 0, limit: int | None = None
) -> list[models.ScrapedOffer]:
    query = (
        db.query(models.ScrapedOffer)
        .filter(models.ScrapedOffer.user_id == user_id)
        .order_by(models.ScrapedOffer.match_score.desc().nullslast())
    )
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_scraped_offers(db: Session, user_id: int) -> int:
    return (
        db.query(models.ScrapedOffer)
        .filter(models.ScrapedOffer.user_id == user_id)
        .count()
    )


def get_scraped_offer(db: Session, offer_id: int) -> models.ScrapedOffer | None:
    return (
        db.query(models.ScrapedOffer).filter(models.ScrapedOffer.id == offer_id).first()
    )


def delete_scraped_offer(db: Session, offer_id: int) -> bool:
    obj = (
        db.query(models.ScrapedOffer).filter(models.ScrapedOffer.id == offer_id).first()
    )
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def clear_scraped_offers(db: Session, user_id: int) -> int:
    """Delete all scraped offers for a user. Returns count deleted."""
    count = (
        db.query(models.ScrapedOffer)
        .filter(models.ScrapedOffer.user_id == user_id)
        .delete()
    )
    db.commit()
    return count


def save_scraped_offer_to_tracker(
    db: Session, scraped_offer: models.ScrapedOffer, user_id: int
) -> models.InternshipOffer:
    """Copy a scraped offer into the user's internship offer tracker."""
    db_offer = models.InternshipOffer(
        user_id=user_id,
        company=scraped_offer.company,
        title=scraped_offer.title,
        description=scraped_offer.description,
        link=scraped_offer.link,
        locations=scraped_offer.locations,
        status=models.OfferStatus.bookmarked,
    )
    db.add(db_offer)
    scraped_offer.saved = True
    db.commit()
    db.refresh(db_offer)
    return db_offer


# ---------- Reminder ----------


def create_reminder(
    db: Session, user_id: int, reminder: schemas.ReminderCreate
) -> models.Reminder:
    db_reminder = models.Reminder(
        user_id=user_id,
        offer_id=reminder.offer_id,
        reminder_type=models.ReminderType(reminder.reminder_type),
        title=reminder.title,
        description=reminder.description,
        due_at=reminder.due_at,
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder


def get_reminders(
    db: Session,
    user_id: int,
    include_done: bool = False,
    skip: int = 0,
    limit: int | None = None,
) -> list[models.Reminder]:
    query = db.query(models.Reminder).filter(models.Reminder.user_id == user_id)
    if not include_done:
        query = query.filter(models.Reminder.is_done == False)  # noqa: E712
    query = query.order_by(models.Reminder.due_at.asc())
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_reminders(db: Session, user_id: int, include_done: bool = False) -> int:
    query = db.query(models.Reminder).filter(models.Reminder.user_id == user_id)
    if not include_done:
        query = query.filter(models.Reminder.is_done == False)  # noqa: E712
    return query.count()


def get_upcoming_reminders(
    db: Session, user_id: int, limit: int = 5
) -> list[models.Reminder]:
    now = datetime.utcnow()
    return (
        db.query(models.Reminder)
        .filter(
            models.Reminder.user_id == user_id,
            models.Reminder.is_done == False,  # noqa: E712
            models.Reminder.due_at >= now,
        )
        .order_by(models.Reminder.due_at.asc())
        .limit(limit)
        .all()
    )


def get_reminder(db: Session, reminder_id: int) -> models.Reminder | None:
    return db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()


def update_reminder(
    db: Session, reminder_id: int, update: schemas.ReminderUpdate
) -> models.Reminder | None:
    reminder = (
        db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    )
    if not reminder:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        if field == "reminder_type" and value is not None:
            value = models.ReminderType(value)
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder_id: int) -> bool:
    reminder = (
        db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    )
    if not reminder:
        return False
    db.delete(reminder)
    db.commit()
    return True


# ---------- Offer Note ----------


def create_offer_note(
    db: Session, user_id: int, offer_id: int, note: schemas.OfferNoteCreate
) -> models.OfferNote:
    db_note = models.OfferNote(
        user_id=user_id,
        offer_id=offer_id,
        content=note.content,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


def get_offer_notes(
    db: Session, offer_id: int, skip: int = 0, limit: int | None = None
) -> list[models.OfferNote]:
    query = (
        db.query(models.OfferNote)
        .filter(models.OfferNote.offer_id == offer_id)
        .order_by(models.OfferNote.created_at.desc())
    )
    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def count_offer_notes(db: Session, offer_id: int) -> int:
    return (
        db.query(models.OfferNote).filter(models.OfferNote.offer_id == offer_id).count()
    )


def get_offer_note(db: Session, note_id: int) -> models.OfferNote | None:
    return db.query(models.OfferNote).filter(models.OfferNote.id == note_id).first()


def update_offer_note(
    db: Session, note_id: int, update: schemas.OfferNoteUpdate
) -> models.OfferNote | None:
    note = db.query(models.OfferNote).filter(models.OfferNote.id == note_id).first()
    if not note:
        return None
    note.content = update.content
    db.commit()
    db.refresh(note)
    return note


def delete_offer_note(db: Session, note_id: int) -> bool:
    note = db.query(models.OfferNote).filter(models.OfferNote.id == note_id).first()
    if not note:
        return False
    db.delete(note)
    db.commit()
    return True


# ---------- Dashboard ----------


def get_offers_by_status_counts(db: Session, user_id: int) -> dict[str, int]:
    rows = (
        db.query(models.InternshipOffer.status, sqlfunc.count())
        .filter(models.InternshipOffer.user_id == user_id)
        .group_by(models.InternshipOffer.status)
        .all()
    )
    return {status.value: count for status, count in rows}


def get_average_interview_score(db: Session, user_id: int) -> float | None:
    result = (
        db.query(sqlfunc.avg(models.InterviewAnalysis.overall_score))
        .join(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .scalar()
    )
    return round(float(result), 1) if result else None


def get_interview_sessions_count(db: Session, user_id: int) -> int:
    return (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .count()
    )


def get_interview_sessions_this_week(db: Session, user_id: int) -> int:
    week_ago = datetime.utcnow() - timedelta(days=7)
    return (
        db.query(models.InterviewSession)
        .filter(
            models.InterviewSession.user_id == user_id,
            models.InterviewSession.created_at >= week_ago,
        )
        .count()
    )


def get_recent_activity(db: Session, user_id: int, limit: int = 10) -> list[dict]:
    activities: list[dict] = []

    # Recent offers
    recent_offers = (
        db.query(models.InternshipOffer)
        .filter(models.InternshipOffer.user_id == user_id)
        .order_by(models.InternshipOffer.created_at.desc())
        .limit(limit)
        .all()
    )
    for o in recent_offers:
        activities.append(
            {
                "type": "offer",
                "id": o.id,
                "offer_id": o.id,
                "title": f"{o.company} — {o.title}",
                "status": o.status.value,
                "date": o.created_at.isoformat() if o.created_at else None,
            }
        )

    # Recent interview sessions
    recent_sessions = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .order_by(models.InterviewSession.created_at.desc())
        .limit(limit)
        .all()
    )
    for s in recent_sessions:
        activities.append(
            {
                "type": "interview",
                "id": s.id,
                "offer_id": s.offer_id,
                "title": f"Interview: {s.offer_title or 'General'} ({s.interview_type.value})",
                "status": s.status.value,
                "date": s.created_at.isoformat() if s.created_at else None,
            }
        )

    # Recent reminders
    recent_reminders = (
        db.query(models.Reminder)
        .filter(models.Reminder.user_id == user_id)
        .order_by(models.Reminder.created_at.desc())
        .limit(limit)
        .all()
    )
    for r in recent_reminders:
        activities.append(
            {
                "type": "reminder",
                "id": r.id,
                "offer_id": r.offer_id,
                "title": r.title,
                "status": "done" if r.is_done else "pending",
                "date": r.created_at.isoformat() if r.created_at else None,
            }
        )

    # Sort by date descending and return top N
    activities.sort(key=lambda a: a.get("date") or "", reverse=True)
    return activities[:limit]


# ---------- Calendar ----------


def get_calendar_events(
    db: Session, user_id: int, start_date: datetime, end_date: datetime
) -> list[dict]:
    events: list[dict] = []

    # Offers with date_applied in range
    offers = (
        db.query(models.InternshipOffer)
        .filter(
            models.InternshipOffer.user_id == user_id,
            models.InternshipOffer.date_applied.isnot(None),
            models.InternshipOffer.date_applied >= start_date.date(),
            models.InternshipOffer.date_applied <= end_date.date(),
        )
        .all()
    )
    for o in offers:
        if o.date_applied is None:
            continue
        events.append(
            {
                "id": f"offer_{o.id}",
                "event_type": "application",
                "title": f"{o.company} — {o.title}",
                "date": datetime.combine(
                    o.date_applied, datetime.min.time()
                ).isoformat(),
                "offer_id": o.id,
                "company": o.company,
                "metadata": {"status": o.status.value},
            }
        )

    # Reminders in range
    reminders = (
        db.query(models.Reminder)
        .filter(
            models.Reminder.user_id == user_id,
            models.Reminder.due_at >= start_date,
            models.Reminder.due_at <= end_date,
        )
        .all()
    )
    for r in reminders:
        events.append(
            {
                "id": f"reminder_{r.id}",
                "event_type": "reminder",
                "title": r.title,
                "date": r.due_at.isoformat(),
                "offer_id": r.offer_id,
                "company": None,
                "metadata": {
                    "reminder_type": r.reminder_type.value,
                    "is_done": r.is_done,
                },
            }
        )

    # Interview sessions in range
    sessions = (
        db.query(models.InterviewSession)
        .filter(
            models.InterviewSession.user_id == user_id,
            models.InterviewSession.created_at >= start_date,
            models.InterviewSession.created_at <= end_date,
        )
        .all()
    )
    for s in sessions:
        dt = s.started_at or s.created_at
        events.append(
            {
                "id": f"interview_{s.id}",
                "event_type": "interview",
                "title": f"Interview: {s.offer_title or 'General'}",
                "date": dt.isoformat() if dt else None,
                "offer_id": s.offer_id,
                "company": s.company,
                "metadata": {"status": s.status.value, "type": s.interview_type.value},
            }
        )

    events.sort(key=lambda e: e.get("date") or "")
    return events


# ---------- CV General Analysis (persisted) ----------


def create_or_update_cv_general_analysis(
    db: Session,
    user_id: int,
    cv_id: int,
    score: int,
    summary: str,
    strengths: str,
    improvements: str,
) -> models.CVGeneralAnalysis:
    """Create or replace the general analysis for a CV."""
    existing = (
        db.query(models.CVGeneralAnalysis)
        .filter(
            models.CVGeneralAnalysis.user_id == user_id,
            models.CVGeneralAnalysis.cv_id == cv_id,
        )
        .first()
    )
    if existing:
        existing.score = score
        existing.summary = summary
        existing.strengths = strengths
        existing.improvements = improvements
        db.commit()
        db.refresh(existing)
        return existing
    obj = models.CVGeneralAnalysis(
        user_id=user_id,
        cv_id=cv_id,
        score=score,
        summary=summary,
        strengths=strengths,
        improvements=improvements,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_cv_general_analyses(
    db: Session, user_id: int
) -> list[models.CVGeneralAnalysis]:
    return (
        db.query(models.CVGeneralAnalysis)
        .filter(models.CVGeneralAnalysis.user_id == user_id)
        .order_by(models.CVGeneralAnalysis.created_at.desc())
        .all()
    )


# ---------- CV Offer Analysis (persisted) ----------


def create_or_update_cv_offer_analysis(
    db: Session,
    user_id: int,
    offer_id: int,
    cv_id: int,
    offer_title: str,
    company: str,
    score: int,
    suggested_title: str | None,
    suggested_profile: str | None,
    other_suggestions: str,
) -> models.CVOfferAnalysis:
    existing = (
        db.query(models.CVOfferAnalysis)
        .filter(
            models.CVOfferAnalysis.user_id == user_id,
            models.CVOfferAnalysis.offer_id == offer_id,
            models.CVOfferAnalysis.cv_id == cv_id,
        )
        .first()
    )
    if existing:
        existing.score = score
        existing.suggested_title = suggested_title
        existing.suggested_profile = suggested_profile
        existing.other_suggestions = other_suggestions
        existing.created_at = sqlfunc.now()
        db.commit()
        db.refresh(existing)
        return existing
    obj = models.CVOfferAnalysis(
        user_id=user_id,
        offer_id=offer_id,
        cv_id=cv_id,
        offer_title=offer_title,
        company=company,
        score=score,
        suggested_title=suggested_title,
        suggested_profile=suggested_profile,
        other_suggestions=other_suggestions,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_cv_offer_analyses(db: Session, user_id: int) -> list[models.CVOfferAnalysis]:
    return (
        db.query(models.CVOfferAnalysis)
        .filter(models.CVOfferAnalysis.user_id == user_id)
        .order_by(models.CVOfferAnalysis.created_at.desc())
        .all()
    )


# ---------- Memo ----------


def create_memo(db: Session, user_id: int, memo: schemas.MemoCreate) -> models.Memo:
    db_memo = models.Memo(
        user_id=user_id,
        title=memo.title,
        content=memo.content,
        tags=json.dumps(memo.tags) if memo.tags else None,
        offer_id=memo.offer_id,
        skill_name=memo.skill_name,
    )
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo


def _memos_query(
    db: Session,
    user_id: int,
    search: str | None = None,
    tag: str | None = None,
    offer_id: int | None = None,
    favorites_only: bool = False,
):
    q = db.query(models.Memo).filter(models.Memo.user_id == user_id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (models.Memo.title.ilike(pattern)) | (models.Memo.content.ilike(pattern))
        )
    if tag:
        q = q.filter(models.Memo.tags.ilike(f'%"{tag}"%'))
    if offer_id is not None:
        q = q.filter(models.Memo.offer_id == offer_id)
    if favorites_only:
        q = q.filter(models.Memo.is_favorite.is_(True))
    return q


def get_memos(
    db: Session,
    user_id: int,
    search: str | None = None,
    tag: str | None = None,
    offer_id: int | None = None,
    favorites_only: bool = False,
    skip: int = 0,
    limit: int | None = None,
) -> list[models.Memo]:
    q = _memos_query(db, user_id, search, tag, offer_id, favorites_only)
    q = q.order_by(models.Memo.updated_at.desc())
    if skip:
        q = q.offset(skip)
    if limit is not None:
        q = q.limit(limit)
    return q.all()


def count_memos(
    db: Session,
    user_id: int,
    search: str | None = None,
    tag: str | None = None,
    offer_id: int | None = None,
    favorites_only: bool = False,
) -> int:
    return _memos_query(db, user_id, search, tag, offer_id, favorites_only).count()


def get_memo(db: Session, memo_id: int) -> models.Memo | None:
    return db.query(models.Memo).filter(models.Memo.id == memo_id).first()


def update_memo(
    db: Session, memo_id: int, update: schemas.MemoUpdate
) -> models.Memo | None:
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not memo:
        return None
    data = update.model_dump(exclude_unset=True)
    if "tags" in data and data["tags"] is not None:
        data["tags"] = json.dumps(data["tags"])
    for field, value in data.items():
        setattr(memo, field, value)
    db.commit()
    db.refresh(memo)
    return memo


def delete_memo(db: Session, memo_id: int) -> bool:
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not memo:
        return False
    db.delete(memo)
    db.commit()
    return True


def get_memo_count(db: Session, user_id: int) -> int:
    return db.query(models.Memo).filter(models.Memo.user_id == user_id).count()


# ---------- Skill Recommendations ----------


def compute_skill_recommendations(
    db: Session, user_id: int
) -> models.SkillRecommendation:
    analyses = (
        db.query(models.SkillGapAnalysis)
        .filter(models.SkillGapAnalysis.user_id == user_id)
        .all()
    )

    freq_map: dict[str, dict] = {}
    for a in analyses:
        for skill_type, raw in [
            ("hard", a.missing_hard_skills),
            ("soft", a.missing_soft_skills),
        ]:
            try:
                skills = json.loads(raw) if isinstance(raw, str) else raw
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(skills, list):
                continue
            for skill_name in skills:
                if not isinstance(skill_name, str):
                    continue
                key = skill_name.lower().strip()
                if key not in freq_map:
                    freq_map[key] = {
                        "skill_name": skill_name.strip(),
                        "frequency": 0,
                        "skill_type": skill_type,
                        "offer_titles": [],
                    }
                freq_map[key]["frequency"] += 1
                title = f"{a.offer_title} @ {a.company}"
                if title not in freq_map[key]["offer_titles"]:
                    freq_map[key]["offer_titles"].append(title)

    user_skills = {
        s.name.lower().strip()
        for s in db.query(models.Skill).filter(models.Skill.user_id == user_id).all()
    }

    aggregated = []
    for key, data in freq_map.items():
        data["user_has_skill"] = key in user_skills
        aggregated.append(data)

    aggregated.sort(key=lambda x: x["frequency"], reverse=True)

    existing = (
        db.query(models.SkillRecommendation)
        .filter(models.SkillRecommendation.user_id == user_id)
        .first()
    )
    if existing:
        existing.aggregated_skills = json.dumps(aggregated)
        existing.offers_analyzed_count = len(analyses)
        existing.generated_at = datetime.utcnow()
    else:
        existing = models.SkillRecommendation(
            user_id=user_id,
            aggregated_skills=json.dumps(aggregated),
            offers_analyzed_count=len(analyses),
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def get_skill_recommendations(
    db: Session, user_id: int
) -> models.SkillRecommendation | None:
    return (
        db.query(models.SkillRecommendation)
        .filter(models.SkillRecommendation.user_id == user_id)
        .first()
    )


# ---------- Goal ----------


def create_goal(db: Session, user_id: int, goal: schemas.GoalCreate) -> models.Goal:
    db_goal = models.Goal(
        user_id=user_id,
        title=goal.title,
        frequency=models.GoalFrequency(goal.frequency),
        target_count=goal.target_count,
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal


def get_goals(
    db: Session,
    user_id: int,
    active_only: bool = True,
    skip: int = 0,
    limit: int | None = None,
) -> list[models.Goal]:
    q = db.query(models.Goal).filter(models.Goal.user_id == user_id)
    if active_only:
        q = q.filter(models.Goal.is_active.is_(True))
    q = q.order_by(models.Goal.created_at.desc())
    if skip:
        q = q.offset(skip)
    if limit is not None:
        q = q.limit(limit)
    return q.all()


def count_goals(db: Session, user_id: int, active_only: bool = True) -> int:
    q = db.query(models.Goal).filter(models.Goal.user_id == user_id)
    if active_only:
        q = q.filter(models.Goal.is_active.is_(True))
    return q.count()


def update_goal(
    db: Session, goal_id: int, update: schemas.GoalUpdate
) -> models.Goal | None:
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        return None
    data = update.model_dump(exclude_unset=True)
    if "frequency" in data and data["frequency"] is not None:
        data["frequency"] = models.GoalFrequency(data["frequency"])
    for field, value in data.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal_id: int) -> bool:
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        return False
    db.delete(goal)
    db.commit()
    return True


# ---------- Goal Progress ----------


def log_goal_progress(
    db: Session,
    goal_id: int,
    user_id: int,
    progress_date: date_type,
    completed_count: int,
    notes: str | None = None,
) -> models.GoalProgress:
    existing = (
        db.query(models.GoalProgress)
        .filter(
            models.GoalProgress.goal_id == goal_id,
            models.GoalProgress.date == progress_date,
        )
        .first()
    )
    if existing:
        existing.completed_count = completed_count
        if notes is not None:
            existing.notes = notes
    else:
        existing = models.GoalProgress(
            goal_id=goal_id,
            user_id=user_id,
            date=progress_date,
            completed_count=completed_count,
            notes=notes,
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def get_goal_progress(
    db: Session,
    goal_id: int,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[models.GoalProgress]:
    q = db.query(models.GoalProgress).filter(models.GoalProgress.goal_id == goal_id)
    if start_date:
        q = q.filter(models.GoalProgress.date >= start_date)
    if end_date:
        q = q.filter(models.GoalProgress.date <= end_date)
    return q.order_by(models.GoalProgress.date.desc()).all()


def compute_streak(db: Session, goal_id: int) -> int:
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        return 0
    entries = (
        db.query(models.GoalProgress)
        .filter(models.GoalProgress.goal_id == goal_id)
        .order_by(models.GoalProgress.date.desc())
        .all()
    )
    if not entries:
        return 0

    streak = 0
    expected = date_type.today()
    for entry in entries:
        if entry.date == expected and entry.completed_count >= goal.target_count:
            streak += 1
            expected -= timedelta(days=1)
        elif entry.date < expected:
            break
        else:
            continue
    return streak


def get_daily_goals_summary(db: Session, user_id: int, summary_date: date_type) -> dict:
    goals = get_goals(db, user_id, active_only=True)
    goal_data = []
    completed_count = 0
    max_streak = 0

    for goal in goals:
        progress = (
            db.query(models.GoalProgress)
            .filter(
                models.GoalProgress.goal_id == goal.id,
                models.GoalProgress.date == summary_date,
            )
            .first()
        )
        today_completed = progress.completed_count if progress else 0
        streak = compute_streak(db, goal.id)
        if streak > max_streak:
            max_streak = streak
        if today_completed >= goal.target_count:
            completed_count += 1
        goal_data.append(
            {
                "id": goal.id,
                "title": goal.title,
                "frequency": goal.frequency.value,
                "target_count": goal.target_count,
                "is_active": goal.is_active,
                "created_at": goal.created_at,
                "today_completed": today_completed,
                "current_streak": streak,
            }
        )

    return {
        "goals": goal_data,
        "total_goals": len(goals),
        "completed_today": completed_count,
        "longest_streak": max_streak,
    }
