from datetime import date, datetime
from pydantic import BaseModel

# ---------- User ----------


class UserCreate(BaseModel):
    name: str
    email: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime | None = None


# ---------- Skill ----------


class SkillCreate(BaseModel):
    name: str
    category: str = "hard"  # hard / soft / tool / language
    level: str | None = None


class SkillResponse(BaseModel):
    id: int
    name: str
    category: str
    level: str | None = None


# ---------- Project ----------


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    technologies: str | None = None
    link: str | None = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    technologies: str | None = None
    link: str | None = None


# ---------- Education ----------


class EducationCreate(BaseModel):
    school: str
    degree: str
    field: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class EducationResponse(BaseModel):
    id: int
    school: str
    degree: str
    field: str | None = None
    start_date: date | None = None
    end_date: date | None = None


# ---------- Language ----------


class LanguageCreate(BaseModel):
    language: str
    level: str  # beginner / intermediate / advanced / fluent / native


class LanguageResponse(BaseModel):
    id: int
    language: str
    level: str


# ---------- Cover Letter Template ----------


class CoverLetterTemplateCreate(BaseModel):
    name: str
    content: str


class CoverLetterTemplateResponse(BaseModel):
    id: int
    name: str
    content: str
    file_path: str | None = None
    created_at: datetime | None = None


# ---------- Internship Offer ----------


class InternshipOfferCreate(BaseModel):
    company: str
    title: str
    description: str | None = None
    link: str | None = None
    locations: str | None = None
    date_applied: date | None = None
    status: str = "applied"


class InternshipOfferUpdate(BaseModel):
    status: str | None = None
    date_applied: date | None = None
    link: str | None = None
    locations: str | None = None
    description: str | None = None


class InternshipOfferResponse(BaseModel):
    id: int
    company: str
    title: str
    description: str | None = None
    link: str | None = None
    locations: str | None = None
    date_applied: date | None = None
    status: str
    created_at: datetime | None = None


# ---------- CV ----------


class CVCreate(BaseModel):
    content: str
    company: str | None = None
    offer_id: int | None = None


class CVResponse(BaseModel):
    id: int
    content: str
    company: str | None = None
    offer_id: int | None = None
    is_adapted: bool
    created_at: datetime | None = None


# ---------- AI: Ask ----------


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    question: str
    answer: str


# ---------- AI: CV Adaptation ----------


class AdaptCVRequest(BaseModel):
    cv_id: int


class AdaptCVResponse(BaseModel):
    original_cv: str
    adapted_cv: str
    offer_title: str
    company: str


# ---------- AI: Skill Gap ----------


class SkillGapResponse(BaseModel):
    offer_title: str
    company: str
    missing_hard_skills: list[str]
    missing_soft_skills: list[str]
    recommendations: list[str]


# ---------- AI: Cover Letter ----------


class GenerateCoverLetterRequest(BaseModel):
    template_id: int | None = None


class GenerateCoverLetterResponse(BaseModel):
    offer_title: str
    company: str
    cover_letter: str
