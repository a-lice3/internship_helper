# ARCHITECTURE.md

## High-Level Architecture

```
User (browser / curl / Swagger UI)
        │
        ▼
   FastAPI Backend (src/main.py)
        │
   ┌────┴────┐
   ▼         ▼
PostgreSQL   Mistral API
(SQLAlchemy) (llm_service.py)
```

---

## Project Structure

```
src/
├── main.py           # FastAPI app + route definitions (thin layer)
├── config.py         # Environment variables
├── database.py       # SQLAlchemy engine, Base, session, get_db()
├── models.py         # SQLAlchemy ORM models
├── schemas.py        # Pydantic request/response schemas
├── crud.py           # Database read/write operations
└── llm_service.py    # Mistral API wrapper
```

### Separation of Concerns

| Layer | File(s) | Role |
|-------|---------|------|
| Routing | `main.py` | HTTP endpoints, dependency injection |
| Validation | `schemas.py` | Request/response data shapes (Pydantic) |
| Business logic | `llm_service.py` | AI operations (Mistral calls) |
| Data access | `crud.py` | Database queries |
| Models | `models.py`, `database.py` | ORM table definitions |
| Config | `config.py` | Environment variables |

---

## Database Schema (Current)

```
users
├── id       (PK, int)
├── name     (str)
└── email    (str, unique)

cvs
├── id       (PK, int)
├── user_id  (int)
└── content  (text)
```

## Database Schema (MVP Target)

```
users
├── id, name, email

skills
├── id, user_id (FK), name, level

projects
├── id, user_id (FK), title, description, technologies

education
├── id, user_id (FK), school, degree, field, start_date, end_date

languages
├── id, user_id (FK), language, level

cover_letter_templates
├── id, user_id (FK), name, content

internship_offers
├── id, user_id (FK), company, title, link, locations
├── date_applied, status (applied/rejected/screened)
├── description

cvs
├── id, user_id (FK), offer_id (FK, nullable)
├── company, content
```

---

## API Endpoints

### Current

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create a user |
| GET | `/users/{id}` | Get a user by ID |
| POST | `/ask` | Ask a question to Mistral |

### MVP Target

| Method | Path | Description |
|--------|------|-------------|
| **Users** | | |
| POST | `/users` | Create user |
| GET | `/users/{id}` | Get user |
| **Profile data** | | |
| POST | `/users/{id}/skills` | Add a skill |
| GET | `/users/{id}/skills` | List user's skills |
| POST | `/users/{id}/projects` | Add a project |
| POST | `/users/{id}/education` | Add education |
| POST | `/users/{id}/languages` | Add a language |
| **Cover letter templates** | | |
| POST | `/users/{id}/templates` | Add a cover letter template |
| GET | `/users/{id}/templates` | List templates |
| **Internship offers** | | |
| POST | `/users/{id}/offers` | Add an internship offer |
| GET | `/users/{id}/offers` | List offers (with status filters) |
| PATCH | `/users/{id}/offers/{offer_id}` | Update offer status |
| **CVs** | | |
| POST | `/users/{id}/cvs` | Upload a CV (optionally linked to an offer) |
| GET | `/users/{id}/cvs` | List CVs |
| **AI features** | | |
| POST | `/ask` | General question to Mistral |
| POST | `/users/{id}/offers/{offer_id}/adapt-cv` | Adapt CV for a specific offer |
| POST | `/users/{id}/offers/{offer_id}/skill-gap` | Analyze what to work on for this offer |
| POST | `/users/{id}/offers/{offer_id}/cover-letter` | Generate cover letter draft |

---

## AI Features (Mistral)

| Feature | Input | Output |
|---------|-------|--------|
| CV adaptation | User CV + offer description | Adapted CV (profile, title, highlights) |
| Skill gap analysis | User skills + offer requirements | List of skills to develop |
| Cover letter draft | Offer + user templates + user profile | First draft of cover letter |

All AI calls go through `llm_service.py` which owns the Mistral client.

---

## Testing Strategy

- Tests use **SQLite in-memory** (no PostgreSQL needed)
- FastAPI's `dependency_overrides` swaps `get_db` for a test session
- Located in `tests/`
