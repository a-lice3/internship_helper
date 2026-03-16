import json

from mistralai.client import Mistral
from mistralai.client.models.assistantmessage import AssistantMessage
from mistralai.client.models.systemmessage import SystemMessage
from mistralai.client.models.toolmessage import ToolMessage
from mistralai.client.models.usermessage import UserMessage
from src.config import MISTRAL_API_KEY

Messages = list[AssistantMessage | SystemMessage | ToolMessage | UserMessage]

client = Mistral(api_key=MISTRAL_API_KEY)
MODEL = "mistral-small-2503"


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


def ask_mistral(question: str) -> str:
    """General-purpose question to Mistral."""
    messages: Messages = [UserMessage(role="user", content=question)]
    response = client.chat.complete(model=MODEL, messages=messages)
    content = response.choices[0].message.content
    if not isinstance(content, str):
        return str(content)
    return content


def adapt_cv(
    cv_content: str, offer_title: str, company: str, offer_description: str
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


def generate_cover_letter(
    profile_summary: str,
    offer_title: str,
    company: str,
    offer_description: str,
    template: str = "",
) -> str:
    """Generate a first draft of a cover letter for an internship offer."""
    system_prompt = (
        "You are an expert career advisor specializing in cover letters. "
        "Write a professional cover letter for an internship application. "
        "Use the candidate's profile and the offer details. "
        "The tone should be professional but enthusiastic. "
        "Keep it concise (about 300 words)."
    )
    if template:
        system_prompt += (
            " The candidate has provided a cover letter template — "
            "use its structure and style as a guide, but adapt the content to this specific offer."
        )

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
