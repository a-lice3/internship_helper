from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.models import User

router = APIRouter(prefix="/users/{user_id}", tags=["profile"])


def _verify_owner(user_id: int, current_user: User) -> None:
    """Raise 403 if the authenticated user does not own this resource."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------- AI Instructions ----------


@router.get("/ai-instructions", response_model=schemas.AIInstructionsResponse)
def get_ai_instructions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return schemas.AIInstructionsResponse(ai_instructions=current_user.ai_instructions)


@router.put("/ai-instructions", response_model=schemas.AIInstructionsResponse)
def update_ai_instructions(
    user_id: int,
    body: schemas.AIInstructionsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    current_user.ai_instructions = body.ai_instructions
    db.commit()
    db.refresh(current_user)
    return schemas.AIInstructionsResponse(ai_instructions=current_user.ai_instructions)


# ---------- Skills ----------


@router.post("/skills", response_model=schemas.SkillResponse)
def add_skill(
    user_id: int,
    skill: schemas.SkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_skill(db, user_id, skill)


@router.get("/skills", response_model=list[schemas.SkillResponse])
def list_skills(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_skills(db, user_id)


@router.patch("/skills/{skill_id}", response_model=schemas.SkillResponse)
def update_skill(
    skill_id: int,
    update: schemas.SkillUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = crud.update_skill(db, skill_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Skill not found")
    return result


@router.delete("/skills/{skill_id}")
def remove_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud.delete_skill(db, skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"detail": "Skill deleted"}


# ---------- Experiences ----------


@router.post("/experiences", response_model=schemas.ExperienceResponse)
def add_experience(
    user_id: int,
    exp: schemas.ExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_experience(db, user_id, exp)


@router.get("/experiences", response_model=list[schemas.ExperienceResponse])
def list_experiences(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_experiences(db, user_id)


@router.patch("/experiences/{exp_id}", response_model=schemas.ExperienceResponse)
def update_experience(
    exp_id: int,
    update: schemas.ExperienceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = crud.update_experience(db, exp_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Experience not found")
    return result


@router.delete("/experiences/{exp_id}")
def remove_experience(
    exp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud.delete_experience(db, exp_id):
        raise HTTPException(status_code=404, detail="Experience not found")
    return {"detail": "Experience deleted"}


# ---------- Education ----------


@router.post("/education", response_model=schemas.EducationResponse)
def add_education(
    user_id: int,
    edu: schemas.EducationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_education(db, user_id, edu)


@router.get("/education", response_model=list[schemas.EducationResponse])
def list_education(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_education(db, user_id)


@router.patch("/education/{edu_id}", response_model=schemas.EducationResponse)
def update_education(
    edu_id: int,
    update: schemas.EducationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = crud.update_education(db, edu_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Education not found")
    return result


@router.delete("/education/{edu_id}")
def remove_education(
    edu_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud.delete_education(db, edu_id):
        raise HTTPException(status_code=404, detail="Education not found")
    return {"detail": "Education deleted"}


# ---------- Languages ----------


@router.post("/languages", response_model=schemas.LanguageResponse)
def add_language(
    user_id: int,
    lang: schemas.LanguageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_language(db, user_id, lang)


@router.get("/languages", response_model=list[schemas.LanguageResponse])
def list_languages(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_languages(db, user_id)


@router.patch("/languages/{lang_id}", response_model=schemas.LanguageResponse)
def update_language(
    lang_id: int,
    update: schemas.LanguageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = crud.update_language(db, lang_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Language not found")
    return result


@router.delete("/languages/{lang_id}")
def remove_language(
    lang_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud.delete_language(db, lang_id):
        raise HTTPException(status_code=404, detail="Language not found")
    return {"detail": "Language deleted"}


# ---------- Extracurriculars ----------


@router.post("/extracurriculars", response_model=schemas.ExtracurricularResponse)
def add_extracurricular(
    user_id: int,
    extra: schemas.ExtracurricularCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.create_extracurricular(db, user_id, extra)


@router.get("/extracurriculars", response_model=list[schemas.ExtracurricularResponse])
def list_extracurriculars(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    return crud.get_extracurriculars(db, user_id)


@router.patch(
    "/extracurriculars/{extra_id}", response_model=schemas.ExtracurricularResponse
)
def update_extracurricular(
    extra_id: int,
    update: schemas.ExtracurricularUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = crud.update_extracurricular(db, extra_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Extracurricular not found")
    return result


@router.delete("/extracurriculars/{extra_id}")
def remove_extracurricular(
    extra_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not crud.delete_extracurricular(db, extra_id):
        raise HTTPException(status_code=404, detail="Extracurricular not found")
    return {"detail": "Extracurricular deleted"}


# ---------- Clear all ----------


@router.delete("/profile")
def clear_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all profile data (skills, experiences, education, languages, extracurriculars)."""
    _verify_owner(user_id, current_user)
    crud.clear_profile(db, user_id)
    return {"detail": "Profile cleared"}
