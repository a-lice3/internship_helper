"""Greenhouse Boards API client for internship offers.

Free public JSON API, no authentication required.
Covers hundreds of tech companies (Stripe, Airbnb, Cloudflare, etc.).
"""

import logging

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

BOARDS_API = "https://boards-api.greenhouse.io/v1/boards/{company}/jobs"

# Popular companies known to post internships on Greenhouse
DEFAULT_BOARDS = [
    "stripe",
    "airbnb",
    "cloudflare",
    "twitch",
    "duolingo",
    "notion",
    "figma",
    "discord",
    "gitlab",
    "cockroachlabs",
    "airtable",
    "benchling",
    "plaid",
    "brex",
    "gusto",
    "andurilindustries",
    "verkada",
    "ramp",
    "scalevectordb",
    "openai",
]


class GreenhouseSource(OfferSource):
    name = "greenhouse"

    def __init__(self, boards: list[str] | None = None) -> None:
        self._boards = boards or DEFAULT_BOARDS

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
    ) -> list[RawOffer]:
        kw_lower = keywords.lower().split()
        loc_lower = location.lower().strip() if location else None
        offers: list[RawOffer] = []

        for board in self._boards:
            if len(offers) >= max_results:
                break
            try:
                resp = httpx.get(
                    BOARDS_API.format(company=board),
                    params={"content": "true"},
                    timeout=15,
                )
                resp.raise_for_status()
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                logger.debug("Greenhouse board %s failed: %s", board, exc)
                continue

            data = resp.json()
            for job in data.get("jobs", []):
                title = job.get("title", "")
                title_lower = title.lower()

                # Filter for internship-related roles
                if not any(
                    tag in title_lower
                    for tag in ("intern", "stage", "stagiaire", "apprenti")
                ):
                    continue

                # Filter by keywords
                content = job.get("content", "") or ""
                content_text = content[:2000].lower()
                if kw_lower and not any(
                    kw in title_lower or kw in content_text for kw in kw_lower
                ):
                    continue

                # Filter by location if specified
                job_location = job.get("location", {}).get("name", "") or ""
                if loc_lower and loc_lower not in job_location.lower():
                    continue

                # Strip HTML from content
                import re

                clean_content = re.sub(r"<[^>]+>", " ", content)
                clean_content = re.sub(r"\s+", " ", clean_content).strip()

                offers.append(
                    RawOffer(
                        source="greenhouse",
                        source_id=str(job.get("id", "")),
                        company=board.replace("-", " ").title(),
                        title=title,
                        description=clean_content[:2000] if clean_content else None,
                        locations=job_location or None,
                        link=job.get("absolute_url"),
                        contract_type="Internship",
                        salary=None,
                        published_at=job.get("updated_at"),
                    )
                )

                if len(offers) >= max_results:
                    break

        logger.info("Greenhouse: found %d offers for '%s'", len(offers), keywords)
        return offers
