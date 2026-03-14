# CLAUDE.md

## Project Overview

AI Career Companion is a web application designed to help students optimize their internship search using AI.

The application helps users:

- analyze and improve their CV
- match their profile with relevant internship offers
- adapt their CV and pitch to specific offers
- prepare interviews
- analyze trends in the internship/job market

The system integrates AI models from Mistral to perform:

- CV analysis
- text generation
- semantic search using embeddings
- document parsing using OCR

---

## Core Features

1. User profile and CV management
2. CV analysis and skill extraction
3. Internship offer aggregation
4. CV ↔ offer semantic matching
5. CV optimization for specific offers
6. Interview preparation assistant
7. Market intelligence (skills trends)

---

## Technology Stack

Backend:
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic

AI:
- Mistral models
- Mistral embeddings
- Mistral OCR

Infrastructure:
- Docker

Testing:
- Pytest

---

## Development Principles

- Modular architecture
- Clear separation of concerns
- Reproducible environments
- Incremental feature development
- Testable components

---

## Repository Structure

repo/

README.md  
CLAUDE.md  
ARCHITECTURE.md  
TASKS.md  

src/  
tests/  
docs/

---

## Coding Guidelines

- Use type hints
- Prefer small functions
- Keep services independent
- Use async where appropriate
- Write tests for core logic