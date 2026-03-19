# TASKS.md

## Phase 1 — Project Setup [DONE]

- [x] Initialize project structure
- [x] Setup Python environment (.venv, requirements.txt)
- [x] Setup FastAPI project (src/main.py)
- [x] Setup linting/formatting (black, ruff, mypy)
- [x] Setup testing framework (pytest + httpx)
- [x] Setup CI pipeline (GitHub Actions)
- [x] Configure .gitignore

---

## Phase 2 — Database Foundation [DONE]

- [x] Install PostgreSQL locally
- [x] Create `career_db` database
- [x] Setup SQLAlchemy with DeclarativeBase (mypy compatible)
- [x] ~~Auto-create tables on startup~~ → remplace par Alembic (Phase 18)
- [x] Implement get_db() dependency

---

## Phase 3 — Basic User API [DONE]

- [x] POST /users (create user)
- [x] GET /users/{id} (get user)
- [x] GET /users/by-email/{email} (get user by email)
- [x] Pydantic schemas (UserCreate, UserResponse)
- [x] CRUD functions in crud.py
- [x] Tests for user endpoints

---

## Phase 4 — Mistral Integration [DONE]

- [x] Setup Mistral client (llm_service.py)
- [x] POST /ask endpoint
- [x] Pydantic schemas (AskRequest, AskResponse)
- [x] Typed Mistral messages (mypy compatible)

---

## Phase 5 — Data Models & Profile [DONE]

- [x] SQLAlchemy models: User, Skill, Experience, Education, Language, Extracurricular, CoverLetterTemplate, InternshipOffer, CV
- [x] Enums: OfferStatus, LanguageLevel, SkillCategory
- [x] All relationships with cascade delete
- [x] Pydantic schemas for all models
- [x] CRUD operations for all models (with update/delete)
- [x] API endpoints: POST/GET/PATCH/DELETE for skills, experiences, education, languages, extracurriculars
- [x] AI instructions per user (GET/PUT)
- [x] Clear all profile data endpoint (DELETE /users/{id}/profile)

---

## Phase 6 — Cover Letter Templates [DONE]

- [x] CoverLetterTemplate model (with file_path for PDFs)
- [x] POST/GET/DELETE endpoints (text)
- [x] PDF upload with text extraction (pdfplumber)
- [x] Tests

---

## Phase 7 — Internship Offers [DONE]

- [x] InternshipOffer model (company, title, description, link, locations, date_applied, status)
- [x] Status enum: applied / screened / interview / rejected / accepted
- [x] POST/GET/GET by id/PATCH/DELETE endpoints
- [x] Filter offers by status
- [x] Tests

---

## Phase 8 — CV Management [DONE]

- [x] CV model (user, offer FK, name, company, job_title, content, latex_content, file_path, support_files_dir, is_adapted)
- [x] POST (JSON) and POST /upload (PDF, .tex, .zip) endpoints
- [x] ZIP extraction for LaTeX projects (with security: size limits, zip bomb protection, path traversal checks)
- [x] PDF text extraction (pdfplumber)
- [x] Download original file endpoint
- [x] LaTeX compilation to PDF (pdflatex/tectonic/xelatex with -no-shell-escape)
- [x] PATCH (update metadata) and DELETE endpoints
- [x] Chat-based LaTeX editing (POST /cvs/{id}/chat-edit)
- [x] File service: file_service.py (upload, validation, compilation)

---

## Phase 9 — AI: CV Adaptation [DONE]

- [x] `adapt_cv()` in llm_service.py (text adaptation)
- [x] `adapt_cv_latex()` in llm_service.py (LaTeX adaptation with compilation feedback loop)
- [x] POST `/users/{id}/offers/{offer_id}/adapt-cv`
- [x] POST `/users/{id}/offers/{offer_id}/adapt-cv-latex`
- [x] Stores adapted CV in database (is_adapted=True)
- [x] User AI instructions support

---

## Phase 10 — AI: Skill Gap Analysis [DONE]

- [x] `analyze_skill_gap()` in llm_service.py
- [x] POST `/users/{id}/offers/{offer_id}/skill-gap`
- [x] GET `/users/{id}/skill-gaps` (list persisted analyses)
- [x] DELETE `/users/{id}/skill-gaps/{analysis_id}`
- [x] Returns missing_hard_skills, missing_soft_skills, recommendations (JSON)
- [x] SkillGapAnalysis model for persistence

---

## Phase 11 — AI: Cover Letter Generation [DONE]

- [x] `generate_cover_letter()` in llm_service.py
- [x] POST `/users/{id}/offers/{offer_id}/cover-letter`
- [x] GET `/users/{id}/cover-letters` (list persisted letters)
- [x] DELETE `/users/{id}/cover-letters/{letter_id}`
- [x] Uses user profile + offer + optional template
- [x] GeneratedCoverLetter model for persistence

---

## Phase 12 — AI: Offer Parsing & Profile Auto-fill [DONE]

- [x] `parse_offer()` in llm_service.py — extract structured offer data from raw text
- [x] POST `/parse-offer`
- [x] `extract_profile_from_cv()` in llm_service.py — extract profile sections from CV text
- [x] POST `/users/{id}/auto-fill-profile` (from stored CV)
- [x] POST `/users/{id}/auto-fill-profile/upload` (from uploaded PDF)

---

## Phase 13 — AI: Pitch Analysis [DONE]

- [x] Audio transcription via Voxtral (`voxtral-mini-2602`)
- [x] `analyze_pitch()` in llm_service.py
- [x] POST `/users/{id}/pitch-analysis` (general, no offer context)
- [x] POST `/users/{id}/offers/{offer_id}/pitch-analysis` (offer-specific)
- [x] GET `/users/{id}/pitch-analyses` (list persisted analyses)
- [x] DELETE `/users/{id}/pitch-analyses/{analysis_id}`
- [x] POST `/transcribe-audio` (standalone transcription)
- [x] PitchAnalysis model for persistence

---

## Phase 14 — Interview Simulation [DONE]

- [x] `interview_service.py` — prompts, AI interviewer, analysis pipeline
- [x] InterviewSession, InterviewTurn, InterviewAnalysis models
- [x] Enums: InterviewType, InterviewDifficulty, InterviewSessionStatus
- [x] REST endpoints: create/list/get/delete sessions
- [x] WebSocket endpoint (`/ws/interview/{session_id}`) for live interview
- [x] AI-powered question generation (first + follow-up)
- [x] Real-time hints for struggling candidates
- [x] Post-interview analysis with per-turn feedback
- [x] Filler words detection (FR + EN)
- [x] Question prediction endpoint
- [x] Interview progress/stats endpoint

---

## Phase 15 — Refactoring [DONE]

- [x] Reorganize into FastAPI routers (users, profile, offers, cvs, templates, ai, interview)
- [x] main.py is now a thin entry point
- [x] Shared test fixtures in conftest.py

---

## Phase 16 — Frontend [DONE]

- [x] React + TypeScript (Vite) frontend in src/frontend/
- [x] API client (api.ts) for REST + WebSocket
- [x] Pages: ProfilePage, OffersPage, CVsPage, TemplatesPage, AIPage, InterviewPage
- [x] Custom hooks: useInterview, useSpeechRecognition
- [x] CORS configured for localhost:5173

---

## Phase 18 — Alembic Migrations [DONE]

- [x] Install Alembic, initialiser avec `alembic init alembic`
- [x] Configurer `alembic/env.py` (import Base.metadata + DATABASE_URL)
- [x] Generer migration initiale (15 tables, 6 enums)
- [x] `alembic stamp head` sur la base existante
- [x] Supprimer `Base.metadata.create_all` de main.py
- [x] Guide d'utilisation dans ALEMBIC.md

---

## Phase 17 — Next Steps (TODO)

- [x] ~~Alembic migrations (proper schema versioning)~~ (Phase 18)
- [ ] User authentication (JWT or session-based)
- [ ] Tests for AI endpoints (mock Mistral calls)
- [ ] Tests for interview WebSocket
- [x] Dockerfile + docker-compose (backend, frontend, PostgreSQL with healthcheck, auto-migrations)
- [ ] Security hardening (see security branch)
