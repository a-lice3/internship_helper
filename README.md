# Internship Helper

A full-stack web application that helps students manage and optimize their internship search using AI (Mistral). Track applications, manage CVs, generate cover letters, analyze skill gaps, and practice your pitch — all in one place.

## Features

### Profile Management
- Store your complete profile: skills (by category), experiences, education, languages (with levels), extracurriculars
- Auto-fill your profile from an uploaded CV (PDF) using AI extraction
- Custom AI instructions to control how Mistral adapts your documents

### Application Tracking
- Create and manage internship offers (company, title, description, link, locations)
- Track application status: applied, screened, interview, rejected, accepted
- Parse job descriptions automatically from pasted text

### CV Management
- Upload CVs in multiple formats: PDF, LaTeX (.tex), or LaTeX project (.zip)
- Interactive LaTeX editor with live PDF preview
- AI-powered chat editing: describe changes in natural language, get updated LaTeX
- Compile LaTeX to PDF directly from the app

### AI-Powered Features
- **CV Adaptation**: adapt a CV (plain text or LaTeX) to match a specific offer while preserving your style and structure. LaTeX adaptation includes auto-compilation and page count validation (1-page target with iterative shortening)
- **Cover Letter Generation**: generate a professional cover letter from your profile, an offer, and an optional template (~300 words)
- **Skill Gap Analysis**: compare your skills against an offer's requirements — get missing hard/soft skills and actionable recommendations
- **Pitch Analysis**: record or upload an audio pitch, get it transcribed and scored (structure, strengths, improvements, overall score 1-10). Works with or without offer context
- **Offer Parsing**: paste a raw job description, get structured data (company, title, locations, description)

### Cover Letter Templates
- Create templates from text or upload PDFs (auto-extracted)
- Use templates as a base for AI-generated cover letters

### History & Export
- All AI-generated content (cover letters, skill gaps, pitch analyses) is persisted and browsable
- Export cover letters as .docx
- Download compiled CVs as PDF

## Tech Stack

### Backend
- **Python 3.13**, **FastAPI**, **SQLAlchemy 2.0+**, **PostgreSQL**
- **Pydantic 2.0+** for request/response validation
- **pdfplumber** for PDF text extraction
- **pdflatex** / **tectonic** for LaTeX compilation

### AI
- **Mistral API** (`mistralai` SDK v2.0.2)
- Chat model: `mistral-small-2503`
- Audio transcription: `voxtral-mini-2602`

### Frontend
- **React 19** with **TypeScript**, built with **Vite**
- **docx** + **file-saver** for .docx export

### Quality & CI
- **pytest** + **httpx** (tests with SQLite in-memory)
- **black** (formatting), **ruff** (linting), **mypy** (type checking)
- **GitHub Actions** CI pipeline

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd internship_helper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd src/frontend
npm install
cd ../..

# Database
createdb career_db

# Environment
export DATABASE_URL="postgresql://localhost/career_db"
export MISTRAL_API_KEY="your-key-here"

# Run backend
uvicorn src.main:app --reload

# Run frontend (separate terminal)
cd src/frontend
npm run dev
```

Backend API docs: http://localhost:8000/docs
Frontend: http://localhost:5173

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
internship_helper/
├── src/
│   ├── main.py             # FastAPI app, router registration, CORS
│   ├── config.py           # Environment variables
│   ├── database.py         # SQLAlchemy engine & session
│   ├── models.py           # 11 SQLAlchemy models
│   ├── schemas.py          # 30+ Pydantic schemas
│   ├── crud.py             # Database operations
│   ├── llm_service.py      # 9 Mistral AI functions
│   ├── file_service.py     # PDF extraction, LaTeX compilation
│   ├── routers/
│   │   ├── users.py        # User CRUD
│   │   ├── profile.py      # Skills, experiences, education, languages, extracurriculars
│   │   ├── offers.py       # Internship offer management
│   │   ├── cvs.py          # CV upload, edit, compile
│   │   ├── templates.py    # Cover letter templates
│   │   └── ai.py           # All AI endpoints (adapt, generate, analyze)
│   └── frontend/
│       └── src/
│           ├── App.tsx      # Login, tab navigation
│           ├── api.ts       # API client
│           └── pages/
│               ├── ProfilePage.tsx
│               ├── OffersPage.tsx
│               ├── CVsPage.tsx
│               ├── TemplatesPage.tsx
│               └── AIPage.tsx
├── tests/
├── requirements.txt
├── mypy.ini
├── .github/workflows/ci.yml
└── CLAUDE.md
```

## API Endpoints (~70+)

| Area | Examples |
|------|----------|
| **Users** | `POST /users`, `GET /users/{id}`, `GET /users/by-email/{email}` |
| **Profile** | Full CRUD for skills, experiences, education, languages, extracurriculars, AI instructions |
| **Offers** | `POST/GET/PATCH/DELETE /users/{id}/offers`, status filtering |
| **CVs** | Upload (PDF/tex/zip), download, compile PDF, chat edit |
| **Templates** | Create from text or PDF upload, list, delete |
| **AI** | Adapt CV (text + LaTeX), skill gap analysis, cover letter generation, pitch analysis, offer parsing, profile auto-fill |

Full interactive documentation available at `/docs` when the server is running.

## Supported File Formats

| Type | Formats |
|------|---------|
| CVs | PDF, LaTeX (.tex), LaTeX project (.zip) |
| Templates | PDF, plain text |
| Audio (pitch) | mp3, wav, webm, ogg, m4a, flac |

See [TASKS.md](TASKS.md) for the roadmap and [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
