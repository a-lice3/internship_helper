import json
import logging
import urllib.request
import urllib.error
import urllib.parse

from bs4 import BeautifulSoup
from mistralai.client import Mistral
from mistralai.client.models.assistantmessage import AssistantMessage
from mistralai.client.models.systemmessage import SystemMessage
from mistralai.client.models.toolmessage import ToolMessage
from mistralai.client.models.usermessage import UserMessage

from src.config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)

Messages = list[AssistantMessage | SystemMessage | ToolMessage | UserMessage]

client = Mistral(api_key=MISTRAL_API_KEY)
MODEL = "mistral-small-2603"


def _chat(system_prompt: str, user_prompt: str) -> str:
    """Send a system + user message to Mistral and return the text response."""
    messages: Messages = [
        SystemMessage(role="system", content=system_prompt),
        UserMessage(role="user", content=user_prompt),
    ]
    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    if not isinstance(content, str):
        return str(content)
    return content


def _chat_continue(messages: Messages, followup: str) -> tuple[str, Messages]:
    """Continue a conversation with a follow-up user message.

    Returns (response_text, updated_messages) so the caller can keep going.
    """
    messages.append(UserMessage(role="user", content=followup))
    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    text = content if isinstance(content, str) else str(content)
    messages.append(AssistantMessage(role="assistant", content=text))
    return text, messages


def ask_mistral(question: str) -> str:
    """General-purpose question to Mistral."""
    messages: Messages = [UserMessage(role="user", content=question)]
    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    if not isinstance(content, str):
        return str(content)
    return content


def _append_user_instructions(prompt: str, user_instructions: str | None) -> str:
    """Append user-defined AI instructions to a prompt if present."""
    if user_instructions and user_instructions.strip():
        prompt += (
            "\n\nADDITIONAL USER INSTRUCTIONS (follow these carefully):\n"
            + user_instructions.strip()
        )
    return prompt


def adapt_cv(
    cv_content: str,
    offer_title: str,
    company: str,
    offer_description: str,
    user_instructions: str | None = None,
) -> str:
    """Adapt a CV to match a specific internship offer."""
    system_prompt = (
        "You are an expert career advisor. "
        "You will receive a CV and an internship offer. "
        "Rewrite the CV to better match the offer. "
        "Adapt the profile summary, highlight relevant skills, "
        "adjust the job title, and reorder experiences to match the offer requirements. "
        "Keep the same factual content — do not invent experience. "
        "Return only the adapted CV text."
    )
    system_prompt = _append_user_instructions(system_prompt, user_instructions)
    user_prompt = (
        f"## Internship Offer\n"
        f"Company: {company}\n"
        f"Title: {offer_title}\n"
        f"Description: {offer_description}\n\n"
        f"## Current CV\n{cv_content}"
    )
    return _chat(system_prompt, user_prompt)


def analyze_skill_gap(
    user_skills: list[str],
    offer_title: str,
    company: str,
    offer_description: str,
    user_instructions: str | None = None,
) -> dict[str, list[str]]:
    """Compare user skills against offer requirements and return gaps."""
    system_prompt = (
        "You are a career advisor. "
        "Compare the candidate's skills against the internship offer requirements. "
        "Identify missing hard skills, missing soft skills, and give actionable recommendations. "
        "Respond in JSON with exactly these keys: "
        '"missing_hard_skills" (list of strings), '
        '"missing_soft_skills" (list of strings), '
        '"recommendations" (list of strings). '
        "Return only valid JSON, no markdown."
    )
    system_prompt = _append_user_instructions(system_prompt, user_instructions)
    user_prompt = (
        f"## Internship Offer\n"
        f"Company: {company}\n"
        f"Title: {offer_title}\n"
        f"Description: {offer_description}\n\n"
        f"## Candidate's Current Skills\n"
        f"{', '.join(user_skills) if user_skills else 'No skills listed yet.'}"
    )
    raw = _chat(system_prompt, user_prompt)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "missing_hard_skills": [],
            "missing_soft_skills": [],
            "recommendations": [raw],
        }

    return {
        "missing_hard_skills": result.get("missing_hard_skills", []),
        "missing_soft_skills": result.get("missing_soft_skills", []),
        "recommendations": result.get("recommendations", []),
    }


_EMPTY_COMPANY_INFO: dict[str, str | None] = {
    "description": None,
    "extract": None,
    "logo_url": None,
    "page_url": None,
}

_WIKI_HEADERS = {
    "User-Agent": "InternshipHelper/1.0",
    "Accept": "application/json",
}


def _wiki_summary(title: str) -> dict | None:
    """Fetch a Wikipedia summary for a given page title. Returns parsed JSON or None."""
    encoded = urllib.parse.quote(title)
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
    req = urllib.request.Request(url, headers=_WIKI_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        if data.get("type") == "standard" and data.get("extract"):
            return data
        return None
    except Exception:
        return None


def _wiki_search(query: str) -> str | None:
    """Search Wikipedia and return the title of the first result, or None."""
    encoded = urllib.parse.quote(query)
    url = (
        f"https://en.wikipedia.org/w/api.php?action=query&list=search"
        f"&srsearch={encoded}&srlimit=3&format=json"
    )
    req = urllib.request.Request(url, headers=_WIKI_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        results = data.get("query", {}).get("search", [])
        if results:
            return results[0]["title"]
        return None
    except Exception:
        return None


def _extract_result(data: dict) -> dict[str, str | None]:
    """Extract the fields we care about from a Wikipedia summary response."""
    return {
        "description": data.get("description"),
        "extract": data.get("extract"),
        "logo_url": (data["thumbnail"]["source"] if data.get("thumbnail") else None),
        "page_url": (data.get("content_urls", {}).get("desktop", {}).get("page")),
    }


def _clean_company_name(raw: str) -> list[str]:
    """Generate candidate names to try on Wikipedia from a raw company name.

    E.g. "Safran.AI (ex-Preligens)" -> ["Safran.AI (ex-Preligens)", "Safran.AI", "Safran", "Preligens"]
    """
    import re

    candidates: list[str] = [raw]

    # Strip parenthetical like "(ex-Preligens)", "(France)", etc.
    without_parens = re.sub(r"\s*\(.*?\)\s*", " ", raw).strip()
    if without_parens and without_parens != raw:
        candidates.append(without_parens)

    # Strip domain-like suffixes (.AI, .io, .com, etc.)
    without_suffix = re.sub(r"\.\w{1,4}$", "", without_parens).strip()
    if without_suffix and without_suffix not in candidates:
        candidates.append(without_suffix)

    # Extract names from parenthetical (ex-Name, formerly Name)
    paren_match = re.search(r"\(((?:ex-|formerly\s*)?([\w\s&-]+))\)", raw)
    if paren_match:
        alt = paren_match.group(2).strip()
        if alt and alt not in candidates:
            candidates.append(alt)

    return candidates


def fetch_company_info(company_name: str) -> dict[str, str | None]:
    """Fetch a short company description from Wikipedia.

    Tries multiple name variants and falls back to Wikipedia search API.
    Returns a dict with keys: description, extract, logo_url, page_url.
    """
    candidates = _clean_company_name(company_name)

    # 1. Try direct summary lookup for each candidate name
    for name in candidates:
        data = _wiki_summary(name)
        if data:
            return _extract_result(data)

    # 2. Try disambiguation suffix "(company)" for each candidate
    for name in candidates:
        data = _wiki_summary(f"{name} (company)")
        if data:
            return _extract_result(data)

    # 3. Fallback: use Wikipedia search API
    for name in candidates:
        title = _wiki_search(f"{name} company")
        if title:
            data = _wiki_summary(title)
            if data:
                return _extract_result(data)

    return dict(_EMPTY_COMPANY_INFO)


def fetch_offer_from_url(url: str) -> str:
    """Fetch a job offer page and return its text content."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Truncate to avoid exceeding LLM context limits
    return text[:12000]


def parse_offer(raw_text: str) -> dict[str, str | None]:
    """Extract structured offer data from raw pasted job description text."""
    system_prompt = (
        "You are an assistant that extracts structured data from job postings. "
        "Given the raw text of an internship/job offer, extract: "
        "company, title (job title), locations (city/country), and description. "
        "For the description, write a concise summary (3-5 sentences) that captures "
        "the key responsibilities, required skills, and what makes this role interesting. "
        "Do NOT copy the full job posting — summarize it. "
        "Use plain text only, no markdown formatting. "
        "Respond in JSON with exactly these keys: "
        '"company" (string), "title" (string), "locations" (string or null), "description" (string or null). '
        "Return only valid JSON, no markdown."
    )
    raw = _chat(system_prompt, raw_text)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "company": "",
            "title": "",
            "locations": None,
            "description": raw_text,
        }
    return {
        "company": result.get("company", ""),
        "title": result.get("title", ""),
        "locations": result.get("locations"),
        "description": result.get("description"),
    }


def extract_profile_from_cv(cv_text: str) -> dict[str, list[dict[str, str | None]]]:
    """Parse a CV text and extract structured profile sections using Mistral."""
    system_prompt = (
        "You are an expert CV parser. Given a CV/resume text, extract structured data. "
        "Return valid JSON (no markdown) with exactly these keys:\n"
        '- "skills": list of objects with "name" (string), "category" ("programming"|"libraries"|"tools"|"soft"|"other")\n'
        '- "experiences": list of objects with "title" (string), "description" (string or null), '
        '"technologies" (string or null), "client" (string or null), '
        '"start_date" (YYYY-MM or null), "end_date" (YYYY-MM or null)\n'
        '- "education": list of objects with "school" (string), "degree" (string), '
        '"field" (string or null), "description" (string or null), '
        '"start_date" (YYYY-MM or null), "end_date" (YYYY-MM or null)\n'
        '- "languages": list of objects with "language" (string), "level" ("beginner"|"intermediate"|"advanced"|"fluent"|"native")\n'
        '- "extracurriculars": list of objects with "name" (string), "description" (string or null)\n'
        "Return only valid JSON."
    )
    raw = _chat(system_prompt, cv_text)
    # Strip markdown code fences if Mistral wraps the JSON
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error(
            "Failed to parse Mistral CV extraction response: %s", cleaned[:500]
        )
        result = {
            "skills": [],
            "experiences": [],
            "education": [],
            "languages": [],
            "extracurriculars": [],
        }
    return result


def generate_cover_letter(
    profile_summary: str,
    offer_title: str,
    company: str,
    offer_description: str,
    template: str = "",
    user_instructions: str | None = None,
) -> str:
    """Generate a first draft of a cover letter for an internship offer."""
    system_prompt = (
        "You are an expert career advisor specializing in cover letters. "
        "Write a professional cover letter for an internship application. "
        "Use the candidate's profile and the offer details. "
        "The tone should be professional but enthusiastic. "
        "Keep it concise (about 300 words). "
        "IMPORTANT: Return ONLY plain text. Do NOT use any markdown formatting — "
        "no bold (**), no italics (*), no headers (#), no bullet points. "
        "Write a natural letter with paragraphs separated by blank lines."
    )
    if template:
        system_prompt += (
            " The candidate has provided a cover letter template — "
            "use its structure and style as a guide, but adapt the content to this specific offer."
        )
    system_prompt = _append_user_instructions(system_prompt, user_instructions)

    user_prompt = (
        f"## Internship Offer\n"
        f"Company: {company}\n"
        f"Title: {offer_title}\n"
        f"Description: {offer_description}\n\n"
        f"## Candidate Profile\n{profile_summary}"
    )
    if template:
        user_prompt += f"\n\n## Cover Letter Template to Follow\n{template}"

    return _chat(system_prompt, user_prompt)


_CHAT_EDIT_COVER_LETTER_SYSTEM_PROMPT = (
    "You are a cover letter editing assistant. "
    "The user will give you their current cover letter and a modification request. "
    "Apply the requested change and return the COMPLETE modified cover letter.\n\n"
    "RULES:\n"
    "- Return ONLY the complete cover letter text, no explanations\n"
    "- Return ONLY plain text — no markdown formatting (no **, *, #, bullet points)\n"
    "- Write natural paragraphs separated by blank lines\n"
    "- ONLY modify what the user asks — do not change anything else\n"
    "- Keep the same professional tone unless the user asks otherwise\n"
    "- If the user asks something impossible or unclear, still return the full letter "
    "with your best attempt at the change"
)


def chat_edit_cover_letter(
    cover_letter_content: str,
    user_message: str,
    conversation_history: list[dict[str, str]] | None = None,
    user_instructions: str | None = None,
) -> str:
    """Apply a user's chat instruction to a cover letter and return the updated text."""
    system_prompt = _append_user_instructions(
        _CHAT_EDIT_COVER_LETTER_SYSTEM_PROMPT, user_instructions
    )

    user_prompt = (
        f"## Current Cover Letter\n{cover_letter_content}\n\n"
        f"## Modification Request\n{user_message}"
    )

    # Build messages with conversation history for context
    messages: Messages = [SystemMessage(role="system", content=system_prompt)]

    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(UserMessage(role="user", content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(
                    AssistantMessage(role="assistant", content=msg["content"])
                )

    messages.append(UserMessage(role="user", content=user_prompt))

    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    text = content if isinstance(content, str) else str(content)
    return _strip_markdown_fences(text)


_ADAPT_CV_SYSTEM_PROMPT = (
    "You are an expert career advisor and LaTeX specialist. "
    "You will receive a LaTeX CV source and an internship offer. "
    "Adapt the CV to better match the offer by:\n"
    "1. Modifying the PROFILE/summary section to highlight relevant skills for this offer\n"
    "2. Adapting the job title/position sought to match the offer\n"
    "3. Reordering or emphasizing relevant experiences and skills\n\n"
    "CRITICAL LaTeX RULES:\n"
    "- PRESERVE the exact same \\documentclass, \\usepackage commands, and document structure\n"
    "- ONLY modify TEXT CONTENT inside environments and commands — never change "
    "the LaTeX commands, environments, or macros themselves\n"
    "- Keep ALL custom commands and environments exactly as they appear "
    "(e.g. \\begin{rSection}, \\bf, custom macros from .cls files)\n"
    "- Escape special LaTeX characters properly: use \\& for &, "
    "\\% for %, \\_ for _, \\# for #, \\$ for $, \\{ for {, \\} for }\n"
    "- Do NOT add raw special characters (& _ % # $) in text — they MUST be escaped\n"
    "- Do NOT invent experience, education, or skills that are not in the original CV\n"
    "- The generated LaTeX MUST compile to exactly ONE page — adjust spacing, "
    "font sizes, or trim less relevant details if needed\n"
    "- Return ONLY the complete LaTeX source code, no explanations, no markdown fences\n"
    "- The output must be valid, compilable LaTeX — test mentally that every "
    "brace is matched and every special character is escaped"
)


def adapt_cv_latex(
    latex_content: str,
    offer_title: str,
    company: str,
    offer_description: str,
    support_files_content: str = "",
    support_files_dir: str | None = None,
    max_retries: int = 2,
    user_instructions: str | None = None,
) -> str:
    """Adapt a LaTeX CV to a specific internship offer, returning valid LaTeX.

    After the initial generation, compiles the result and checks the page count.
    If it exceeds 1 page, asks Mistral to shorten it (up to *max_retries* times).
    """
    user_prompt = (
        f"## Internship Offer\n"
        f"Company: {company}\n"
        f"Title: {offer_title}\n"
        f"Description: {offer_description}\n\n"
    )
    if support_files_content:
        user_prompt += (
            f"## LaTeX Class/Style Files (for reference — do NOT modify these, "
            f"but use the commands and environments they define)\n"
            f"{support_files_content}\n\n"
        )
    user_prompt += (
        f"## Current LaTeX CV (modify ONLY the text content)\n{latex_content}"
    )

    # Build system prompt, appending user instructions if present
    system_prompt = _append_user_instructions(
        _ADAPT_CV_SYSTEM_PROMPT, user_instructions
    )

    # First generation
    result = _chat(system_prompt, user_prompt)
    cleaned = _strip_markdown_fences(result)

    # Build message history for possible follow-ups
    messages: Messages = [
        SystemMessage(role="system", content=system_prompt),
        UserMessage(role="user", content=user_prompt),
        AssistantMessage(role="assistant", content=cleaned),
    ]

    # Feedback loop: compile → check pages → ask to shorten
    for attempt in range(max_retries):
        page_count = _try_count_pages(cleaned, support_files_dir)
        if page_count is None or page_count <= 1:
            break

        logger.info(
            "Adapted CV is %d pages (attempt %d/%d), asking Mistral to shorten",
            page_count,
            attempt + 1,
            max_retries,
        )
        followup = (
            f"The LaTeX you just produced compiles to {page_count} pages. "
            f"It MUST fit on exactly 1 page. "
            f"Please shorten the content: remove less relevant bullet points, "
            f"reduce descriptions, trim the least important sections, or reduce "
            f"spacing/font sizes. "
            f"Return ONLY the corrected complete LaTeX source, no explanations."
        )
        new_result, messages = _chat_continue(messages, followup)
        cleaned = _strip_markdown_fences(new_result)

    return cleaned


_CHAT_EDIT_CV_SYSTEM_PROMPT = (
    "You are a LaTeX CV editing assistant. "
    "The user will give you their current LaTeX CV source and a modification request. "
    "Apply the requested change and return the COMPLETE modified LaTeX source.\n\n"
    "RULES:\n"
    "- Return ONLY the complete LaTeX source code, no explanations, no markdown fences\n"
    "- PRESERVE the exact same \\documentclass, \\usepackage commands, and document structure\n"
    "- ONLY modify what the user asks — do not change anything else\n"
    "- Keep ALL custom commands and environments exactly as they appear\n"
    "- Escape special LaTeX characters properly\n"
    "- The output must be valid, compilable LaTeX\n"
    "- If the user asks something impossible or unclear, still return the full LaTeX "
    "with your best attempt at the change"
)


def chat_edit_cv(
    latex_content: str,
    user_message: str,
    conversation_history: list[dict[str, str]] | None = None,
    support_files_content: str = "",
    user_instructions: str | None = None,
) -> str:
    """Apply a user's chat instruction to a LaTeX CV and return the updated source."""
    system_prompt = _append_user_instructions(
        _CHAT_EDIT_CV_SYSTEM_PROMPT, user_instructions
    )

    user_prompt = ""
    if support_files_content:
        user_prompt += (
            "## LaTeX Class/Style Files (for reference)\n"
            f"{support_files_content}\n\n"
        )
    user_prompt += f"## Current LaTeX CV\n{latex_content}\n\n"
    user_prompt += f"## Modification Request\n{user_message}"

    # Build messages with conversation history for context
    messages: Messages = [SystemMessage(role="system", content=system_prompt)]

    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(UserMessage(role="user", content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(
                    AssistantMessage(role="assistant", content=msg["content"])
                )

    messages.append(UserMessage(role="user", content=user_prompt))

    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    text = content if isinstance(content, str) else str(content)
    return _strip_markdown_fences(text)


VOXTRAL_MODEL = "voxtral-mini-2602"


def transcribe_audio(file_name: str, file_content: bytes) -> str:
    """Transcribe audio using Voxtral."""
    from mistralai.client.models.file import File

    response = client.audio.transcriptions.complete(
        model=VOXTRAL_MODEL,
        file=File(file_name=file_name, content=file_content),
    )
    return response.text  # type: ignore[return-value]


def analyze_pitch(
    transcription: str,
    offer_title: str | None = None,
    company: str | None = None,
    offer_description: str | None = None,
    user_instructions: str | None = None,
) -> dict[str, str | list[str] | int | None]:
    """Analyze a pitch transcription and return structured feedback."""
    system_prompt = (
        "You are an expert career coach specializing in interview preparation. "
        "Analyze the following oral pitch transcription from a student looking for internships. "
        "Evaluate the pitch and respond in JSON with exactly these keys:\n"
        '"structure_clarity" (string: assessment of how well-structured and clear the pitch is),\n'
        '"strengths" (list of strings: key strengths of the pitch),\n'
        '"improvements" (list of strings: specific areas for improvement),\n'
        '"overall_score" (integer 1-10: overall quality rating),\n'
        '"summary" (string: 2-3 sentence overall assessment).\n'
    )

    if offer_title and offer_description:
        system_prompt += (
            "This pitch is for a specific internship offer. Also include:\n"
            '"offer_relevance" (string: how well the pitch addresses the offer requirements, '
            "what key points from the offer are mentioned or missing).\n"
        )
    else:
        system_prompt += (
            "This is a general pitch (not for a specific offer). "
            'Set "offer_relevance" to null.\n'
        )

    system_prompt += "Return only valid JSON, no markdown."
    system_prompt = _append_user_instructions(system_prompt, user_instructions)

    user_prompt = f"## Pitch Transcription\n{transcription}"
    if offer_title and company and offer_description:
        user_prompt = (
            f"## Target Internship Offer\n"
            f"Company: {company}\n"
            f"Title: {offer_title}\n"
            f"Description: {offer_description}\n\n" + user_prompt
        )

    raw = _chat(system_prompt, user_prompt)
    cleaned = _strip_markdown_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "structure_clarity": raw,
            "strengths": [],
            "improvements": [],
            "offer_relevance": None,
            "overall_score": 5,
            "summary": "Could not parse structured analysis.",
        }

    return {
        "structure_clarity": result.get("structure_clarity", ""),
        "strengths": result.get("strengths", []),
        "improvements": result.get("improvements", []),
        "offer_relevance": result.get("offer_relevance"),
        "overall_score": result.get("overall_score", 5),
        "summary": result.get("summary", ""),
    }


def extract_search_params(user_message: str) -> dict[str, str | int | list[str] | None]:
    """Use Mistral to extract search parameters from a natural language message.

    Returns a dict with keys: keywords, location, country, radius_km, sources.
    """
    system_prompt = (
        "You are a helpful assistant that extracts job search parameters from natural language. "
        "The user will describe what kind of internship they're looking for. "
        "Extract the following and respond in JSON (no markdown):\n"
        '- "keywords": string of search keywords (job title, skills, domain)\n'
        '- "location": city name or null if not specified\n'
        '- "country": country name (default "France" if not specified)\n'
        '- "radius_km": search radius in km (default 30)\n'
        '- "max_results": number of results to return (default 20, max 30)\n'
        '- "sources": list of sources to use. Available: ["francetravail", "wttj", "themuse"]. '
        'For France: use ["francetravail", "wttj"]. '
        'For other countries: use ["wttj", "themuse"]. '
        "themuse has the best international coverage.\n\n"
        "Examples:\n"
        '"je cherche un stage en data science a Paris" -> '
        '{"keywords": "data science", "location": "Paris", "country": "France", "radius_km": 30, "sources": ["francetravail", "wttj"]}\n'
        '"looking for a ML internship in London" -> '
        '{"keywords": "machine learning", "location": "London", "country": "UK", "radius_km": 30, "sources": ["wttj", "themuse"]}\n'
        '"internship in Dubai" -> '
        '{"keywords": "internship", "location": "Dubai", "country": "UAE", "radius_km": 30, "sources": ["wttj", "themuse"]}\n'
        '"stage frontend react" -> '
        '{"keywords": "frontend react", "location": null, "country": "France", "radius_km": 30, "sources": ["francetravail", "wttj"]}\n'
        "Return only valid JSON."
    )

    raw = _chat(system_prompt, user_message)
    cleaned = _strip_markdown_fences(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: use the whole message as keywords
        return {
            "keywords": user_message,
            "location": "",
            "country": "France",
            "radius_km": 30,
            "sources": ["francetravail", "wttj"],
        }

    country = result.get("country", "France")
    sources = result.get("sources")
    if not sources:
        if country and country.strip().lower() not in ("france", "fr"):
            sources = ["wttj", "themuse"]
        else:
            sources = ["francetravail", "wttj"]

    max_results = result.get("max_results")
    if isinstance(max_results, int):
        max_results = max(1, min(max_results, 30))
    else:
        max_results = None  # will use default from ChatSearchRequest

    return {
        "keywords": result.get("keywords", user_message),
        "location": result.get("location"),
        "country": country,
        "radius_km": result.get("radius_km", 30),
        "max_results": max_results,
        "sources": sources,
    }


def match_offers_to_profile(
    profile_summary: str,
    offers: list[dict[str, str | None]],
) -> list[dict[str, object]]:
    """Score how well each offer matches the user's profile.

    Returns a list of {score, reasons} dicts in the same order as input offers.
    """
    system_prompt = (
        "You are a career matching expert. "
        "Given a candidate profile and a list of internship offers, "
        "score each offer from 0 to 100 on how well it matches the candidate's profile. "
        "For each offer, provide a match score and 2-3 short reasons explaining the score. "
        "Respond in JSON as a list of objects with keys: "
        '"index" (int, 0-based), "score" (int 0-100), "reasons" (list of strings). '
        "Return only valid JSON, no markdown."
    )

    offers_text = ""
    for i, offer in enumerate(offers):
        offers_text += (
            f"\n### Offer {i}\n"
            f"Title: {offer.get('title', '')}\n"
            f"Company: {offer.get('company', '')}\n"
            f"Description: {(offer.get('description') or '')[:500]}\n"
        )

    user_prompt = (
        f"## Candidate Profile\n{profile_summary}\n\n"
        f"## Offers to Score\n{offers_text}"
    )

    raw = _chat(system_prompt, user_prompt)
    cleaned = _strip_markdown_fences(raw)

    try:
        results = json.loads(cleaned)
    except json.JSONDecodeError:
        # Return neutral scores if parsing fails
        return [{"score": 50, "reasons": []} for _ in offers]

    # Normalize to the expected order
    scored = [{"score": 50, "reasons": []} for _ in offers]
    if isinstance(results, list):
        for item in results:
            idx = item.get("index", 0)
            if 0 <= idx < len(offers):
                scored[idx] = {
                    "score": item.get("score", 50),
                    "reasons": item.get("reasons", []),
                }

    return scored


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences (```...```) that Mistral sometimes adds."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[1] if "\n" in stripped else stripped[3:]
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()
    return stripped


def _try_count_pages(latex_content: str, support_files_dir: str | None) -> int | None:
    """Compile LaTeX and return page count, or None if compilation fails."""
    try:
        from src.file_service import compile_latex_tmp

        return compile_latex_tmp(latex_content, support_files_dir)
    except Exception as exc:
        logger.warning("Page-count compilation failed (will skip check): %s", exc)
        return None
