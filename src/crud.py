from sqlalchemy.orm import Session

from src import models, schemas

# ---------- User ----------


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


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


def delete_skill(db: Session, skill_id: int) -> bool:
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        return False
    db.delete(skill)
    db.commit()
    return True


# ---------- Project ----------


def create_project(
    db: Session, user_id: int, project: schemas.ProjectCreate
) -> models.Project:
    db_project = models.Project(
        user_id=user_id,
        title=project.title,
        description=project.description,
        technologies=project.technologies,
        link=project.link,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_projects(db: Session, user_id: int) -> list[models.Project]:
    return db.query(models.Project).filter(models.Project.user_id == user_id).all()


def delete_project(db: Session, project_id: int) -> bool:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return False
    db.delete(project)
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
        start_date=edu.start_date,
        end_date=edu.end_date,
    )
    db.add(db_edu)
    db.commit()
    db.refresh(db_edu)
    return db_edu


def get_education(db: Session, user_id: int) -> list[models.Education]:
    return db.query(models.Education).filter(models.Education.user_id == user_id).all()


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


def delete_language(db: Session, lang_id: int) -> bool:
    lang = db.query(models.Language).filter(models.Language.id == lang_id).first()
    if not lang:
        return False
    db.delete(lang)
    db.commit()
    return True


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
    db.delete(tpl)
    db.commit()
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


# ---------- CV ----------


def create_cv(db: Session, user_id: int, cv: schemas.CVCreate) -> models.CV:
    db_cv = models.CV(
        user_id=user_id,
        content=cv.content,
        company=cv.company,
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
