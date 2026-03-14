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
- [x] Create User model
- [x] Auto-create tables on startup (Base.metadata.create_all)
- [x] Implement get_db() dependency

---

## Phase 3 — Basic User API [DONE]

- [x] POST /users (create user)
- [x] GET /users/{id} (get user)
- [x] Pydantic schemas (UserCreate, UserResponse)
- [x] CRUD functions in crud.py
- [x] Tests for user endpoints (3 tests passing)

---

## Phase 4 — Mistral Integration [DONE]

- [x] Setup Mistral client (llm_service.py)
- [x] POST /ask endpoint
- [x] Pydantic schemas (AskRequest, AskResponse)
- [x] Typed Mistral messages (mypy compatible)

---

## Phase 5 — User Profile Data Models

- [ ] Create SQLAlchemy models: Skill, Project, Education, Language
- [ ] Create Pydantic schemas for each
- [ ] CRUD operations for each
- [ ] API endpoints:
  - [ ] POST/GET `/users/{id}/skills`
  - [ ] POST/GET `/users/{id}/projects`
  - [ ] POST/GET `/users/{id}/education`
  - [ ] POST/GET `/users/{id}/languages`
- [ ] Tests

---

## Phase 6 — Cover Letter Templates

- [ ] Create CoverLetterTemplate model
- [ ] Pydantic schemas
- [ ] CRUD operations
- [ ] API endpoints:
  - [ ] POST/GET `/users/{id}/templates`
- [ ] Tests

---

## Phase 7 — Internship Offers

- [ ] Create InternshipOffer model (company, title, link, locations, date_applied, status, description)
- [ ] Status enum: applied / rejected / screened
- [ ] Pydantic schemas
- [ ] CRUD operations
- [ ] API endpoints:
  - [ ] POST/GET `/users/{id}/offers`
  - [ ] PATCH `/users/{id}/offers/{offer_id}` (update status)
- [ ] Tests

---

## Phase 8 — CV Management

- [ ] Update CV model (link to user + optional offer, company field)
- [ ] Pydantic schemas
- [ ] CRUD operations
- [ ] API endpoints:
  - [ ] POST/GET `/users/{id}/cvs`
- [ ] Tests

---

## Phase 9 — AI: CV Adaptation

- [ ] Add `adapt_cv()` in llm_service.py
- [ ] Takes user CV + offer description, returns adapted CV
- [ ] Endpoint: POST `/users/{id}/offers/{offer_id}/adapt-cv`
- [ ] Tests (mock Mistral)

---

## Phase 10 — AI: Skill Gap Analysis

- [ ] Add `analyze_skill_gap()` in llm_service.py
- [ ] Takes user skills + offer description, returns what to work on
- [ ] Endpoint: POST `/users/{id}/offers/{offer_id}/skill-gap`
- [ ] Tests (mock Mistral)

---

## Phase 11 — AI: Cover Letter Generation

- [ ] Add `generate_cover_letter()` in llm_service.py
- [ ] Takes offer + user templates + user profile, returns draft
- [ ] Endpoint: POST `/users/{id}/offers/{offer_id}/cover-letter`
- [ ] Tests (mock Mistral)

---

## Phase 12 — Polish & Deploy

- [ ] Alembic migrations
- [ ] User authentication
- [ ] Dockerfile + docker-compose
- [ ] Frontend (TBD)
