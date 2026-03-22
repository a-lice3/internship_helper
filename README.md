# Job Seeker

Internship search assistant designed by the user, for the user. Its key feature? It allows you to generate, evaluate, and manage resumes and cover letters by tailoring them to each job posting. Above all, it is a version management tool for these documents.

As a bonus, it also offers pitch and interview simulation and evaluation, calendar management with reminders, and analysis of skill gaps for each opportunity.


## Features

### Onboarding
- 5-step guided onboarding for new users:
  1. Upload your CV (drag & drop PDF)
  2. AI analyzes and auto-fills your profile (skills, experiences, education, languages)
  3. Describe your dream job in natural language
  4. Browse AI-matched offers with relevance scores
  5. Auto-generate skill gap analysis and cover letter for your chosen offer
- Can be skipped at any step
- Followed by a congratulations animation and an interactive guided tour of the app

### Profile Management
- Store your complete profile: skills (by category), experiences, education, languages (with levels), extracurriculars
- Auto-fill your profile from an uploaded CV (PDF) using AI extraction

### Application Tracking
- Create and manage internship offers (company, title, description, link, locations)
- Track application status: bookmarked, applied, screened, interview, rejected, accepted
- Detailed offer view with notes, linked interviews, and AI actions
- Parse job descriptions automatically from pasted link

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
- Visual calendar view of application deadlines and interview dates

### Offer Pages
- Read the generated description of the company when Wikipedia found it 
- Check your generated skill gaps 
- Manage your generated Cover Letter and use feedback about your CV 
- Add notes to any offer to track thoughts, feedback, or follow-up info
- Add reminders linked to your offer

### CV Management
- Upload CVs in multiple formats: PDF, LaTeX (.tex), or LaTeX project (.zip)
- Mark a CV as default for quick access
- **AI-powered CV analysis**: general scoring with strengths, improvements, and summary
- **Offer-specific CV analysis**: match score, suggested title, profile summary, and recommendations
- Interactive LaTeX editor with live PDF preview
- AI-powered chat editing: describe changes in natural language, get updated LaTeX
- Compile LaTeX to PDF directly from the app

### Interview Simulation
- **Live mock interviews** via WebSocket with AI-generated questions in real time
- Configurable: type (HR, technical, behavioral, pitch), difficulty (junior/intermediate/advanced), language (EN/FR), duration (5–30 min)
- Optionally linked to a specific offer for tailored questions based on the job description and your profile
- **Voice recording**: record your answers with the mic, transcribed via Voxtral - timer pauses automatically during transcription
- **Real-time hints**: opt-in hints from the AI while you answer
- **Question prediction**: generate likely interview questions for a given offer before the session
- **Post-interview AI analysis**: overall, communication, confidence, technical, and behavioral scores; strengths, weaknesses, improvements; filler words analysis, STAR method feedback, per-question breakdown with suggested better answers
- **Progress tracking**: total sessions, average score, practice minutes, sessions this week, best/worst category, score trend

### AI-Powered Features
- **CV Analysis**: evaluate your CV for an offer or just in general
- **Cover Letter Generation**: generate a professional cover letter from your profile, an offer, and an optional template (~300 words)
- **Skill Gap Analysis**: compare your skills against an offer's requirements — get missing hard/soft skills and actionable recommendations
- **Offer Parsing**: practice your interviews with AI-generated questions
- **Offer Parsing**: paste a raw job description, get structured data (company, title, locations, description)

### Cover Letter Templates
- Store your cover letters by uploading PDFs (auto-extracted)
- Use them as a base for AI-generated cover letters

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
- **i18next** for internationalization (EN, FR, DE, ES)
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

# Create .env file (see "Environment variables" section below)
cp .env.example .env
# Edit .env with your values (at minimum: POSTGRES_USER, POSTGRES_PASSWORD, MISTRAL_API_KEY)

# Launch everything (backend + PostgreSQL + frontend)
docker compose up --build
```

That's it. Database migrations run automatically on startup.

- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

To stop: `Ctrl+C` or `docker compose down`
To reset the database: `docker compose down -v` then `docker compose up --build`

### Environment variables

#### Required

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `POSTGRES_USER` | PostgreSQL username (your choice) | — |
| `POSTGRES_PASSWORD` | PostgreSQL password (your choice) | — |
| `DATABASE_URL` | Connection string — must match `POSTGRES_USER` and `POSTGRES_PASSWORD` | — |
| `MISTRAL_API_KEY` | API key for all AI features | Create an account on [console.mistral.ai](https://console.mistral.ai/), go to **API Keys** and generate one |
| `JWT_SECRET_KEY` | Secret for signing auth tokens | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |

#### Optional — search sources

These enable additional internship search sources. **The app works fine without them** — search will simply use the sources that are configured (Welcome to the Jungle and The Muse work without any key).

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `FRANCE_TRAVAIL_CLIENT_ID` | France Travail (ex-Pole Emploi) API | Create an app on [francetravail.io/data/api](https://francetravail.io/data/api), subscribe to the **Offres d'emploi v2** API, then copy the Client ID and Client Secret |
| `FRANCE_TRAVAIL_CLIENT_SECRET` | | |

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

# Environment (see "Environment variables" section above)
cp .env.example .env
# Edit .env with your values (at minimum: POSTGRES_USER, POSTGRES_PASSWORD, MISTRAL_API_KEY)

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
│   │   ├── models.py              # 20 SQLAlchemy models
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
│   │   ├── App.tsx                # Login, routing, sidebar, onboarding gate, guided tour
│   │   ├── api.ts                 # API client (REST + WebSocket)
│   │   ├── i18n/                  # Internationalization (EN, FR, DE, ES)
│   │   ├── components/
│   │   │   └── GuidedTour.tsx         # Interactive post-onboarding tour
│   │   ├── hooks/
│   │   │   ├── useInterview.ts        # WebSocket interview state machine
│   │   │   └── useSpeechRecognition.ts # Mic recording + Voxtral transcription
│   │   └── pages/
│   │       ├── OnboardingFlow.tsx     # 5-step guided onboarding
│   │       ├── DashboardPage.tsx      # Stats, activity feed
│   │       ├── OffersPage.tsx         # Offer list with status filtering
│   │       ├── OfferDetailPage.tsx    # Full offer view + notes + AI actions
│   │       ├── SearchPage.tsx         # External offer search + smart matching
│   │       ├── ProfilePage.tsx        # Profile management
│   │       ├── CVsPage.tsx            # CV management + analysis
│   │       ├── TemplatesPage.tsx      # Cover letter templates
│   │       ├── AIPage.tsx             # AI features hub
│   │       ├── InterviewPage.tsx      # Mock interviews
│   │       ├── CalendarPage.tsx       # Calendar view
│   │       ├── RemindersPage.tsx      # Reminders management
│   │       └── SettingsPage.tsx       # User settings (language selector)
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml             # Multi-service orchestration (backend + db + frontend)
├── .github/workflows/ci.yml
└── README.md
```

## API Endpoints (~80+)

| Area | Examples |
|------|----------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/complete-onboarding` |
| **Users** | `POST /users`, `GET /users/{id}`, `GET /users/by-email/{email}` |
| **Profile** | Full CRUD for skills, experiences, education, languages, extracurriculars, AI instructions |
| **Offers** | `POST/GET/PATCH/DELETE /users/{id}/offers`, status filtering |
| **CVs** | Upload (PDF/tex/zip), download, compile PDF, chat edit, toggle default, analyze |
| **Templates** | Create from text or PDF upload, list, delete |
| **AI** | Adapt CV (text + LaTeX), skill gap analysis, cover letter generation, pitch analysis, offer parsing, profile auto-fill, CV analysis (general + offer-specific), AI chat search |
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

See [TASKS.md](TASKS.md) for the roadmap, [ARCHITECTURE.md](ARCHITECTURE.md) for technical details, and [ALEMBIC.md](ALEMBIC.md) for the database migration guide.
