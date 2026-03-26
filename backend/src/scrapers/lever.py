"""Lever job postings API client for internship offers.

Free public JSON API, no authentication required.
"""

import logging

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

LEVER_API = "https://api.lever.co/v0/postings/{company}"

# Popular companies known to post internships on Lever
DEFAULT_COMPANIES = [
    "netflix",
    "twilio",
    "databricks",
    "netlify",
    "lever",
    "reddit",
    "robinhood",
    "lyft",
    "coinbase",
    "okta",
    "pagerduty",
    "box",
    "github",
    "strava",
    "wealthsimple",
    "shopify",
    "mongodb",
    "datadog",
    "grammarly",
    "zapier",
]


class LeverSource(OfferSource):
    name = "lever"

    def __init__(self, companies: list[str] | None = None) -> None:
        self._companies = companies or DEFAULT_COMPANIES

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

        for company in self._companies:
            if len(offers) >= max_results:
                break
            try:
                resp = httpx.get(
                    LEVER_API.format(company=company),
                    timeout=15,
                )
                resp.raise_for_status()
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                logger.debug("Lever company %s failed: %s", company, exc)
                continue

            postings = resp.json()
            if not isinstance(postings, list):
                continue

            for posting in postings:
                text = posting.get("text", "")
                text_lower = text.lower()

                # Filter for internship-related roles
                categories = posting.get("categories", {})
                commitment = (categories.get("commitment") or "").lower()
                team = (categories.get("team") or "").lower()

                is_intern = any(
                    tag in text_lower
                    for tag in ("intern", "stage", "stagiaire", "apprenti")
                ) or any(
                    tag in commitment
                    for tag in ("intern", "stage")
                )

                if not is_intern:
                    continue

                # Filter by keywords
                description = posting.get("descriptionPlain", "") or ""
                desc_lower = description[:2000].lower()
                if kw_lower and not any(
                    kw in text_lower or kw in desc_lower for kw in kw_lower
                ):
                    continue

                # Filter by location if specified
                job_location = categories.get("location", "") or ""
                if loc_lower and loc_lower not in job_location.lower():
                    continue

                lists_text = ""
                for lst in posting.get("lists", []):
                    lists_text += lst.get("text", "") + " "
                    lists_text += " ".join(
                        item.get("content", "") for item in lst.get("content", [])
                    )

                full_description = description or lists_text
                full_description = full_description[:2000].strip()

                offers.append(
                    RawOffer(
                        source="lever",
                        source_id=posting.get("id", ""),
                        company=company.replace("-", " ").title(),
                        title=text,
                        description=full_description or None,
                        locations=job_location or None,
                        link=posting.get("hostedUrl") or posting.get("applyUrl"),
                        contract_type="Internship",
                        salary=None,
                        published_at=None,
                    )
                )

                if len(offers) >= max_results:
                    break

        logger.info("Lever: found %d offers for '%s'", len(offers), keywords)
        return offers
