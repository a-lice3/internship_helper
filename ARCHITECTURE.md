# ARCHITECTURE.md

## High-Level Architecture

```
React Frontend (Vite + TypeScript)
        │
        ▼  REST + WebSocket
   FastAPI Backend (src/main.py)
        │
   ┌────┴─────────────┐
   ▼                   ▼
PostgreSQL          Mistral API
(SQLAlchemy)        (llm_service.py + interview_service.py)
                    Models: mistral-small-2603, voxtral-mini-2602
```

---

## Project Structure

```
src/
├── main.py                # FastAPI app, CORS, router registration
├── config.py              # Environment variables (DATABASE_URL, MISTRAL_API_KEY, UPLOAD_DIR, JWT)
├── auth.py                # JWT authentication (get_current_user dependency)
├── database.py            # SQLAlchemy engine, Base, session, get_db()
├── models.py              # SQLAlchemy ORM models (15 tables)
├── schemas.py             # Pydantic request/response schemas
├── crud.py                # Database read/write operations
├── llm_service.py         # Mistral chat/transcription wrapper
├── interview_service.py   # Interview simulation prompts & analysis pipeline
├── file_service.py        # File upload, PDF extraction, LaTeX compilation
└── routers/
    ├── auth.py            # Authentication endpoints (register, login)
    ├── users.py           # User CRUD
    ├── profile.py         # Skills, experiences, education, languages, extracurriculars, AI instructions
    ├── offers.py          # Internship offers CRUD + status filter
    ├── cvs.py             # CV CRUD, file upload (PDF/TeX/ZIP), LaTeX compilation, chat edit
    ├── templates.py       # Cover letter templates (text + PDF upload)
    ├── ai.py              # AI endpoints: adapt CV, skill gap, cover letter, parse offer, auto-fill profile, pitch analysis
    └── interview.py       # Interview simulation: sessions, WebSocket, analysis, question prediction, progress

src/frontend/              # React + TypeScript (Vite)
├── src/
│   ├── App.tsx            # Main app with routing
│   ├── api.ts             # API client (REST + WebSocket)
│   ├── pages/
│   │   ├── ProfilePage.tsx
│   │   ├── OffersPage.tsx
│   │   ├── CVsPage.tsx
│   │   ├── TemplatesPage.tsx
│   │   ├── AIPage.tsx
│   │   └── InterviewPage.tsx
│   └── hooks/
│       ├── useInterview.ts
│       └── useSpeechRecognition.ts

tests/
├── conftest.py            # Shared fixtures (SQLite in-memory, test client)
├── test_users.py
├── test_profile.py
├── test_offers.py
├── test_cvs.py
└── test_templates.py
```

### Separation of Concerns

| Layer | File(s) | Role |
|-------|---------|------|
| Routing | `routers/*.py` | HTTP/WebSocket endpoints, dependency injection |
| Validation | `schemas.py` | Request/response data shapes (Pydantic) |
| AI logic | `llm_service.py`, `interview_service.py` | Mistral API calls, prompt engineering |
| File handling | `file_service.py` | Upload, PDF extraction, LaTeX compilation |
| Data access | `crud.py` | Database queries |
| Models | `models.py`, `database.py` | ORM table definitions |
| Config | `config.py` | Environment variables |
| Frontend | `src/frontend/` | React SPA (Vite + TypeScript) |

---

## Database Schema

```
users
├── id, name, email, ai_instructions, created_at

skills
├── id, user_id (FK), name, category (enum), level

experiences
├── id, user_id (FK), title, description, technologies, client, start_date, end_date

education
├── id, user_id (FK), school, degree, field, description, start_date, end_date

languages
├── id, user_id (FK), language, level (enum)

extracurriculars
├── id, user_id (FK), name, description

cover_letter_templates
├── id, user_id (FK), name, content, file_path, created_at

internship_offers
├── id, user_id (FK), company, title, description, link, locations
├── date_applied, status (enum: applied/screened/interview/rejected/accepted), created_at

cvs
├── id, user_id (FK), offer_id (FK, nullable)
├── name, company, job_title, content, latex_content, file_path, support_files_dir
├── is_adapted, created_at

generated_cover_letters
├── id, user_id (FK), offer_id (FK), template_id (FK, nullable)
├── offer_title, company, content, created_at

skill_gap_analyses
├── id, user_id (FK), offer_id (FK)
├── offer_title, company, missing_hard_skills (JSON), missing_soft_skills (JSON), recommendations (JSON), created_at

pitch_analyses
├── id, user_id (FK), offer_id (FK, nullable)
├── offer_title, company, transcription, structure_clarity, strengths (JSON), improvements (JSON)
├── offer_relevance, overall_score, summary, created_at

interview_sessions
├── id, session_id (UUID), user_id (FK), offer_id (FK, nullable)
├── interview_type (enum: hr/technical/behavioral/pitch)
├── difficulty (enum: junior/intermediate/advanced)
├── language, duration_minutes, enable_hints
├── status (enum: created/active/completed/analyzed)
├── offer_title, company, started_at, ended_at, created_at

interview_turns
├── id, session_id (FK), turn_number
├── question_text, question_category
├── answer_transcript, answer_duration_seconds, skipped
├── clarity_score, relevance_score, structure_score, feedback, better_answer, created_at

interview_analyses
├── id, session_id (FK, unique)
├── overall_score, communication_score, technical_score, behavioral_score, confidence_score
├── strengths (JSON), weaknesses (JSON), improvements (JSON)
├── summary, filler_words_analysis, star_method_usage, full_transcript, created_at
```

---

## API Endpoints

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create user |
| GET | `/users/{id}` | Get user by ID |
| GET | `/users/by-email/{email}` | Get user by email |

### Profile
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/users/{id}/ai-instructions` | Get/update AI instructions |
| POST/GET | `/users/{id}/skills` | Add / list skills |
| PATCH/DELETE | `/users/{id}/skills/{skill_id}` | Update / delete skill |
| POST/GET | `/users/{id}/experiences` | Add / list experiences |
| PATCH/DELETE | `/users/{id}/experiences/{exp_id}` | Update / delete experience |
| POST/GET | `/users/{id}/education` | Add / list education |
| PATCH/DELETE | `/users/{id}/education/{edu_id}` | Update / delete education |
| POST/GET | `/users/{id}/languages` | Add / list languages |
| PATCH/DELETE | `/users/{id}/languages/{lang_id}` | Update / delete language |
| POST/GET | `/users/{id}/extracurriculars` | Add / list extracurriculars |
| PATCH/DELETE | `/users/{id}/extracurriculars/{extra_id}` | Update / delete extracurricular |
| DELETE | `/users/{id}/profile` | Clear all profile data |

### Internship Offers
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/{id}/offers` | Add an offer |
| GET | `/users/{id}/offers` | List offers (with `?status=` filter) |
| GET | `/users/{id}/offers/{offer_id}` | Get offer by ID |
| PATCH | `/users/{id}/offers/{offer_id}` | Update offer |
| DELETE | `/users/{id}/offers/{offer_id}` | Delete offer |

### CVs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/{id}/cvs` | Create CV (JSON) |
| POST | `/users/{id}/cvs/upload` | Upload CV file (PDF / .tex / .zip) |
| GET | `/users/{id}/cvs` | List CVs |
| GET | `/users/{id}/cvs/{cv_id}/download` | Download original file |
| POST | `/users/{id}/cvs/{cv_id}/compile-pdf` | Compile LaTeX to PDF |
| PATCH | `/users/{id}/cvs/{cv_id}` | Update CV metadata |
| POST | `/users/{id}/cvs/{cv_id}/chat-edit` | Chat-based LaTeX editing |
| DELETE | `/users/{id}/cvs/{cv_id}` | Delete CV |

### Cover Letter Templates
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/{id}/templates` | Create template (text) |
| POST | `/users/{id}/templates/upload` | Upload template (PDF) |
| GET | `/users/{id}/templates` | List templates |
| DELETE | `/users/{id}/templates/{template_id}` | Delete template |

### AI Features
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ask` | General question to Mistral |
| POST | `/parse-offer` | Extract structured data from raw job description |
| POST | `/users/{id}/offers/{offer_id}/adapt-cv` | Adapt CV text for offer |
| POST | `/users/{id}/offers/{offer_id}/adapt-cv-latex` | Adapt LaTeX CV for offer |
| POST | `/users/{id}/offers/{offer_id}/skill-gap` | Skill gap analysis |
| GET | `/users/{id}/skill-gaps` | List saved skill gap analyses |
| DELETE | `/users/{id}/skill-gaps/{analysis_id}` | Delete skill gap analysis |
| POST | `/users/{id}/offers/{offer_id}/cover-letter` | Generate cover letter |
| GET | `/users/{id}/cover-letters` | List saved cover letters |
| DELETE | `/users/{id}/cover-letters/{letter_id}` | Delete cover letter |
| POST | `/users/{id}/auto-fill-profile` | Auto-fill profile from stored CV |
| POST | `/users/{id}/auto-fill-profile/upload` | Auto-fill profile from uploaded PDF |
| POST | `/users/{id}/pitch-analysis` | Analyze audio pitch (general) |
| POST | `/users/{id}/offers/{offer_id}/pitch-analysis` | Analyze audio pitch (offer-specific) |
| GET | `/users/{id}/pitch-analyses` | List saved pitch analyses |
| DELETE | `/users/{id}/pitch-analyses/{analysis_id}` | Delete pitch analysis |
| POST | `/transcribe-audio` | Transcribe audio file (Voxtral) |

### Interview Simulation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/{id}/interview-sessions` | Create interview session |
| GET | `/users/{id}/interview-sessions` | List sessions |
| GET | `/users/{id}/interview-sessions/{session_id}` | Get session detail |
| DELETE | `/users/{id}/interview-sessions/{session_id}` | Delete session |
| POST | `/users/{id}/interview-sessions/{session_id}/analyze` | Run post-interview analysis |
| GET | `/users/{id}/interview-sessions/{session_id}/analysis` | Get analysis |
| POST | `/users/{id}/offers/{offer_id}/predict-questions` | Predict interview questions |
| GET | `/users/{id}/interview-progress` | Overall interview progress stats |
| WS | `/ws/interview/{session_id}?user_id=` | Live interview WebSocket |

---

## AI Features (Mistral)

| Feature | Input | Output |
|---------|-------|--------|
| CV adaptation (text) | User CV + offer | Adapted CV text |
| CV adaptation (LaTeX) | LaTeX CV + offer + support files | Adapted LaTeX (with compilation check) |
| Chat CV editing | LaTeX CV + user message | Updated LaTeX |
| Skill gap analysis | User skills + offer | Missing skills + recommendations (JSON) |
| Cover letter draft | Offer + user profile + optional template | Cover letter text |
| Offer parsing | Raw job description text | Structured offer data (JSON) |
| Profile auto-fill | CV text (stored or uploaded PDF) | Extracted skills, experiences, education, languages, extracurriculars |
| Pitch analysis | Audio recording (Voxtral transcription) + optional offer | Structured feedback (JSON) |
| Interview simulation | WebSocket session with AI interviewer | Live Q&A + post-interview analysis |
| Question prediction | Offer + interview type + difficulty | Predicted questions with tips |
| Audio transcription | Audio file | Transcribed text (Voxtral) |

All AI text calls go through `llm_service.py`. Interview-specific logic is in `interview_service.py`.
Audio transcription uses the Voxtral model (`voxtral-mini-2602`).

---

## Testing Strategy

- Tests use **SQLite in-memory** (no PostgreSQL needed)
- FastAPI's `dependency_overrides` swaps `get_db` for a test session
- Shared fixtures in `tests/conftest.py`
- Located in `tests/` (5 test files)

---

## Database Migrations (Alembic)

- Schema changes are managed by **Alembic** (not `Base.metadata.create_all`)
- Config in `alembic.ini` + `alembic/env.py` (imports `DATABASE_URL` and `Base.metadata` from src/)
- Migration files in `alembic/versions/`
- See `ALEMBIC.md` for usage guide
