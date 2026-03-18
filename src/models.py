import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
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


# ---------- Models ----------


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    ai_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    pitch_analyses: Mapped[list["PitchAnalysis"]] = relationship(
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
        Enum(OfferStatus), nullable=False, default=OfferStatus.applied
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="offers")
    cvs: Mapped[list["CV"]] = relationship(
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
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="cvs")
    offer: Mapped["InternshipOffer | None"] = relationship(back_populates="cvs")


class GeneratedCoverLetter(Base):
    __tablename__ = "generated_cover_letters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("internship_offers.id"), nullable=False
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("cover_letter_templates.id", ondelete="SET NULL"), nullable=True
    )
    offer_title: Mapped[str] = mapped_column(String(300), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="generated_cover_letters")
    offer: Mapped["InternshipOffer"] = relationship()
    template: Mapped["CoverLetterTemplate | None"] = relationship()


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
