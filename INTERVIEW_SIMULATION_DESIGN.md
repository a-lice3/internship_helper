# Interview Simulation - Design Document

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Model Strategy](#2-model-strategy)
3. [API Design](#3-api-design)
4. [WebSocket Protocol](#4-websocket-protocol)
5. [Database Models](#5-database-models)
6. [Prompt Engineering](#6-prompt-engineering)
7. [Post-Interview Analysis](#7-post-interview-analysis)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Scoring System](#9-scoring-system)
10. [Additional Features](#10-additional-features)
11. [Implementation Order](#11-implementation-order)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                           │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Mic capture   │───>│ WebSocket    │───>│ Interview UI          │  │
│  │ (MediaRecorder│    │ client       │    │ - Live transcript     │  │
│  │  PCM chunks)  │<───│              │<───│ - AI question display │  │
│  └──────────────┘    └──────────────┘    │ - Timer / controls    │  │
│                                          └───────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ ws://localhost:8000/ws/interview/{session_id}
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                        BACKEND (FastAPI)                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   InterviewSessionManager                    │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │    │
│  │  │ Voxtral RT   │  │ Mistral Small │  │ Session State    │  │    │
│  │  │ (transcribe) │─>│ (AI recruiter)│─>│ (conversation,   │  │    │
│  │  │ WebSocket    │  │ chat.stream() │  │  scores, timing) │  │    │
│  │  └──────────────┘  └───────────────┘  └──────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Post-Interview Analysis Pipeline                │    │
│  │                                                              │    │
│  │  Full transcript ──> Voxtral Mini 2602 (offline, accurate)  │    │
│  │                 ──> Mistral Small (structured analysis)      │    │
│  │                 ──> JSON report + scores                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  PostgreSQL   │  Sessions, transcripts, analyses, scores         │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Flow

1. User selects: offer + interview type + difficulty + language
2. Backend creates a session, generates initial questions from the offer/profile
3. Frontend opens WebSocket, starts mic capture (PCM 16kHz)
4. Audio chunks stream to backend via WebSocket
5. Backend pipes audio to **Voxtral Realtime** for live transcription
6. When user finishes speaking (silence detection or manual "done"), backend sends transcript to **Mistral Small** to generate the next question
7. AI question is sent back via WebSocket (text, optionally TTS later)
8. Loop until interview ends (time limit or all questions asked)
9. Post-interview: full analysis with **Voxtral Mini 2602** (accurate re-transcription) + **Mistral Small** (structured feedback)

---

## 2. Model Strategy

| Model | ID | Role | Why |
|-------|-----|------|-----|
| **Voxtral Realtime** | `voxtral-mini-transcribe-realtime-2602` | Live transcription during interview | Ultra-low latency (~200ms), streams text as user speaks |
| **Voxtral Mini 2602** | `voxtral-mini-2602` | Post-interview re-transcription | Higher accuracy offline transcription, supports diarization |
| **Mistral Small** | `mistral-small-2503` | AI recruiter + analysis | Fast enough for conversational flow, good reasoning for analysis |

### Latency Budget Per Turn

```
User finishes speaking
  │
  ├─ Voxtral RT final segment arrives ........... ~200ms
  ├─ Mistral Small generates next question ....... ~800-1500ms (streaming)
  ├─ First tokens sent to frontend ............... ~100ms
  │
  Total time to first word of next question: ~1.1-1.8s
```

This is acceptable — a real recruiter also takes 1-2s to react.

### When to Use Each Model

- **During interview**: Voxtral Realtime (transcription) + Mistral Small streaming (recruiter AI)
- **Post-interview transcription**: Voxtral Mini 2602 offline (better accuracy, diarization)
- **Post-interview analysis**: Mistral Small (structured JSON analysis, scoring)

---

## 3. API Design

### REST Endpoints

```
# Session management
POST   /users/{user_id}/interview-sessions                    Create session
GET    /users/{user_id}/interview-sessions                    List sessions
GET    /users/{user_id}/interview-sessions/{session_id}       Get session details
DELETE /users/{user_id}/interview-sessions/{session_id}       Delete session

# Post-interview analysis (triggered after session ends)
POST   /users/{user_id}/interview-sessions/{session_id}/analyze    Run analysis
GET    /users/{user_id}/interview-sessions/{session_id}/analysis   Get analysis

# Question prediction (before interview)
POST   /users/{user_id}/offers/{offer_id}/predict-questions   Predict questions for offer
```

### WebSocket Endpoint

```
WS /ws/interview/{session_id}?token={user_id}
```

### Create Session Request/Response

```json
// POST /users/{user_id}/interview-sessions
// Request:
{
  "offer_id": 42,                          // optional - for offer-specific interview
  "interview_type": "hr",                  // "hr" | "technical" | "behavioral"
  "difficulty": "junior",                  // "junior" | "intermediate" | "advanced"
  "language": "fr",                        // "fr" | "en" | "auto"
  "duration_minutes": 15,                  // 10 | 15 | 20 | 30
  "enable_realtime_hints": false           // optional real-time feedback mode
}

// Response:
{
  "id": 1,
  "session_id": "uuid-abc-123",           // used for WebSocket connection
  "status": "created",
  "interview_type": "hr",
  "difficulty": "junior",
  "language": "fr",
  "duration_minutes": 15,
  "offer_title": "ML Engineer Intern",
  "company": "Mistral AI",
  "created_at": "2026-03-18T14:30:00Z"
}
```

---

## 4. WebSocket Protocol

### Connection Flow

```
Frontend                    Backend                     Voxtral RT        Mistral Small
   │                          │                            │                   │
   │── ws connect ──────────>│                            │                   │
   │<── session.ready ───────│                            │                   │
   │<── ai.question ─────────│  (first question)         │                   │
   │                          │                            │                   │
   │── audio.chunk ─────────>│── send_audio() ──────────>│                   │
   │── audio.chunk ─────────>│── send_audio() ──────────>│                   │
   │<── transcript.delta ────│<── TextDelta ──────────────│                   │
   │<── transcript.delta ────│<── TextDelta ──────────────│                   │
   │── turn.end ────────────>│── end_audio() ───────────>│                   │
   │                          │<── SegmentDelta (final) ──│                   │
   │                          │                            │                   │
   │                          │── chat.stream(transcript) ─────────────────>│
   │<── ai.thinking ─────────│                            │                   │
   │<── ai.question.delta ───│<── CompletionEvent ────────────────────────│
   │<── ai.question.delta ───│<── CompletionEvent ────────────────────────│
   │<── ai.question.done ────│<── [DONE] ─────────────────────────────────│
   │                          │                            │                   │
   │── audio.chunk ─────────>│  (next answer...)          │                   │
   │        ...               │                            │                   │
   │                          │                            │                   │
   │── interview.end ───────>│  (or timeout)              │                   │
   │<── interview.summary ───│                            │                   │
   │<── session.closed ──────│                            │                   │
```

### Message Types

#### Client -> Server

```json
// Start streaming audio
{ "type": "audio.chunk", "data": "<base64 PCM 16kHz mono>" }

// User signals they're done talking
{ "type": "turn.end" }

// User wants to skip current question
{ "type": "question.skip" }

// End the interview early
{ "type": "interview.end" }

// Request a hint (if realtime hints enabled)
{ "type": "hint.request" }
```

#### Server -> Client

```json
// Session is ready, interview begins
{ "type": "session.ready", "data": { "session_id": "uuid", "duration_minutes": 15 } }

// AI asks a question (streamed token by token)
{ "type": "ai.question", "data": { "question_number": 1, "total_questions": 8, "text": "Tell me about yourself." } }

// Streamed question tokens (for progressive display)
{ "type": "ai.question.delta", "data": { "text": "Tell me " } }
{ "type": "ai.question.done", "data": { "question_number": 1, "full_text": "Tell me about yourself and what interests you about this role." } }

// Live transcription of user's speech
{ "type": "transcript.delta", "data": { "text": "So I'm a student at..." } }
{ "type": "transcript.segment", "data": { "text": "So I'm a student at ENSAE, specializing in data science.", "is_final": true } }

// AI is processing next question
{ "type": "ai.thinking" }

// Real-time hint (if enabled)
{ "type": "hint", "data": { "text": "Try to give a concrete example here." } }

// Timer updates
{ "type": "timer", "data": { "elapsed_seconds": 120, "remaining_seconds": 780 } }

// Interview complete
{ "type": "interview.summary", "data": { "questions_answered": 6, "duration_seconds": 843 } }
{ "type": "session.closed", "data": { "reason": "completed" } }

// Errors
{ "type": "error", "data": { "message": "Transcription failed", "code": "VOXTRAL_ERROR" } }
```

---

## 5. Database Models

### New Models

```python
# src/models.py

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)  # UUID
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    offer_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_offers.id", ondelete="SET NULL"), nullable=True
    )

    # Configuration
    interview_type: Mapped[str] = mapped_column(String(20), nullable=False)  # hr/technical/behavioral
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)      # junior/intermediate/advanced
    language: Mapped[str] = mapped_column(String(5), nullable=False)         # fr/en
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    # State
    status: Mapped[str] = mapped_column(String(20), default="created")
    # created -> active -> completed -> analyzed

    # Denormalized offer info (survives offer deletion)
    offer_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="interview_sessions")
    offer: Mapped["InternshipOffer | None"] = relationship()
    turns: Mapped[list["InterviewTurn"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="InterviewTurn.turn_number"
    )
    analysis: Mapped["InterviewAnalysis | None"] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # AI question
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # motivation, experience, technical, behavioral, situational, closing

    # User answer
    answer_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False)

    # Per-turn scores (filled during analysis)
    clarity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)      # 0-100
    relevance_score: Mapped[int | None] = mapped_column(Integer, nullable=True)    # 0-100
    structure_score: Mapped[int | None] = mapped_column(Integer, nullable=True)    # 0-100
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    better_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session: Mapped["InterviewSession"] = relationship(back_populates="turns")


class InterviewAnalysis(Base):
    __tablename__ = "interview_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Global scores (0-100)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)
    technical_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    behavioral_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)

    # Structured feedback (JSON)
    strengths: Mapped[str] = mapped_column(Text, nullable=False)        # JSON list[str]
    weaknesses: Mapped[str] = mapped_column(Text, nullable=False)       # JSON list[str]
    improvements: Mapped[str] = mapped_column(Text, nullable=False)     # JSON list[str]

    # Text fields
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    filler_words_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    star_method_usage: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Full re-transcription (from Voxtral offline, more accurate)
    full_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session: Mapped["InterviewSession"] = relationship(back_populates="analysis")
```

### User Relationship Update

```python
# In the User model, add:
interview_sessions: Mapped[list["InterviewSession"]] = relationship(
    back_populates="user", cascade="all, delete-orphan"
)
```

---

## 6. Prompt Engineering

### System Prompt: AI Recruiter

```python
INTERVIEWER_SYSTEM_PROMPT = {
    "fr": """Tu es un recruteur professionnel qui fait passer un entretien {interview_type} \
pour un poste de {offer_title} chez {company}.

Niveau du candidat : {difficulty}.
Langue : Fais tout l'entretien en francais.

Regles strictes :
- Pose UNE SEULE question a la fois, courte et precise (2-3 phrases max)
- Adapte la difficulte au niveau {difficulty}
- Enchaine naturellement : rebondis sur la reponse precedente quand c'est pertinent
- Varie les types de questions : motivation, experience, technique, mise en situation
- Sois professionnel mais bienveillant
- Ne repete jamais une question deja posee
- Si la reponse est vague, demande de preciser avec un exemple concret
- Ne fais JAMAIS l'analyse de la reponse, pose juste la question suivante

{type_specific_instructions}

Profil du candidat :
{user_profile_summary}

Description du poste :
{offer_description}

Questions deja posees et reponses :
{conversation_history}

Pose la prochaine question.""",

    "en": """You are a professional recruiter conducting a {interview_type} interview \
for a {offer_title} position at {company}.

Candidate level: {difficulty}.
Language: Conduct the entire interview in English.

Strict rules:
- Ask ONE question at a time, short and precise (2-3 sentences max)
- Adapt difficulty to {difficulty} level
- Follow up naturally: build on the previous answer when relevant
- Vary question types: motivation, experience, technical, situational
- Be professional but approachable
- Never repeat a question already asked
- If the answer is vague, ask for a concrete example
- NEVER analyze the answer, just ask the next question

{type_specific_instructions}

Candidate profile:
{user_profile_summary}

Job description:
{offer_description}

Questions asked so far and answers:
{conversation_history}

Ask the next question."""
}
```

### Type-Specific Instructions

```python
TYPE_INSTRUCTIONS = {
    "hr": {
        "fr": """Focus sur : motivation, adéquation culturelle, projet professionnel, \
qualites/defauts, gestion du stress, travail en equipe. \
Commence par "Presentez-vous" ou "Parlez-moi de vous".""",
        "en": """Focus on: motivation, cultural fit, career goals, \
strengths/weaknesses, stress management, teamwork. \
Start with "Tell me about yourself"."""
    },
    "technical": {
        "fr": """Focus sur : competences techniques, resolution de problemes, \
projets passes, choix techniques, debugging, architecture. \
Pose des questions concretes sur les technologies mentionnees dans le profil et l'offre.""",
        "en": """Focus on: technical skills, problem solving, \
past projects, technical decisions, debugging, architecture. \
Ask concrete questions about technologies mentioned in the profile and job description."""
    },
    "behavioral": {
        "fr": """Focus sur : situations passees (methode STAR), leadership, \
conflits, echecs, adaptation, initiative. \
Chaque question doit commencer par "Racontez-moi une fois ou..." ou "Donnez-moi un exemple de...".""",
        "en": """Focus on: past situations (STAR method), leadership, \
conflicts, failures, adaptability, initiative. \
Each question should start with "Tell me about a time when..." or "Give me an example of..."."""
    }
}
```

### Difficulty Modifiers

```python
DIFFICULTY_MODIFIERS = {
    "junior": {
        "fr": "Adapte tes questions pour un stagiaire/junior. Pas de pieges, questions directes et encourageantes.",
        "en": "Adapt questions for an intern/junior. No trick questions, be direct and encouraging."
    },
    "intermediate": {
        "fr": "Questions de niveau intermediaire. Attends des reponses structurees avec exemples.",
        "en": "Intermediate-level questions. Expect structured answers with examples."
    },
    "advanced": {
        "fr": "Questions exigeantes. Challenge les reponses, demande de la profondeur, pose des questions pieges.",
        "en": "Demanding questions. Challenge answers, ask for depth, include curveball questions."
    }
}
```

### First Question Generation

```python
FIRST_QUESTION_PROMPT = """Based on the interview type ({interview_type}), difficulty ({difficulty}), \
and the job description below, generate the opening question for this interview.

Job: {offer_title} at {company}
Description: {offer_description}

Return ONLY the question text, nothing else."""
```

### Prompt: Post-Interview Analysis

```python
ANALYSIS_SYSTEM_PROMPT = {
    "fr": """Tu es un coach en entretien d'embauche expert. Analyse cet entretien \
pour un poste de {offer_title} chez {company}.

Type d'entretien : {interview_type}
Niveau attendu : {difficulty}

Voici la transcription complete de l'entretien :

{full_transcript}

Analyse chaque reponse du candidat et fournis un rapport structure en JSON :

{{
  "overall_score": <0-100>,
  "communication_score": <0-100>,
  "technical_score": <0-100 ou null si non applicable>,
  "behavioral_score": <0-100 ou null si non applicable>,
  "confidence_score": <0-100>,
  "strengths": ["point fort 1", "point fort 2", ...],
  "weaknesses": ["point faible 1", "point faible 2", ...],
  "improvements": ["conseil concret 1", "conseil concret 2", ...],
  "summary": "Resume global en 3-4 phrases",
  "filler_words_analysis": "Analyse des mots de remplissage (euh, donc, voila...)",
  "star_method_usage": "Evaluation de l'utilisation de la methode STAR",
  "per_turn_feedback": [
    {{
      "turn_number": 1,
      "clarity_score": <0-100>,
      "relevance_score": <0-100>,
      "structure_score": <0-100>,
      "feedback": "Commentaire sur cette reponse",
      "better_answer": "Exemple de meilleure reponse possible"
    }}
  ]
}}

Sois precis, concret et constructif. Donne des exemples de meilleures reponses.
Reponds UNIQUEMENT avec le JSON, sans markdown.""",

    "en": """You are an expert interview coach. Analyze this interview \
for a {offer_title} position at {company}.

Interview type: {interview_type}
Expected level: {difficulty}

Full interview transcript:

{full_transcript}

Analyze each candidate answer and provide a structured JSON report:

{{
  "overall_score": <0-100>,
  "communication_score": <0-100>,
  "technical_score": <0-100 or null if not applicable>,
  "behavioral_score": <0-100 or null if not applicable>,
  "confidence_score": <0-100>,
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "improvements": ["concrete advice 1", "concrete advice 2", ...],
  "summary": "Overall summary in 3-4 sentences",
  "filler_words_analysis": "Analysis of filler words (um, like, you know...)",
  "star_method_usage": "Evaluation of STAR method usage",
  "per_turn_feedback": [
    {{
      "turn_number": 1,
      "clarity_score": <0-100>,
      "relevance_score": <0-100>,
      "structure_score": <0-100>,
      "feedback": "Comment on this answer",
      "better_answer": "Example of a better possible answer"
    }}
  ]
}}

Be precise, concrete and constructive. Provide example better answers.
Respond ONLY with the JSON, no markdown."""
}
```

### Prompt: Real-Time Hints

```python
HINT_PROMPT = """The candidate is answering the following interview question:
"{question}"

Their answer so far:
"{partial_transcript}"

They're struggling. Give ONE short hint (1 sentence max) to help them structure their answer.
Do not give the answer, just a nudge. Language: {language}.

Examples of good hints:
- "Try giving a specific example from a past project."
- "Structure your answer: situation, action, result."
- "Focus on what YOU did, not the team."

Hint:"""
```

### Prompt: Question Prediction

```python
PREDICT_QUESTIONS_PROMPT = """Based on this job description, predict the {count} most likely \
interview questions a recruiter would ask.

Job: {offer_title} at {company}
Description: {offer_description}

Interview type: {interview_type}
Candidate level: {difficulty}

Return a JSON array of objects:
[
  {{
    "question": "The question text",
    "category": "motivation|experience|technical|behavioral|situational",
    "difficulty": "easy|medium|hard",
    "tip": "Brief tip on how to answer well"
  }}
]

Language: {language}. Return ONLY the JSON array."""
```

---

## 7. Post-Interview Analysis Pipeline

### Step-by-Step Flow

```
Interview ends (WebSocket closes)
        │
        ▼
Step 1: Collect all audio chunks stored during session
        │
        ▼
Step 2: Re-transcribe with Voxtral Mini 2602 (offline, higher accuracy)
        - Enable diarization to separate interviewer text vs candidate speech
        - This gives a cleaner transcript than the realtime one
        │
        ▼
Step 3: Build full transcript with turn markers
        "Q1 [Recruiter]: Tell me about yourself.
         A1 [Candidate]: I'm a data science student at ENSAE..."
        │
        ▼
Step 4: Send to Mistral Small with ANALYSIS_SYSTEM_PROMPT
        - Gets back structured JSON with scores and feedback
        │
        ▼
Step 5: Parse JSON, populate InterviewAnalysis + per-turn scores in InterviewTurn
        │
        ▼
Step 6: Save to database, return to frontend
```

### Analysis JSON Response Schema

```json
{
  "overall_score": 72,
  "communication_score": 78,
  "technical_score": 65,
  "behavioral_score": null,
  "confidence_score": 70,
  "strengths": [
    "Good knowledge of Python and ML frameworks",
    "Gave concrete project examples",
    "Showed genuine enthusiasm for the company"
  ],
  "weaknesses": [
    "Answers were too long, lacked conciseness",
    "Used filler words frequently (euh, voila)",
    "Did not use STAR method for situational questions"
  ],
  "improvements": [
    "Practice 30-second elevator pitch for 'tell me about yourself'",
    "For each project, prepare: context (1 sentence), action (2 sentences), result (1 sentence)",
    "Record yourself and count filler words - aim to reduce by 50%"
  ],
  "summary": "Solid technical foundation with good project examples. Main areas for improvement are answer structure and conciseness. The candidate shows potential but needs to practice delivering structured, time-boxed responses.",
  "filler_words_analysis": "Detected 23 filler words in 12 minutes. Most common: 'euh' (12x), 'donc' (6x), 'voila' (5x). This is above average and can signal nervousness.",
  "star_method_usage": "STAR method was partially used in 2 out of 4 behavioral questions. Situation and Task were usually clear, but Action and Result were often merged or missing.",
  "per_turn_feedback": [
    {
      "turn_number": 1,
      "clarity_score": 65,
      "relevance_score": 80,
      "structure_score": 55,
      "feedback": "Your self-introduction was too long (2.5 minutes). It covered good points but lacked structure. A recruiter wants 60-90 seconds max.",
      "better_answer": "I'm [name], a final-year data science student at ENSAE. I've focused on NLP and ML through two internships: one at [X] where I built a text classification pipeline, and one at [Y] on recommendation systems. I'm applying to Mistral because I want to work on cutting-edge language models in a fast-paced environment."
    }
  ]
}
```

---

## 8. Frontend Architecture

### New Page: InterviewPage.tsx

```
┌─────────────────────────────────────────────────────────────┐
│  Interview Simulation                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── Setup Panel (before start) ──────────────────────┐    │
│  │                                                      │    │
│  │  Offer:      [Dropdown: select offer or "General"] │    │
│  │  Type:       [HR] [Technical] [Behavioral]          │    │
│  │  Difficulty: [Junior] [Intermediate] [Advanced]     │    │
│  │  Language:   [FR] [EN]                              │    │
│  │  Duration:   [10min] [15min] [20min] [30min]        │    │
│  │                                                      │    │
│  │  [Predict Questions]   [Start Interview]             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─── Interview Panel (during) ────────────────────────┐    │
│  │                                                      │    │
│  │  ⏱ 03:24 / 15:00          Question 3/8             │    │
│  │                                                      │    │
│  │  ┌─ Recruiter ─────────────────────────────────┐    │    │
│  │  │ "Can you tell me about a challenging         │    │    │
│  │  │  project where you had to learn a new        │    │    │
│  │  │  technology quickly?"                         │    │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │  ┌─ Your answer (live transcript) ──────────────┐   │    │
│  │  │ "During my internship at Dataiku, I had to   │   │    │
│  │  │  learn Spark in two weeks because..."         │   │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │  🎙 Recording...                                     │    │
│  │                                                      │    │
│  │  [Done Speaking]  [Skip Question]  [End Interview]  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─── Results Panel (after) ───────────────────────────┐    │
│  │                                                      │    │
│  │  Overall Score: 72/100  ████████░░░░                │    │
│  │                                                      │    │
│  │  Communication: 78  Technical: 65  Confidence: 70   │    │
│  │                                                      │    │
│  │  [Strengths] [Weaknesses] [Improvements]            │    │
│  │  [Per-Question Breakdown]                           │    │
│  │  [Full Transcript]                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─── History ─────────────────────────────────────────┐    │
│  │  Previous interviews with scores and trends          │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### WebSocket Client (TypeScript)

```typescript
// Key state management
interface InterviewState {
  status: "setup" | "connecting" | "active" | "processing" | "results";
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  liveTranscript: string;
  turns: Array<{ question: string; answer: string }>;
  elapsedSeconds: number;
  remainingSeconds: number;
}

// WebSocket message handler
function handleMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "session.ready":
      setState({ status: "active" });
      break;
    case "ai.question":
    case "ai.question.done":
      setState({ currentQuestion: msg.data.full_text });
      break;
    case "ai.question.delta":
      setState(s => ({ currentQuestion: s.currentQuestion + msg.data.text }));
      break;
    case "transcript.delta":
      setState(s => ({ liveTranscript: s.liveTranscript + msg.data.text }));
      break;
    case "transcript.segment":
      if (msg.data.is_final) {
        setState(s => ({ liveTranscript: msg.data.text }));
      }
      break;
    case "ai.thinking":
      setState({ status: "processing" });
      break;
    case "interview.summary":
      setState({ status: "results" });
      break;
  }
}

// Audio capture and streaming
async function startAudioCapture(ws: WebSocket) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const float32 = e.inputBuffer.getChannelData(0);
    const pcm16 = float32ToPcm16(float32);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
    ws.send(JSON.stringify({ type: "audio.chunk", data: base64 }));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
}
```

---

## 9. Scoring System

### Per-Turn Scores (0-100)

| Metric | What it measures | Weight |
|--------|-----------------|--------|
| **Clarity** | Clear expression, no rambling, logical flow | 30% |
| **Relevance** | Answers the actual question asked | 40% |
| **Structure** | STAR method, intro-body-conclusion pattern | 30% |

### Global Scores (0-100)

| Metric | Components |
|--------|-----------|
| **Overall** | Weighted average of all per-turn scores + global factors |
| **Communication** | Average clarity across turns + filler word penalty |
| **Technical** | Accuracy of technical answers (null for HR interviews) |
| **Behavioral** | STAR usage + concrete examples (null for pure technical) |
| **Confidence** | Hesitation frequency, answer length consistency, directness |

### Score Interpretation

```
90-100: Excellent - Ready for the real interview
75-89:  Good - Minor improvements needed
60-74:  Average - Practice specific areas
40-59:  Needs work - Focus on fundamentals
0-39:   Significant preparation needed
```

### Filler Word Detection

Detected via transcript pattern matching (not AI — faster and deterministic):

```python
FILLER_WORDS = {
    "fr": ["euh", "heu", "ben", "donc", "voila", "en fait", "genre", "du coup", "bah"],
    "en": ["um", "uh", "like", "you know", "basically", "actually", "so yeah", "right", "I mean"]
}
```

---

## 10. Additional Features

### 10.1 Pitch Training Mode

Reuses the existing pitch analysis infrastructure but with structured timing:

```json
// POST /users/{user_id}/interview-sessions
{
  "interview_type": "pitch",
  "difficulty": "junior",
  "language": "fr",
  "duration_minutes": 2,
  "offer_id": 42
}
```

The AI doesn't ask questions — it just listens for 1-2 minutes, then scores:
- Timing (did they use the full time? Too short? Too long?)
- Structure (intro, background, motivation, closing)
- Hook quality (did they grab attention in the first 10 seconds?)

### 10.2 Real-Time Hints

When `enable_realtime_hints: true`:
- Every 15 seconds of speaking, backend sends partial transcript to Mistral Small
- If the answer seems off-track or too vague, a short hint is sent via WebSocket
- Hints appear as subtle UI toasts, not interruptions

### 10.3 Progress Tracking

```json
// GET /users/{user_id}/interview-progress
{
  "total_sessions": 12,
  "average_score": 68,
  "score_trend": [55, 60, 58, 65, 72, 68],  // last 6 sessions
  "best_category": "communication",
  "worst_category": "structure",
  "total_practice_minutes": 187,
  "sessions_this_week": 3,
  "improvements_over_time": {
    "filler_words_per_minute": [8.2, 6.5, 5.1, 4.3],
    "average_answer_length_seconds": [95, 82, 70, 65],
    "star_method_usage_percent": [20, 35, 50, 60]
  }
}
```

### 10.4 Question Prediction

Pre-interview feature — before starting, user can see predicted questions:

```json
// POST /users/{user_id}/offers/{offer_id}/predict-questions
// Request:
{ "interview_type": "hr", "difficulty": "junior", "count": 10 }

// Response:
[
  {
    "question": "Tell me about yourself and why you're interested in this internship.",
    "category": "motivation",
    "difficulty": "easy",
    "tip": "Keep it under 90 seconds. Structure: background, relevant experience, why this company."
  },
  {
    "question": "What's a technical challenge you faced in a project and how did you solve it?",
    "category": "technical",
    "difficulty": "medium",
    "tip": "Use the STAR method. Focus on YOUR contribution, not the team's."
  }
]
```

### 10.5 Best Answer Generator

After analysis, for each question, the user can click "Show better answer":

This is already handled in the `per_turn_feedback[].better_answer` field of the analysis. The AI generates a model answer adapted to the user's actual profile (not a generic one).

---

## 11. Implementation Order

### Phase 1: Core Backend (estimated: ~3-4 days)

```
1. Database models (InterviewSession, InterviewTurn, InterviewAnalysis)
2. Schemas (Pydantic request/response)
3. CRUD operations
4. REST endpoints (create session, list, get, delete)
5. Question prediction endpoint (standalone, no WebSocket needed)
```

**Files to create/modify:**
- `src/models.py` — add 3 models
- `src/schemas.py` — add ~10 schemas
- `src/crud.py` — add session/turn/analysis CRUD
- `src/routers/interview.py` — new router
- `src/main.py` — register router

### Phase 2: WebSocket Interview Engine (~4-5 days)

```
1. Install websockets: pip install 'mistralai[realtime]'
2. Interview session manager (state machine)
3. WebSocket endpoint with audio streaming
4. Voxtral Realtime integration (live transcription)
5. Mistral Small integration (AI recruiter, streaming questions)
6. Turn management (silence detection, turn.end handling)
7. Timer and session lifecycle
```

**Files to create/modify:**
- `src/interview_service.py` — new: session manager, Voxtral RT, recruiter logic
- `src/routers/interview.py` — add WebSocket endpoint
- `requirements.txt` — add `websockets>=13.0`

### Phase 3: Post-Interview Analysis (~2-3 days)

```
1. Audio storage during interview (buffer chunks)
2. Voxtral offline re-transcription
3. Mistral Small analysis with structured JSON
4. Per-turn scoring and feedback
5. Filler word detection
6. Save to database
```

**Files to modify:**
- `src/interview_service.py` — add analysis pipeline
- `src/llm_service.py` — add analysis prompts

### Phase 4: Frontend (~4-5 days)

```
1. InterviewPage.tsx — setup panel
2. WebSocket client hook (useInterview)
3. Audio capture (PCM 16kHz via AudioContext)
4. Live interview UI (question display, transcript, timer)
5. Results panel (scores, feedback, per-question breakdown)
6. History list with score trends
7. Question prediction display
```

**Files to create/modify:**
- `src/frontend/src/pages/InterviewPage.tsx` — new page
- `src/frontend/src/hooks/useInterview.ts` — new WebSocket hook
- `src/frontend/src/api.ts` — add interview API calls
- `src/frontend/src/App.tsx` — add tab

### Phase 5: Polish & Extras (~2-3 days)

```
1. Real-time hints mode
2. Pitch training mode (reuse session with type="pitch")
3. Progress tracking endpoint + frontend chart
4. Multilingual auto-detection
5. Error handling and reconnection logic
```

---

## Dependencies to Install

```bash
# Backend
pip install 'mistralai[realtime]'   # adds websockets>=13.0
pip install websockets              # if not pulled in automatically

# Frontend (no new deps needed - WebSocket is built into browsers)
```
