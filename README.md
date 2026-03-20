# Internship Helper

A full-stack web application that helps students manage and optimize their internship search using AI (Mistral). Track applications, manage CVs, generate cover letters, analyze skill gaps, practice mock interviews, and refine your pitch — all in one place.

## Features

### Profile Management
- Store your complete profile: skills (by category), experiences, education, languages (with levels), extracurriculars
- Auto-fill your profile from an uploaded CV (PDF) using AI extraction
- Custom AI instructions to control how Mistral adapts your documents

### Application Tracking
- Create and manage internship offers (company, title, description, link, locations)
- Track application status: bookmarked, applied, screened, interview, rejected, accepted
- Detailed offer view with notes, linked interviews, and AI actions
- Parse job descriptions automatically from pasted text

### Offer Search & Scraping
- Search for internship offers from **3 external sources**:
  - **France Travail** (ex-Pole Emploi) via official API with OAuth2
  - **Welcome to the Jungle** (WTTJ) via Algolia search
  - **The Muse** API
- AI-powered **smart matching**: score scraped offers against your profile for relevance
- Save interesting offers directly to your tracking list

### Dashboard & Analytics
- Overview stats: total offers, average interview score, interview count
- Offers breakdown by status with visual progress bars
- Upcoming reminders with type and due date
- Recent activity feed (offers, interviews, reminders)

### Calendar & Reminders
- Visual calendar view of application deadlines and interview dates
- Reminders: deadline, follow-up, interview, and custom types with due dates
- Mark reminders as done

### Offer Notes
- Add notes to any offer to track thoughts, feedback, or follow-up info

### CV Management
- Upload CVs in multiple formats: PDF, LaTeX (.tex), or LaTeX project (.zip)
- Interactive LaTeX editor with live PDF preview
- AI-powered chat editing: describe changes in natural language, get updated LaTeX
- Compile LaTeX to PDF directly from the app

### Interview Simulation
- **Live mock interviews** via WebSocket with AI-generated questions in real time
- Configurable: type (HR, technical, behavioral, pitch), difficulty (junior/intermediate/advanced), language (EN/FR), duration (5–30 min)
- Optionally linked to a specific offer for tailored questions based on the job description and your profile
- **Voice recording**: record your answers with the mic, transcribed via Voxtral — timer pauses automatically during transcription
- **Real-time hints**: opt-in hints from the AI while you answer
- **Question prediction**: generate likely interview questions for a given offer before the session
- **Post-interview AI analysis**: overall, communication, confidence, technical, and behavioral scores; strengths, weaknesses, improvements; filler words analysis, STAR method feedback, per-question breakdown with suggested better answers
- **Progress tracking**: total sessions, average score, practice minutes, sessions this week, best/worst category, score trend

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
- All AI-generated content (cover letters, skill gaps, pitch analyses, interview analyses) is persisted and browsable
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
- Chat model: `mistral-small-2603` (CV adaptation, cover letters, interview questions, analysis)
- Audio transcription: `voxtral-mini-2602` (pitch analysis, interview voice answers)

### Frontend
- **React 19** with **TypeScript**, built with **Vite**
- **React Router** for navigation
- **docx** + **file-saver** for .docx export

### Infrastructure
- **Docker Compose** (3 services: PostgreSQL, backend, frontend)
- **Alembic** for database migrations (auto-run on container startup)

### Quality & CI
- **pytest** + **httpx** (tests with SQLite in-memory, 11 test files)
- **black** (formatting), **ruff** (linting), **mypy** (type checking)
- **GitHub Actions** CI pipeline

## Quick Start

### Option 1 — Docker (recommended)

The fastest way to get everything running. No need to install Python, Node, or PostgreSQL.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# Clone
git clone <repo-url>
cd internship_helper

# Create .env file with your secrets
cp .env.example .env
# Edit .env: add your MISTRAL_API_KEY and optionally a JWT_SECRET_KEY

# Launch everything (backend + PostgreSQL + frontend)
docker compose up --build
```

That's it. Database migrations run automatically on startup.

- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

To stop: `Ctrl+C` or `docker compose down`
To reset the database: `docker compose down -v` then `docker compose up --build`

### Option 2 — Local development (without Docker)

**Prerequisites:** Python 3.13, Node.js 22+, PostgreSQL 16 installed locally.

```bash
# Clone and setup
git clone <repo-url>
cd internship_helper

# Backend
cd backend
uv sync
cd ..

# Frontend
cd frontend
npm install
cd ..

# Database
createdb career_db

# Environment — create a .env file at the project root
cp .env.example .env
# Edit .env: add your MISTRAL_API_KEY and generate a JWT secret:
python -c "import secrets; print(secrets.token_hex(32))"

# Apply migrations
cd backend
uv run alembic upgrade head

# Run backend
uv run uvicorn src.main:app --reload

# Run frontend (separate terminal)
cd frontend
npm run dev
```

- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

## Run Tests

```bash
# Backend (pytest — integration tests with SQLite in-memory)
cd backend
uv run pytest -v

# Frontend (vitest — unit + component tests with jsdom)
cd frontend
npm test              # single run
npm run test:watch    # watch mode (re-runs on file changes)
```

## Run Quality Checks

```bash
cd backend
uv run black --check .
uv run ruff check .
uv run mypy .
```

## Project Structure

```
internship_helper/
├── backend/
│   ├── src/
│   │   ├── main.py                # FastAPI app, router registration, CORS
│   │   ├── config.py              # Environment variables
│   │   ├── auth.py                # JWT authentication (password hashing, token creation/verification)
│   │   ├── database.py            # SQLAlchemy engine & session
│   │   ├── models.py              # 18 SQLAlchemy models
│   │   ├── schemas.py             # 40+ Pydantic schemas
│   │   ├── crud.py                # Database operations
│   │   ├── llm_service.py         # Mistral AI functions (CV, cover letter, pitch, etc.)
│   │   ├── interview_service.py   # Interview AI functions (questions, analysis, hints)
│   │   ├── file_service.py        # PDF extraction, LaTeX compilation
│   │   ├── routers/
│   │   │   ├── auth.py            # Register, login, current user
│   │   │   ├── users.py           # User CRUD
│   │   │   ├── profile.py         # Skills, experiences, education, languages, extracurriculars
│   │   │   ├── offers.py          # Internship offer management
│   │   │   ├── cvs.py             # CV upload, edit, compile
│   │   │   ├── templates.py       # Cover letter templates
│   │   │   ├── ai.py              # AI endpoints (adapt, generate, analyze)
│   │   │   ├── interview.py       # Interview REST + WebSocket endpoints
│   │   │   ├── search.py          # Offer search/scraping (France Travail, WTTJ, The Muse)
│   │   │   ├── dashboard.py       # Dashboard stats
│   │   │   ├── reminders.py       # Reminder CRUD
│   │   │   └── notes.py           # Offer notes CRUD
│   │   └── scrapers/
│   │       ├── base.py            # Abstract OfferSource, RawOffer dataclass
│   │       ├── francetravail.py   # France Travail API (OAuth2 + token caching)
│   │       ├── wttj.py            # WTTJ / Algolia search
│   │       └── themuse.py         # The Muse API
│   ├── tests/                     # 11 test files (pytest + httpx)
│   ├── alembic/                   # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── alembic.ini
│   ├── pyproject.toml             # Python dependencies (managed by uv)
│   ├── uv.lock
│   ├── mypy.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Login, routing, sidebar navigation
│   │   ├── api.ts                 # API client (REST + WebSocket)
│   │   ├── hooks/
│   │   │   ├── useInterview.ts        # WebSocket interview state machine
│   │   │   └── useSpeechRecognition.ts # Mic recording + Voxtral transcription
│   │   └── pages/
│   │       ├── DashboardPage.tsx      # Stats, activity feed
│   │       ├── OffersPage.tsx         # Offer list with status filtering
│   │       ├── OfferDetailPage.tsx    # Full offer view + notes + AI actions
│   │       ├── SearchPage.tsx         # External offer search + smart matching
│   │       ├── ProfilePage.tsx        # Profile management
│   │       ├── CVsPage.tsx            # CV management
│   │       ├── TemplatesPage.tsx      # Cover letter templates
│   │       ├── AIPage.tsx             # AI features hub
│   │       ├── InterviewPage.tsx      # Mock interviews
│   │       ├── CalendarPage.tsx       # Calendar view
│   │       ├── RemindersPage.tsx      # Reminders management
│   │       └── SettingsPage.tsx       # User settings
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml             # Multi-service orchestration (backend + db + frontend)
├── .github/workflows/ci.yml
└── README.md
```

## API Endpoints (~80+)

| Area | Examples |
|------|----------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| **Users** | `POST /users`, `GET /users/{id}`, `GET /users/by-email/{email}` |
| **Profile** | Full CRUD for skills, experiences, education, languages, extracurriculars, AI instructions |
| **Offers** | `POST/GET/PATCH/DELETE /users/{id}/offers`, status filtering |
| **CVs** | Upload (PDF/tex/zip), download, compile PDF, chat edit |
| **Templates** | Create from text or PDF upload, list, delete |
| **AI** | Adapt CV (text + LaTeX), skill gap analysis, cover letter generation, pitch analysis, offer parsing, profile auto-fill |
| **Interview** | Create/list/delete sessions, view detail, run analysis, predict questions, progress stats, `WS /ws/interview/{id}` |
| **Search** | `POST /search/francetravail`, `/search/wttj`, `/search/themuse`, smart matching |
| **Dashboard** | `GET /users/{id}/dashboard` (stats, activity, reminders) |
| **Reminders** | `POST/GET/DELETE /users/{id}/reminders`, mark as done |
| **Notes** | `POST/GET/DELETE /users/{id}/offers/{offer_id}/notes` |

Full interactive documentation available at `/docs` when the server is running.

## Supported File Formats

| Type | Formats |
|------|---------|
| CVs | PDF, LaTeX (.tex), LaTeX project (.zip) |
| Templates | PDF, plain text |
| Audio (pitch & interview) | mp3, wav, webm, ogg, m4a, flac |

See [TASKS.md](TASKS.md) for the roadmap, [ARCHITECTURE.md](ARCHITECTURE.md) for technical details, and [ALEMBIC.md](ALEMBIC.md) for the database migration guide.
