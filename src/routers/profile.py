from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db

router = APIRouter(prefix="/users/{user_id}", tags=["profile"])


# ---------- AI Instructions ----------


@router.get("/ai-instructions", response_model=schemas.AIInstructionsResponse)
def get_ai_instructions(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return schemas.AIInstructionsResponse(ai_instructions=user.ai_instructions)


@router.put("/ai-instructions", response_model=schemas.AIInstructionsResponse)
def update_ai_instructions(
    user_id: int,
    body: schemas.AIInstructionsUpdate,
    db: Session = Depends(get_db),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.ai_instructions = body.ai_instructions
    db.commit()
    db.refresh(user)
    return schemas.AIInstructionsResponse(ai_instructions=user.ai_instructions)


# ---------- Skills ----------


@router.post("/skills", response_model=schemas.SkillResponse)
def add_skill(user_id: int, skill: schemas.SkillCreate, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_skill(db, user_id, skill)


@router.get("/skills", response_model=list[schemas.SkillResponse])
def list_skills(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_skills(db, user_id)


@router.patch("/skills/{skill_id}", response_model=schemas.SkillResponse)
def update_skill(
    skill_id: int, update: schemas.SkillUpdate, db: Session = Depends(get_db)
):
    result = crud.update_skill(db, skill_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Skill not found")
    return result


@router.delete("/skills/{skill_id}")
def remove_skill(skill_id: int, db: Session = Depends(get_db)):
    if not crud.delete_skill(db, skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"detail": "Skill deleted"}


# ---------- Experiences ----------


@router.post("/experiences", response_model=schemas.ExperienceResponse)
def add_experience(
    user_id: int, exp: schemas.ExperienceCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_experience(db, user_id, exp)


@router.get("/experiences", response_model=list[schemas.ExperienceResponse])
def list_experiences(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_experiences(db, user_id)


@router.patch("/experiences/{exp_id}", response_model=schemas.ExperienceResponse)
def update_experience(
    exp_id: int, update: schemas.ExperienceUpdate, db: Session = Depends(get_db)
):
    result = crud.update_experience(db, exp_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Experience not found")
    return result


@router.delete("/experiences/{exp_id}")
def remove_experience(exp_id: int, db: Session = Depends(get_db)):
    if not crud.delete_experience(db, exp_id):
        raise HTTPException(status_code=404, detail="Experience not found")
    return {"detail": "Experience deleted"}


# ---------- Education ----------


@router.post("/education", response_model=schemas.EducationResponse)
def add_education(
    user_id: int, edu: schemas.EducationCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_education(db, user_id, edu)


@router.get("/education", response_model=list[schemas.EducationResponse])
def list_education(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_education(db, user_id)


@router.patch("/education/{edu_id}", response_model=schemas.EducationResponse)
def update_education(
    edu_id: int, update: schemas.EducationUpdate, db: Session = Depends(get_db)
):
    result = crud.update_education(db, edu_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Education not found")
    return result


@router.delete("/education/{edu_id}")
def remove_education(edu_id: int, db: Session = Depends(get_db)):
    if not crud.delete_education(db, edu_id):
        raise HTTPException(status_code=404, detail="Education not found")
    return {"detail": "Education deleted"}


# ---------- Languages ----------


@router.post("/languages", response_model=schemas.LanguageResponse)
def add_language(
    user_id: int, lang: schemas.LanguageCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_language(db, user_id, lang)


@router.get("/languages", response_model=list[schemas.LanguageResponse])
def list_languages(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_languages(db, user_id)


@router.patch("/languages/{lang_id}", response_model=schemas.LanguageResponse)
def update_language(
    lang_id: int, update: schemas.LanguageUpdate, db: Session = Depends(get_db)
):
    result = crud.update_language(db, lang_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Language not found")
    return result


@router.delete("/languages/{lang_id}")
def remove_language(lang_id: int, db: Session = Depends(get_db)):
    if not crud.delete_language(db, lang_id):
        raise HTTPException(status_code=404, detail="Language not found")
    return {"detail": "Language deleted"}


# ---------- Extracurriculars ----------


@router.post("/extracurriculars", response_model=schemas.ExtracurricularResponse)
def add_extracurricular(
    user_id: int, extra: schemas.ExtracurricularCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_extracurricular(db, user_id, extra)


@router.get("/extracurriculars", response_model=list[schemas.ExtracurricularResponse])
def list_extracurriculars(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_extracurriculars(db, user_id)


@router.patch(
    "/extracurriculars/{extra_id}", response_model=schemas.ExtracurricularResponse
)
def update_extracurricular(
    extra_id: int, update: schemas.ExtracurricularUpdate, db: Session = Depends(get_db)
):
    result = crud.update_extracurricular(db, extra_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Extracurricular not found")
    return result


@router.delete("/extracurriculars/{extra_id}")
def remove_extracurricular(extra_id: int, db: Session = Depends(get_db)):
    if not crud.delete_extracurricular(db, extra_id):
        raise HTTPException(status_code=404, detail="Extracurricular not found")
    return {"detail": "Extracurricular deleted"}


# ---------- Clear all ----------


@router.delete("/profile")
def clear_profile(user_id: int, db: Session = Depends(get_db)):
    """Delete all profile data (skills, experiences, education, languages, extracurriculars)."""
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    crud.clear_profile(db, user_id)
    return {"detail": "Profile cleared"}
