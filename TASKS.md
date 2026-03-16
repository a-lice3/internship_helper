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
- [x] Auto-create tables on startup (Base.metadata.create_all)
- [x] Implement get_db() dependency

---

## Phase 3 — Basic User API [DONE]

- [x] POST /users (create user)
- [x] GET /users/{id} (get user)
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

- [x] SQLAlchemy models: User, Skill, Project, Education, Language, CoverLetterTemplate, InternshipOffer, CV
- [x] Enums: OfferStatus, LanguageLevel, SkillCategory
- [x] All relationships with cascade delete
- [x] Pydantic schemas for all models
- [x] CRUD operations for all models
- [x] API endpoints: POST/GET/DELETE for skills, projects, education, languages
- [x] Tests (6 tests)

---

## Phase 6 — Cover Letter Templates [DONE]

- [x] CoverLetterTemplate model
- [x] POST/GET/DELETE endpoints
- [x] Tests (2 tests)

---

## Phase 7 — Internship Offers [DONE]

- [x] InternshipOffer model (company, title, description, link, locations, date_applied, status)
- [x] Status enum: applied / screened / interview / rejected / accepted
- [x] POST/GET/GET by id/PATCH endpoints
- [x] Filter offers by status
- [x] Tests (5 tests)

---

## Phase 8 — CV Management [DONE]

- [x] CV model (user, offer FK, company, content, is_adapted)
- [x] POST/GET endpoints
- [x] Link CV to specific offer
- [x] Tests (2 tests)

---

## Phase 9 — AI: CV Adaptation [DONE]

- [x] `adapt_cv()` in llm_service.py
- [x] POST `/users/{id}/offers/{offer_id}/adapt-cv`
- [x] Stores adapted CV in database (is_adapted=True)

---

## Phase 10 — AI: Skill Gap Analysis [DONE]

- [x] `analyze_skill_gap()` in llm_service.py
- [x] POST `/users/{id}/offers/{offer_id}/skill-gap`
- [x] Returns missing_hard_skills, missing_soft_skills, recommendations (JSON)

---

## Phase 11 — AI: Cover Letter Generation [DONE]

- [x] `generate_cover_letter()` in llm_service.py
- [x] POST `/users/{id}/offers/{offer_id}/cover-letter`
- [x] Uses user profile + offer + optional template

---

## Phase 12 — Refactoring [DONE]

- [x] Reorganize into FastAPI routers (users, profile, offers, cvs, templates, ai)
- [x] main.py is now a thin entry point
- [x] Shared test fixtures in conftest.py
- [x] 18 tests passing, mypy clean, 22 source files checked

---

## Phase 13 — Next Steps (TODO)

- [ ] Alembic migrations (proper schema versioning)
- [ ] User authentication (JWT or session-based)
- [ ] Tests for AI endpoints (mock Mistral calls)
- [ ] Dockerfile + docker-compose
- [ ] Frontend (TBD)
