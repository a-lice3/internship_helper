import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

# ---------- Enums ----------


class OfferStatus(str, enum.Enum):
    bookmarked = "bookmarked"
    applied = "applied"
    screened = "screened"
    interview = "interview"
    rejected = "rejected"
    accepted = "accepted"


class LanguageLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    fluent = "fluent"
    native = "native"


class SkillCategory(str, enum.Enum):
    programming = "programming"
    libraries = "libraries"
    soft = "soft"
    tools = "tools"
    other = "other"


class ReminderType(str, enum.Enum):
    deadline = "deadline"
    follow_up = "follow_up"
    interview = "interview"
    custom = "custom"


class InterviewType(str, enum.Enum):
    hr = "hr"
    technical = "technical"
    behavioral = "behavioral"
    pitch = "pitch"


class InterviewDifficulty(str, enum.Enum):
    junior = "junior"
    intermediate = "intermediate"
    advanced = "advanced"


class InterviewSessionStatus(str, enum.Enum):
    created = "created"
    active = "active"
    completed = "completed"
    analyzed = "analyzed"


class GoalFrequency(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"


# ---------- Models ----------


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    ai_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    personality_profile: Mapped[str | None] = mapped_column(Text, nullable=True)
    has_completed_onboarding: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    skills: Mapped[list["Skill"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    education: Mapped[list["Education"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    languages: Mapped[list["Language"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    extracurriculars: Mapped[list["Extracurricular"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    cover_letter_templates: Mapped[list["CoverLetterTemplate"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    offers: Mapped[list["InternshipOffer"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    cvs: Mapped[list["CV"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    generated_cover_letters: Mapped[list["GeneratedCoverLetter"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    skill_gap_analyses: Mapped[list["SkillGapAnalysis"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    cv_general_analyses: Mapped[list["CVGeneralAnalysis"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    cv_offer_analyses: Mapped[list["CVOfferAnalysis"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    pitch_analyses: Mapped[list["PitchAnalysis"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    scraped_offers: Mapped[list["ScrapedOffer"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    offer_notes: Mapped[list["OfferNote"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    memos: Mapped[list["Memo"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    goals: Mapped[list["Goal"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[SkillCategory] = mapped_column(
        Enum(SkillCategory), nullable=False, default=SkillCategory.programming
    )
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship(back_populates="skills")


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    technologies: Mapped[str | None] = mapped_column(String(500), nullable=True)
    client: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(7), nullable=True)  # YYYY-MM
    end_date: Mapped[str | None] = mapped_column(String(7), nullable=True)  # YYYY-MM

    user: Mapped["User"] = relationship(back_populates="experiences")


class Education(Base):
    __tablename__ = "education"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    school: Mapped[str] = mapped_column(String(200), nullable=False)
    degree: Mapped[str] = mapped_column(String(200), nullable=False)
    field: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(7), nullable=True)  # YYYY-MM
    end_date: Mapped[str | None] = mapped_column(String(7), nullable=True)  # YYYY-MM

    user: Mapped["User"] = relationship(back_populates="education")


class Language(Base):
    __tablename__ = "languages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[LanguageLevel] = mapped_column(Enum(LanguageLevel), nullable=False)

    user: Mapped["User"] = relationship(back_populates="languages")


class Extracurricular(Base):
    __tablename__ = "extracurriculars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="extracurriculars")


class CoverLetterTemplate(Base):
    __tablename__ = "cover_letter_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="cover_letter_templates")


class InternshipOffer(Base):
    __tablename__ = "internship_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    locations: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date_applied: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus), nullable=False, default=OfferStatus.bookmarked
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="offers")
    cvs: Mapped[list["CV"]] = relationship(
        back_populates="offer", cascade="all, delete-orphan"
    )
    notes: Mapped[list["OfferNote"]] = relationship(
        back_populates="offer", cascade="all, delete-orphan"
    )


class CV(Base):
    __tablename__ = "cvs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, default="Untitled CV"
    )
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    latex_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    support_files_dir: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_adapted: Mapped[bool] = mapped_column(default=False)
    is_default: Mapped[bool] = mapped_column(default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="cvs")
    offer: Mapped["InternshipOffer | None"] = relationship(back_populates="cvs")
    general_analyses: Mapped[list["CVGeneralAnalysis"]] = relationship(
        back_populates="cv", cascade="all, delete-orphan"
    )


class GeneratedCoverLetter(Base):
    __tablename__ = "generated_cover_letters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id"), nullable=True
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("cover_letter_templates.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    offer_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    saved: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="generated_cover_letters")
    offer: Mapped["InternshipOffer | None"] = relationship()
    template: Mapped["CoverLetterTemplate | None"] = relationship()


class CVOfferAnalysis(Base):
    __tablename__ = "cv_offer_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("internship_offers.id"), nullable=False
    )
    cv_id: Mapped[int] = mapped_column(
        ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False
    )
    offer_title: Mapped[str] = mapped_column(String(300), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    suggested_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_profile: Mapped[str | None] = mapped_column(Text, nullable=True)
    other_suggestions: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="cv_offer_analyses")
    offer: Mapped["InternshipOffer"] = relationship()
    cv: Mapped["CV"] = relationship()


class SkillGapAnalysis(Base):
    __tablename__ = "skill_gap_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("internship_offers.id"), nullable=False
    )
    offer_title: Mapped[str] = mapped_column(String(300), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    missing_hard_skills: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    missing_soft_skills: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    recommendations: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="skill_gap_analyses")
    offer: Mapped["InternshipOffer"] = relationship()


class PitchAnalysis(Base):
    __tablename__ = "pitch_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="SET NULL"), nullable=True
    )
    offer_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    transcription: Mapped[str] = mapped_column(Text, nullable=False)
    structure_clarity: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    improvements: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    offer_relevance: Mapped[str | None] = mapped_column(Text, nullable=True)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="pitch_analyses")
    offer: Mapped["InternshipOffer | None"] = relationship()


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="SET NULL"), nullable=True
    )

    # Configuration
    interview_type: Mapped[InterviewType] = mapped_column(
        Enum(InterviewType), nullable=False
    )
    difficulty: Mapped[InterviewDifficulty] = mapped_column(
        Enum(InterviewDifficulty), nullable=False
    )
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    enable_hints: Mapped[bool] = mapped_column(Boolean, default=False)

    # State
    status: Mapped[InterviewSessionStatus] = mapped_column(
        Enum(InterviewSessionStatus),
        nullable=False,
        default=InterviewSessionStatus.created,
    )

    # Denormalized offer info
    offer_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="interview_sessions")
    offer: Mapped["InternshipOffer | None"] = relationship()
    turns: Mapped[list["InterviewTurn"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewTurn.turn_number",
    )
    analysis: Mapped["InterviewAnalysis | None"] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # AI question
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # User answer
    answer_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False)

    # Per-turn scores (filled during analysis)
    clarity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    relevance_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    structure_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    better_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session: Mapped["InterviewSession"] = relationship(back_populates="turns")


class InterviewAnalysis(Base):
    __tablename__ = "interview_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Global scores (0-100)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)
    technical_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    behavioral_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)

    # Structured feedback (JSON)
    strengths: Mapped[str] = mapped_column(Text, nullable=False)
    weaknesses: Mapped[str] = mapped_column(Text, nullable=False)
    improvements: Mapped[str] = mapped_column(Text, nullable=False)

    # Text fields
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    filler_words_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    star_method_usage: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Full re-transcription
    full_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session: Mapped["InterviewSession"] = relationship(back_populates="analysis")


class ScrapedOffer(Base):
    __tablename__ = "scraped_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Source info
    source: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # francetravail / wttj
    source_id: Mapped[str] = mapped_column(String(200), nullable=False)  # external ID

    # Offer data
    company: Mapped[str] = mapped_column(String(300), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    locations: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    contract_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    salary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    published_at: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Matching
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_reasons: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON

    # Status
    saved: Mapped[bool] = mapped_column(default=False)  # user saved to tracker
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="scraped_offers")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="CASCADE"), nullable=True
    )
    reminder_type: Mapped[ReminderType] = mapped_column(
        Enum(ReminderType), nullable=False, default=ReminderType.custom
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="reminders")
    offer: Mapped["InternshipOffer | None"] = relationship()


class CVGeneralAnalysis(Base):
    __tablename__ = "cv_general_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    cv_id: Mapped[int] = mapped_column(
        ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    improvements: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="cv_general_analyses")
    cv: Mapped["CV"] = relationship(back_populates="general_analyses")


class OfferNote(Base):
    __tablename__ = "offer_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="offer_notes")
    offer: Mapped["InternshipOffer"] = relationship(back_populates="notes")


class Memo(Base):
    __tablename__ = "memos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="SET NULL"), nullable=True
    )
    skill_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="memos")
    offer: Mapped["InternshipOffer | None"] = relationship()


class SkillRecommendation(Base):
    __tablename__ = "skill_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True
    )
    aggregated_skills: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    offers_analyzed_count: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    frequency: Mapped[GoalFrequency] = mapped_column(
        Enum(GoalFrequency), nullable=False, default=GoalFrequency.daily
    )
    target_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="goals")
    progress_entries: Mapped[list["GoalProgress"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )


class GoalProgress(Base):
    __tablename__ = "goal_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    goal: Mapped["Goal"] = relationship(back_populates="progress_entries")
