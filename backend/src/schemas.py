from datetime import date, datetime
from typing import Any

from pydantic import BaseModel

# ---------- Auth ----------


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ---------- User ----------


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    ai_instructions: str | None = None
    has_completed_onboarding: bool = False
    created_at: datetime | None = None


# ---------- AI Instructions ----------


class AIInstructionsUpdate(BaseModel):
    ai_instructions: str


class AIInstructionsResponse(BaseModel):
    ai_instructions: str | None = None


# ---------- Skill ----------


class SkillCreate(BaseModel):
    name: str
    category: str = "programming"  # programming / libraries / soft / tools / other
    level: str | None = None


class SkillUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    level: str | None = None


class SkillResponse(BaseModel):
    id: int
    name: str
    category: str
    level: str | None = None


# ---------- Experience ----------


class ExperienceCreate(BaseModel):
    title: str
    description: str | None = None
    technologies: str | None = None
    client: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


class ExperienceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    technologies: str | None = None
    client: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


class ExperienceResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    technologies: str | None = None
    client: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


# ---------- Education ----------


class EducationCreate(BaseModel):
    school: str
    degree: str
    field: str | None = None
    description: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


class EducationUpdate(BaseModel):
    school: str | None = None
    degree: str | None = None
    field: str | None = None
    description: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


class EducationResponse(BaseModel):
    id: int
    school: str
    degree: str
    field: str | None = None
    description: str | None = None
    start_date: str | None = None  # YYYY-MM
    end_date: str | None = None  # YYYY-MM


# ---------- Language ----------


class LanguageCreate(BaseModel):
    language: str
    level: str  # beginner / intermediate / advanced / fluent / native


class LanguageUpdate(BaseModel):
    language: str | None = None
    level: str | None = None


class LanguageResponse(BaseModel):
    id: int
    language: str
    level: str


# ---------- Extracurricular ----------


class ExtracurricularCreate(BaseModel):
    name: str
    description: str | None = None


class ExtracurricularUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ExtracurricularResponse(BaseModel):
    id: int
    name: str
    description: str | None = None


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
    status: str = "bookmarked"


class InternshipOfferUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
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
    name: str = "Untitled CV"
    content: str
    latex_content: str | None = None
    support_files_dir: str | None = None
    company: str | None = None
    job_title: str | None = None
    offer_id: int | None = None


class CVResponse(BaseModel):
    id: int
    name: str
    content: str
    latex_content: str | None = None
    file_path: str | None = None
    support_files_dir: str | None = None
    company: str | None = None
    job_title: str | None = None
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
    """Returned by the generation endpoint (includes DB id)."""

    id: int
    offer_title: str
    company: str
    missing_hard_skills: list[str]
    missing_soft_skills: list[str]
    recommendations: list[str]


# ---------- AI: Cover Letter ----------


class GenerateCoverLetterRequest(BaseModel):
    template_id: int | None = None
    cover_letter_id: int | None = None


class GenerateCoverLetterResponse(BaseModel):
    """Returned by the generation endpoint (includes DB id)."""

    id: int
    offer_title: str
    company: str
    cover_letter: str


# ---------- AI: Chat Edit Cover Letter ----------


class ChatEditCoverLetterRequest(BaseModel):
    content: str
    message: str
    conversation_history: list[dict[str, str]] | None = None


class ChatEditCoverLetterResponse(BaseModel):
    updated_content: str


# ---------- AI: Update Cover Letter Content ----------


class UpdateCoverLetterContentRequest(BaseModel):
    content: str | None = None
    saved: bool | None = None


class CreateCoverLetterRequest(BaseModel):
    name: str
    content: str


# ---------- Company Info ----------


class CompanyInfoResponse(BaseModel):
    description: str | None = None
    extract: str | None = None
    logo_url: str | None = None
    page_url: str | None = None


# ---------- AI: Parse Offer ----------


class ParseOfferRequest(BaseModel):
    text: str | None = None  # raw pasted job description
    url: str | None = None  # link to a job offer page


class ParseOfferResponse(BaseModel):
    company: str
    title: str
    locations: str | None = None
    description: str | None = None


# ---------- AI: Auto-fill Profile from CV ----------


class AutoFillProfileResponse(BaseModel):
    skills: list[SkillCreate]
    experiences: list[ExperienceCreate]
    education: list[EducationCreate]
    languages: list[LanguageCreate]
    extracurriculars: list[ExtracurricularCreate]


# ---------- Generated Cover Letter (persisted) ----------


class GeneratedCoverLetterResponse(BaseModel):
    id: int
    offer_id: int | None = None
    template_id: int | None = None
    name: str | None = None
    offer_title: str | None = None
    company: str | None = None
    content: str
    saved: bool = False
    created_at: datetime | None = None


# ---------- Skill Gap Analysis (persisted) ----------


class SkillGapAnalysisResponse(BaseModel):
    id: int
    offer_id: int
    offer_title: str
    company: str
    missing_hard_skills: list[str]
    missing_soft_skills: list[str]
    recommendations: list[str]
    created_at: datetime | None = None


# ---------- AI: Adapt CV LaTeX ----------


class AdaptCVLatexRequest(BaseModel):
    cv_id: int


class AdaptCVLatexResponse(BaseModel):
    original_latex: str
    adapted_latex: str
    offer_title: str
    company: str
    support_files_dir: str | None = None


# ---------- CV: Update ----------


class CVUpdate(BaseModel):
    name: str | None = None
    latex_content: str | None = None
    company: str | None = None
    job_title: str | None = None


# ---------- CV: Chat Edit ----------


class ChatEditCVRequest(BaseModel):
    message: str
    conversation_history: list[dict[str, str]] | None = None


class ChatEditCVResponse(BaseModel):
    updated_latex: str


# ---------- AI: Pitch Analysis ----------


class PitchAnalysisResponse(BaseModel):
    """Returned by the generation endpoint (includes DB id)."""

    id: int
    offer_title: str | None = None
    company: str | None = None
    transcription: str
    structure_clarity: str
    strengths: list[str]
    improvements: list[str]
    offer_relevance: str | None = None
    overall_score: int
    summary: str


# ---------- Pitch Analysis (persisted) ----------


class PitchAnalysisStoredResponse(BaseModel):
    id: int
    offer_id: int | None = None
    offer_title: str | None = None
    company: str | None = None
    transcription: str
    structure_clarity: str
    strengths: list[str]
    improvements: list[str]
    offer_relevance: str | None = None
    overall_score: int
    summary: str
    created_at: datetime | None = None


# ---------- Interview Simulation ----------


class InterviewSessionCreate(BaseModel):
    offer_id: int | None = None
    interview_type: str = "hr"  # hr / technical / behavioral / pitch
    difficulty: str = "junior"  # junior / intermediate / advanced
    language: str = "en"  # en / fr
    duration_minutes: int = 15
    enable_hints: bool = False


class InterviewTurnResponse(BaseModel):
    id: int
    turn_number: int
    question_text: str
    question_category: str | None = None
    answer_transcript: str | None = None
    answer_duration_seconds: int | None = None
    skipped: bool = False
    clarity_score: int | None = None
    relevance_score: int | None = None
    structure_score: int | None = None
    feedback: str | None = None
    better_answer: str | None = None


class InterviewAnalysisResponse(BaseModel):
    id: int
    overall_score: int
    communication_score: int
    technical_score: int | None = None
    behavioral_score: int | None = None
    confidence_score: int
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    summary: str
    filler_words_analysis: str | None = None
    star_method_usage: str | None = None
    full_transcript: str | None = None
    per_turn_feedback: list[InterviewTurnResponse] = []
    created_at: datetime | None = None


class InterviewSessionResponse(BaseModel):
    id: int
    session_id: str
    offer_id: int | None = None
    interview_type: str
    difficulty: str
    language: str
    duration_minutes: int
    enable_hints: bool = False
    status: str
    offer_title: str | None = None
    company: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime | None = None


class InterviewSessionDetailResponse(InterviewSessionResponse):
    turns: list[InterviewTurnResponse] = []
    analysis: InterviewAnalysisResponse | None = None


class PredictQuestionsRequest(BaseModel):
    interview_type: str = "hr"
    difficulty: str = "junior"
    language: str = "en"
    count: int = 10


class PredictedQuestion(BaseModel):
    question: str
    category: str
    difficulty: str
    tip: str


class InterviewProgressResponse(BaseModel):
    total_sessions: int
    average_score: float | None = None
    score_trend: list[int] = []
    best_category: str | None = None
    worst_category: str | None = None
    total_practice_minutes: int = 0
    sessions_this_week: int = 0


# ---------- Offer Search / Scraping ----------


class OfferSearchRequest(BaseModel):
    keywords: str
    location: str | None = None
    country: str = "France"
    radius_km: int = 30
    sources: list[str] = ["francetravail", "wttj"]
    max_results: int = 20  # 1-30

    def model_post_init(self, __context: object) -> None:
        self.max_results = max(1, min(self.max_results, 30))


class ChatSearchRequest(BaseModel):
    message: str
    max_results: int = 20  # 1-30


class ScrapedOfferResponse(BaseModel):
    id: int
    source: str
    source_id: str
    company: str
    title: str
    description: str | None = None
    locations: str | None = None
    link: str | None = None
    contract_type: str | None = None
    salary: str | None = None
    published_at: str | None = None
    match_score: float | None = None
    match_reasons: list[str] = []
    saved: bool = False
    created_at: datetime | None = None


class OfferSearchResponse(BaseModel):
    results: list[ScrapedOfferResponse]
    total: int
    sources_used: list[str]
    parsed_query: dict | None = None  # what Mistral extracted from the chat message


# ---------- Reminder ----------


class ReminderCreate(BaseModel):
    offer_id: int | None = None
    reminder_type: str = "custom"  # deadline / follow_up / interview / custom
    title: str
    description: str | None = None
    due_at: datetime


class ReminderUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_at: datetime | None = None
    reminder_type: str | None = None
    is_done: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    offer_id: int | None = None
    reminder_type: str
    title: str
    description: str | None = None
    due_at: datetime
    is_done: bool
    created_at: datetime | None = None


# ---------- Offer Note ----------


class OfferNoteCreate(BaseModel):
    content: str


class OfferNoteUpdate(BaseModel):
    content: str


class OfferNoteResponse(BaseModel):
    id: int
    offer_id: int
    content: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ---------- Dashboard ----------


class DashboardStats(BaseModel):
    offers_by_status: dict[str, int]
    total_offers: int
    average_interview_score: float | None = None
    upcoming_reminders: list[ReminderResponse] = []
    recent_activity: list[dict[str, Any]] = []
    interview_sessions_count: int = 0
    interview_sessions_this_week: int = 0


# ---------- Calendar ----------


class CalendarEvent(BaseModel):
    id: str  # "{type}_{id}" e.g. "reminder_42"
    event_type: str  # "application" | "reminder" | "interview"
    title: str
    date: datetime
    offer_id: int | None = None
    company: str | None = None
    metadata: dict[str, Any] | None = None


class CalendarResponse(BaseModel):
    events: list[CalendarEvent]
