# ARCHITECTURE.md

## High-Level Architecture

The application follows a typical modern web architecture:

Frontend
↓
FastAPI Backend
↓
Database + AI services

The backend orchestrates all operations.

---

## Core Components

### 1. Frontend

Responsibilities:

- user interface
- CV upload
- displaying offers
- displaying AI feedback

Technologies (TBD):

- React or simple web UI

---

### 2. Backend API

Built with FastAPI.

Responsibilities:

- user authentication
- CV processing
- job offer retrieval
- AI orchestration
- RAG pipeline

Main modules:
src/
api/
services/
models/
database/
rag/
utils/


---

### 3. Database

PostgreSQL will store:

Users  
CVs  
JobOffers  
Applications  
InterviewSessions  

SQLAlchemy is used as ORM.

Alembic manages migrations.

---

### 4. AI Layer

Uses models from Mistral.

Capabilities:

- CV analysis
- pitch generation
- interview simulation
- semantic matching

Embeddings are used for semantic search.

---

### 5. RAG System

The system will implement a Retrieval Augmented Generation pipeline.

Knowledge sources:

- job offers
- company descriptions
- interview questions

Pipeline:

User query  
↓  
Embedding search  
↓  
Relevant documents retrieval  
↓  
LLM generates contextual answer

---

### 6. Data Flow Example

User uploads CV

1. Backend extracts text
2. Skills are extracted
3. Embedding is generated
4. Stored in database

Later:

User searches for internships

1. Offers are embedded
2. Similarity search is performed
3. Ranked results returned

---

## Deployment

Docker containers:

- API container
- PostgreSQL container

Future options:

- cloud deployment