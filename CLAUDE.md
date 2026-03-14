# CLAUDE.md

## Project Overview

Internship Helper is a web application that helps students manage and optimize their internship search using AI (Mistral).

For each user, the app:

- Stores CVs per company and per internship offer
- Tracks applications: link, date, location(s), status (applied/rejected/screened)
- Adapts CVs to specific offers using Mistral (profile, job title, etc.)
- Stores the user's skills, projects, education, languages (with levels), and cover letter templates
- Analyzes an uploaded offer and tells the user what skills to work on
- Generates a first draft of a cover letter from an offer + user's templates

---

## Technology Stack

Backend:
- Python 3.13
- FastAPI
- SQLAlchemy (ORM)
- PostgreSQL
- Pydantic (validation)

AI:
- Mistral API (`mistralai` SDK v2.0.2)
- Model: `mistral-small-2503`

Testing & Quality:
- pytest + httpx
- black (formatting)
- ruff (linting)
- mypy (type checking)

CI:
- GitHub Actions (`.github/workflows/ci.yml`)

---

## Repository Structure

```
internship_helper/
├── src/
│   ├── __init__.py
│   ├── config.py          # Environment variables (DATABASE_URL, MISTRAL_API_KEY)
│   ├── database.py         # SQLAlchemy engine, Base, User model, get_db()
│   ├── models.py           # SQLAlchemy models (User, CV)
│   ├── schemas.py          # Pydantic schemas (request/response validation)
│   ├── crud.py             # Database operations (create/read users)
│   ├── llm_service.py      # Mistral API wrapper (ask_mistral)
│   └── main.py             # FastAPI app, route definitions
├── tests/
│   ├── __init__.py
│   └── test_users.py       # Tests for POST /users, GET /users/{id}
├── .github/workflows/
│   └── ci.yml              # CI pipeline (black, ruff, mypy, pytest)
├── requirements.txt
├── mypy.ini
├── .gitignore
├── CLAUDE.md
├── ARCHITECTURE.md
├── TASKS.md
└── README.md
```

---

## Current State

What works:
- User CRUD (POST /users, GET /users/{id}) with PostgreSQL
- Mistral integration (POST /ask) with typed SDK usage
- Tests pass (3 tests, SQLite in-memory)
- mypy, black, ruff all pass
- CI pipeline configured

What's next:
- Data models for internship offers, applications, skills, projects, education, languages, cover letter templates
- Endpoints for CV and offer management
- AI-powered CV adaptation and cover letter generation
- Skill gap analysis from offers

---

## Coding Guidelines

- Use type hints everywhere
- Keep `main.py` minimal (routing only)
- Business logic in dedicated service files (e.g., `llm_service.py`)
- Pydantic schemas for all request/response bodies
- Use `mistralai.client.models` for typed Mistral messages (not raw dicts)
- Annotate Mistral message lists with the union type for mypy compatibility
- Tests use SQLite in-memory with dependency override
