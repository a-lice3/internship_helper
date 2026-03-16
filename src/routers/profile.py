from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.database import get_db

router = APIRouter(prefix="/users/{user_id}", tags=["profile"])


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


@router.delete("/skills/{skill_id}")
def remove_skill(skill_id: int, db: Session = Depends(get_db)):
    if not crud.delete_skill(db, skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"detail": "Skill deleted"}


# ---------- Projects ----------


@router.post("/projects", response_model=schemas.ProjectResponse)
def add_project(
    user_id: int, project: schemas.ProjectCreate, db: Session = Depends(get_db)
):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_project(db, user_id, project)


@router.get("/projects", response_model=list[schemas.ProjectResponse])
def list_projects(user_id: int, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_projects(db, user_id)


@router.delete("/projects/{project_id}")
def remove_project(project_id: int, db: Session = Depends(get_db)):
    if not crud.delete_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"detail": "Project deleted"}


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


@router.delete("/languages/{lang_id}")
def remove_language(lang_id: int, db: Session = Depends(get_db)):
    if not crud.delete_language(db, lang_id):
        raise HTTPException(status_code=404, detail="Language not found")
    return {"detail": "Language deleted"}
