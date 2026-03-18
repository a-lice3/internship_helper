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


def get_templates(db: Session, user_id: int) -> list[models.CoverLetterTemplate]:
    return (
        db.query(models.CoverLetterTemplate)
        .filter(models.CoverLetterTemplate.user_id == user_id)
        .all()
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
    from datetime import date as date_type

    db_offer = models.InternshipOffer(
        user_id=user_id,
        company=offer.company,
        title=offer.title,
        description=offer.description,
        link=offer.link,
        locations=offer.locations,
        date_applied=offer.date_applied or date_type.today(),
        status=models.OfferStatus(offer.status),
    )
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer


def get_offers(
    db: Session, user_id: int, status: str | None = None
) -> list[models.InternshipOffer]:
    query = db.query(models.InternshipOffer).filter(
        models.InternshipOffer.user_id == user_id
    )
    if status:
        query = query.filter(
            models.InternshipOffer.status == models.OfferStatus(status)
        )
    return query.order_by(models.InternshipOffer.created_at.desc()).all()


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
    db.delete(offer)
    db.commit()
    return True


# ---------- CV ----------


def create_cv(db: Session, user_id: int, cv: schemas.CVCreate) -> models.CV:
    db_cv = models.CV(
        user_id=user_id,
        name=cv.name,
        content=cv.content,
        latex_content=cv.latex_content,
        support_files_dir=cv.support_files_dir,
        company=cv.company,
        job_title=cv.job_title,
        offer_id=cv.offer_id,
    )
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


def get_cvs(db: Session, user_id: int) -> list[models.CV]:
    return (
        db.query(models.CV)
        .filter(models.CV.user_id == user_id)
        .order_by(models.CV.created_at.desc())
        .all()
    )


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
    offer_id: int,
    template_id: int | None,
    offer_title: str,
    company: str,
    content: str,
) -> models.GeneratedCoverLetter:
    obj = models.GeneratedCoverLetter(
        user_id=user_id,
        offer_id=offer_id,
        template_id=template_id,
        offer_title=offer_title,
        company=company,
        content=content,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_generated_cover_letters(
    db: Session, user_id: int
) -> list[models.GeneratedCoverLetter]:
    return (
        db.query(models.GeneratedCoverLetter)
        .filter(models.GeneratedCoverLetter.user_id == user_id)
        .order_by(models.GeneratedCoverLetter.created_at.desc())
        .all()
    )


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


def get_interview_sessions(db: Session, user_id: int) -> list[models.InterviewSession]:
    return (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == user_id)
        .order_by(models.InterviewSession.created_at.desc())
        .all()
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
