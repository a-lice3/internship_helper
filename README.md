# Internship Helper

A web app that helps students manage and optimize their internship search using AI (Mistral).

## Features (MVP)

- **Application tracking**: store internship offers with link, date, locations, status (applied/rejected/screened)
- **CV management**: store CVs per company and per offer
- **Profile storage**: skills, projects, education, languages, cover letter templates
- **AI-powered CV adaptation**: adapt your CV to match a specific offer (profile, job title, highlights)
- **Skill gap analysis**: upload an offer, get told what you need to work on
- **Cover letter drafts**: generate a first draft from your templates + the offer description

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **AI**: Mistral API (`mistral-small-2503`)
- **Quality**: pytest, black, ruff, mypy
- **CI**: GitHub Actions

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd internship_helper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Database
createdb career_db

# Environment
export MISTRAL_API_KEY="your-key-here"

# Run
uvicorn src.main:app --reload

# Open docs
open http://localhost:8000/docs
```

## Run Tests

```bash
pytest -v
```

## Run Quality Checks

```bash
black --check .
ruff check .
mypy .
```

## Project Structure

```
src/
├── main.py           # FastAPI routes
├── config.py         # Environment variables
├── database.py       # SQLAlchemy setup
├── models.py         # ORM models
├── schemas.py        # Pydantic schemas
├── crud.py           # Database operations
└── llm_service.py    # Mistral API wrapper
```

## Current Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create a user |
| GET | `/users/{id}` | Get a user |
| POST | `/ask` | Ask a question to Mistral |

See [TASKS.md](TASKS.md) for the full roadmap and [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
