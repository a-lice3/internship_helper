"""Interview simulation service: prompts, AI interviewer, analysis pipeline."""

import json
import logging
import re
from collections import Counter

from mistralai.client.models.assistantmessage import AssistantMessage
from mistralai.client.models.systemmessage import SystemMessage
from mistralai.client.models.usermessage import UserMessage

from src.llm_service import Messages, _chat, _chat_async, _strip_markdown_fences, client, MODEL

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Filler words
# ---------------------------------------------------------------------------

FILLER_WORDS: dict[str, list[str]] = {
    "fr": [
        "euh",
        "heu",
        "ben",
        "donc",
        "voila",
        "en fait",
        "genre",
        "du coup",
        "bah",
    ],
    "en": [
        "um",
        "uh",
        "like",
        "you know",
        "basically",
        "actually",
        "so yeah",
        "right",
        "i mean",
    ],
}

# ---------------------------------------------------------------------------
# Type-specific instructions
# ---------------------------------------------------------------------------

TYPE_INSTRUCTIONS: dict[str, dict[str, str]] = {
    "hr": {
        "fr": (
            "Focus sur : motivation, adequation culturelle, projet professionnel, "
            "qualites/defauts, gestion du stress, travail en equipe. "
            'Commence par "Presentez-vous" ou "Parlez-moi de vous".'
        ),
        "en": (
            "Focus on: motivation, cultural fit, career goals, "
            "strengths/weaknesses, stress management, teamwork. "
            'Start with "Tell me about yourself".'
        ),
    },
    "technical": {
        "fr": (
            "Focus sur : competences techniques, resolution de problemes, "
            "projets passes, choix techniques, debugging, architecture. "
            "Pose des questions concretes sur les technologies mentionnees "
            "dans le profil et l'offre."
        ),
        "en": (
            "Focus on: technical skills, problem solving, "
            "past projects, technical decisions, debugging, architecture. "
            "Ask concrete questions about technologies mentioned in the "
            "profile and job description."
        ),
    },
    "behavioral": {
        "fr": (
            "Focus sur : situations passees (methode STAR), leadership, "
            "conflits, echecs, adaptation, initiative. "
            'Chaque question doit commencer par "Racontez-moi une fois ou..." '
            'ou "Donnez-moi un exemple de...".'
        ),
        "en": (
            "Focus on: past situations (STAR method), leadership, "
            "conflicts, failures, adaptability, initiative. "
            'Each question should start with "Tell me about a time when..." '
            'or "Give me an example of...".'
        ),
    },
    "pitch": {
        "fr": "Demande au candidat de se presenter en 1 a 2 minutes. Ne pose pas de questions supplementaires.",
        "en": "Ask the candidate for a 1-2 minute self-introduction. Do not ask follow-up questions.",
    },
}

DIFFICULTY_MODIFIERS: dict[str, dict[str, str]] = {
    "junior": {
        "fr": "Adapte tes questions pour un stagiaire/junior. Pas de pieges, questions directes et encourageantes.",
        "en": "Adapt questions for an intern/junior. No trick questions, be direct and encouraging.",
    },
    "intermediate": {
        "fr": "Questions de niveau intermediaire. Attends des reponses structurees avec exemples.",
        "en": "Intermediate-level questions. Expect structured answers with examples.",
    },
    "advanced": {
        "fr": "Questions exigeantes. Challenge les reponses, demande de la profondeur, pose des questions pieges.",
        "en": "Demanding questions. Challenge answers, ask for depth, include curveball questions.",
    },
}

# ---------------------------------------------------------------------------
# Interviewer system prompt
# ---------------------------------------------------------------------------

INTERVIEWER_SYSTEM_PROMPT: dict[str, str] = {
    "fr": (
        "Tu es un recruteur professionnel qui fait passer un entretien {interview_type} "
        "pour un poste de {offer_title} chez {company}.\n\n"
        "Niveau du candidat : {difficulty}.\n"
        "Langue : Fais tout l'entretien en francais.\n\n"
        "Regles strictes :\n"
        "- Pose UNE SEULE question a la fois, courte et precise (2-3 phrases max)\n"
        "- Adapte la difficulte au niveau {difficulty}\n"
        "- Enchaine naturellement : rebondis sur la reponse precedente quand c'est pertinent\n"
        "- Varie les types de questions : motivation, experience, technique, mise en situation\n"
        "- Sois professionnel mais bienveillant\n"
        "- Ne repete jamais une question deja posee\n"
        "- Si la reponse est vague, demande de preciser avec un exemple concret\n"
        "- Ne fais JAMAIS l'analyse de la reponse, pose juste la question suivante\n\n"
        "{type_instructions}\n\n"
        "{difficulty_instructions}\n\n"
        "Profil du candidat :\n{user_profile}\n\n"
        "Description du poste :\n{offer_description}"
    ),
    "en": (
        "You are a professional recruiter conducting a {interview_type} interview "
        "for a {offer_title} position at {company}.\n\n"
        "Candidate level: {difficulty}.\n"
        "Language: Conduct the entire interview in English.\n\n"
        "Strict rules:\n"
        "- Ask ONE question at a time, short and precise (2-3 sentences max)\n"
        "- Adapt difficulty to {difficulty} level\n"
        "- Follow up naturally: build on the previous answer when relevant\n"
        "- Vary question types: motivation, experience, technical, situational\n"
        "- Be professional but approachable\n"
        "- Never repeat a question already asked\n"
        "- If the answer is vague, ask for a concrete example\n"
        "- NEVER analyze the answer, just ask the next question\n\n"
        "{type_instructions}\n\n"
        "{difficulty_instructions}\n\n"
        "Candidate profile:\n{user_profile}\n\n"
        "Job description:\n{offer_description}"
    ),
}

# ---------------------------------------------------------------------------
# Analysis prompt
# ---------------------------------------------------------------------------

ANALYSIS_SYSTEM_PROMPT: dict[str, str] = {
    "fr": (
        "Tu es un coach en entretien d'embauche expert. Analyse cet entretien "
        "pour un poste de {offer_title} chez {company}.\n\n"
        "Type d'entretien : {interview_type}\n"
        "Niveau attendu : {difficulty}\n\n"
        "Voici la transcription complete de l'entretien :\n\n"
        "{full_transcript}\n\n"
        "Analyse chaque reponse du candidat et fournis un rapport structure en JSON :\n\n"
        "{{\n"
        '  "overall_score": <0-100>,\n'
        '  "communication_score": <0-100>,\n'
        '  "technical_score": <0-100 ou null si non applicable>,\n'
        '  "behavioral_score": <0-100 ou null si non applicable>,\n'
        '  "confidence_score": <0-100>,\n'
        '  "strengths": ["point fort 1", "point fort 2"],\n'
        '  "weaknesses": ["point faible 1", "point faible 2"],\n'
        '  "improvements": ["conseil concret 1", "conseil concret 2"],\n'
        '  "summary": "Resume global en 3-4 phrases",\n'
        '  "star_method_usage": "Evaluation de la methode STAR",\n'
        '  "per_turn_feedback": [\n'
        "    {{\n"
        '      "turn_number": 1,\n'
        '      "clarity_score": <0-100>,\n'
        '      "relevance_score": <0-100>,\n'
        '      "structure_score": <0-100>,\n'
        '      "feedback": "Commentaire sur cette reponse",\n'
        '      "better_answer": "Exemple de meilleure reponse"\n'
        "    }}\n"
        "  ]\n"
        "}}\n\n"
        "Sois precis, concret et constructif. Reponds UNIQUEMENT avec le JSON, sans markdown."
    ),
    "en": (
        "You are an expert interview coach. Analyze this interview "
        "for a {offer_title} position at {company}.\n\n"
        "Interview type: {interview_type}\n"
        "Expected level: {difficulty}\n\n"
        "Full interview transcript:\n\n"
        "{full_transcript}\n\n"
        "Analyze each candidate answer and provide a structured JSON report:\n\n"
        "{{\n"
        '  "overall_score": <0-100>,\n'
        '  "communication_score": <0-100>,\n'
        '  "technical_score": <0-100 or null if not applicable>,\n'
        '  "behavioral_score": <0-100 or null if not applicable>,\n'
        '  "confidence_score": <0-100>,\n'
        '  "strengths": ["strength 1", "strength 2"],\n'
        '  "weaknesses": ["weakness 1", "weakness 2"],\n'
        '  "improvements": ["concrete advice 1", "concrete advice 2"],\n'
        '  "summary": "Overall summary in 3-4 sentences",\n'
        '  "star_method_usage": "Evaluation of STAR method usage",\n'
        '  "per_turn_feedback": [\n'
        "    {{\n"
        '      "turn_number": 1,\n'
        '      "clarity_score": <0-100>,\n'
        '      "relevance_score": <0-100>,\n'
        '      "structure_score": <0-100>,\n'
        '      "feedback": "Comment on this answer",\n'
        '      "better_answer": "Example of a better answer"\n'
        "    }}\n"
        "  ]\n"
        "}}\n\n"
        "Be precise, concrete and constructive. Respond ONLY with the JSON, no markdown."
    ),
}

# ---------------------------------------------------------------------------
# Hint prompt
# ---------------------------------------------------------------------------

HINT_PROMPT = (
    "The candidate is answering the following interview question:\n"
    '"{question}"\n\n'
    "Their answer so far:\n"
    '"{partial_transcript}"\n\n'
    "They seem to be struggling. Give ONE short hint (1 sentence max) to help "
    "them structure their answer. Do not give the answer, just a nudge. "
    "Language: {language}.\n\nHint:"
)

# ---------------------------------------------------------------------------
# Question prediction prompt
# ---------------------------------------------------------------------------

PREDICT_QUESTIONS_PROMPT = (
    "Based on this job description, predict the {count} most likely "
    "interview questions a recruiter would ask.\n\n"
    "Job: {offer_title} at {company}\n"
    "Description: {offer_description}\n\n"
    "Interview type: {interview_type}\n"
    "Candidate level: {difficulty}\n\n"
    "Return a JSON array of objects:\n"
    "[\n"
    "  {{\n"
    '    "question": "The question text",\n'
    '    "category": "motivation|experience|technical|behavioral|situational",\n'
    '    "difficulty": "easy|medium|hard",\n'
    '    "tip": "Brief tip on how to answer well"\n'
    "  }}\n"
    "]\n\n"
    "Language: {language}. Return ONLY the JSON array."
)

# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------


def build_interviewer_system_prompt(
    interview_type: str,
    difficulty: str,
    language: str,
    offer_title: str,
    company: str,
    offer_description: str,
    user_profile: str,
) -> str:
    """Build the full system prompt for the AI interviewer."""
    lang = language if language in ("fr", "en") else "en"
    type_instr = TYPE_INSTRUCTIONS.get(interview_type, TYPE_INSTRUCTIONS["hr"]).get(
        lang, ""
    )
    diff_instr = DIFFICULTY_MODIFIERS.get(
        difficulty, DIFFICULTY_MODIFIERS["junior"]
    ).get(lang, "")
    template = INTERVIEWER_SYSTEM_PROMPT[lang]
    return template.format(
        interview_type=interview_type,
        difficulty=difficulty,
        offer_title=offer_title or "General interview",
        company=company or "a company",
        offer_description=offer_description or "No specific offer description.",
        user_profile=user_profile or "No profile information provided.",
        type_instructions=type_instr,
        difficulty_instructions=diff_instr,
    )


def generate_first_question(
    system_prompt: str,
) -> str:
    """Generate the opening interview question using the system prompt."""
    messages: Messages = [
        SystemMessage(role="system", content=system_prompt),
        UserMessage(
            role="user",
            content="The interview is starting now. Ask your first question.",
        ),
    ]
    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    return content if isinstance(content, str) else str(content)


def generate_next_question(
    system_prompt: str,
    conversation_history: list[dict[str, str]],
    latest_answer: str,
) -> str:
    """Generate the next interview question based on conversation so far."""
    messages: Messages = [SystemMessage(role="system", content=system_prompt)]

    for turn in conversation_history:
        messages.append(AssistantMessage(role="assistant", content=turn["question"]))
        if turn.get("answer"):
            messages.append(UserMessage(role="user", content=turn["answer"]))

    if latest_answer:
        messages.append(UserMessage(role="user", content=latest_answer))

    messages.append(
        UserMessage(
            role="user",
            content="[SYSTEM: The candidate has finished answering. Ask the next question.]",
        )
    )

    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    return content if isinstance(content, str) else str(content)


def generate_hint(question: str, partial_transcript: str, language: str) -> str:
    """Generate a real-time hint for a struggling candidate."""
    prompt = HINT_PROMPT.format(
        question=question,
        partial_transcript=partial_transcript,
        language=language,
    )
    return _chat("You are a helpful interview coach.", prompt)


def predict_questions(
    offer_title: str,
    company: str,
    offer_description: str,
    interview_type: str,
    difficulty: str,
    language: str,
    count: int = 10,
) -> list[dict[str, str]]:
    """Predict likely interview questions for an offer."""
    prompt = PREDICT_QUESTIONS_PROMPT.format(
        count=count,
        offer_title=offer_title,
        company=company,
        offer_description=offer_description,
        interview_type=interview_type,
        difficulty=difficulty,
        language=language,
    )
    raw = _chat("You are an expert interview preparation assistant.", prompt)
    cleaned = _strip_markdown_fences(raw)
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result  # type: ignore[return-value]
    except json.JSONDecodeError:
        logger.error("Failed to parse predicted questions: %s", cleaned[:500])
    return []


async def predict_questions_async(
    offer_title: str,
    company: str,
    offer_description: str,
    interview_type: str,
    difficulty: str,
    language: str,
    count: int = 10,
) -> list[dict[str, str]]:
    """Async version of predict_questions."""
    prompt = PREDICT_QUESTIONS_PROMPT.format(
        count=count,
        offer_title=offer_title,
        company=company,
        offer_description=offer_description,
        interview_type=interview_type,
        difficulty=difficulty,
        language=language,
    )
    raw = await _chat_async("You are an expert interview preparation assistant.", prompt)
    cleaned = _strip_markdown_fences(raw)
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result  # type: ignore[return-value]
    except json.JSONDecodeError:
        logger.error("Failed to parse predicted questions: %s", cleaned[:500])
    return []


def analyze_filler_words(transcript: str, language: str) -> str:
    """Count filler words in a transcript and return a summary."""
    lang = language if language in FILLER_WORDS else "en"
    words = FILLER_WORDS[lang]
    lower = transcript.lower()
    counts: Counter[str] = Counter()
    for w in words:
        count = len(re.findall(r"\b" + re.escape(w) + r"\b", lower))
        if count > 0:
            counts[w] = count

    total = sum(counts.values())
    if total == 0:
        return "No significant filler words detected."

    parts = [f"'{w}' ({c}x)" for w, c in counts.most_common(5)]
    return f"Detected {total} filler words. Most common: {', '.join(parts)}."


def build_full_transcript(turns: list[dict[str, str]]) -> str:
    """Build a formatted transcript from question/answer pairs."""
    lines: list[str] = []
    for i, turn in enumerate(turns, 1):
        lines.append(f"Q{i} [Recruiter]: {turn['question']}")
        answer = turn.get("answer")
        if answer:
            lines.append(f"A{i} [Candidate]: {answer}")
        else:
            lines.append(f"A{i} [Candidate]: (skipped)")
        lines.append("")
    return "\n".join(lines)


def run_post_interview_analysis(
    interview_type: str,
    difficulty: str,
    language: str,
    offer_title: str,
    company: str,
    turns: list[dict[str, str]],
) -> dict:
    """Run the full post-interview analysis pipeline.

    Returns a dict with all analysis fields ready for storage.
    """
    lang = language if language in ("fr", "en") else "en"
    full_transcript = build_full_transcript(turns)
    filler_analysis = analyze_filler_words(full_transcript, lang)

    # Build analysis prompt
    template = ANALYSIS_SYSTEM_PROMPT[lang]
    system_prompt = template.format(
        offer_title=offer_title or "General interview",
        company=company or "a company",
        interview_type=interview_type,
        difficulty=difficulty,
        full_transcript=full_transcript,
    )

    raw = _chat(
        system_prompt, "Analyze the interview above and return the JSON report."
    )
    cleaned = _strip_markdown_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("Failed to parse interview analysis: %s", cleaned[:500])
        result = {
            "overall_score": 50,
            "communication_score": 50,
            "technical_score": None,
            "behavioral_score": None,
            "confidence_score": 50,
            "strengths": [],
            "weaknesses": [],
            "improvements": ["Could not parse structured analysis."],
            "summary": "Analysis parsing failed. Please try again.",
            "star_method_usage": None,
            "per_turn_feedback": [],
        }

    result["filler_words_analysis"] = filler_analysis
    result["full_transcript"] = full_transcript
    return result


async def run_post_interview_analysis_async(
    interview_type: str,
    difficulty: str,
    language: str,
    offer_title: str,
    company: str,
    turns: list[dict[str, str]],
) -> dict:
    """Async version of run_post_interview_analysis."""
    lang = language if language in ("fr", "en") else "en"
    full_transcript = build_full_transcript(turns)
    filler_analysis = analyze_filler_words(full_transcript, lang)

    template = ANALYSIS_SYSTEM_PROMPT[lang]
    system_prompt = template.format(
        offer_title=offer_title or "General interview",
        company=company or "a company",
        interview_type=interview_type,
        difficulty=difficulty,
        full_transcript=full_transcript,
    )

    raw = await _chat_async(
        system_prompt, "Analyze the interview above and return the JSON report."
    )
    cleaned = _strip_markdown_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("Failed to parse interview analysis: %s", cleaned[:500])
        result = {
            "overall_score": 50,
            "communication_score": 50,
            "technical_score": None,
            "behavioral_score": None,
            "confidence_score": 50,
            "strengths": [],
            "weaknesses": [],
            "improvements": ["Could not parse structured analysis."],
            "summary": "Analysis parsing failed. Please try again.",
            "star_method_usage": None,
            "per_turn_feedback": [],
        }

    result["filler_words_analysis"] = filler_analysis
    result["full_transcript"] = full_transcript
    return result


def build_profile_summary(user, skills, experiences, education) -> str:  # type: ignore[no-untyped-def]
    """Build a text summary of the user's profile for prompts."""
    parts = [f"Name: {user.name}"]
    if skills:
        parts.append("Skills: " + ", ".join(s.name for s in skills))
    if experiences:
        exp_lines = []
        for e in experiences:
            line = e.title
            if e.technologies:
                line += f" ({e.technologies})"
            if e.client:
                line += f" - {e.client}"
            exp_lines.append(line)
        parts.append("Experience: " + "; ".join(exp_lines))
    if education:
        edu_lines = []
        for e in education:
            line = f"{e.degree} at {e.school}"
            if e.field:
                line += f" in {e.field}"
            edu_lines.append(line)
        parts.append("Education: " + "; ".join(edu_lines))
    return "\n".join(parts)
