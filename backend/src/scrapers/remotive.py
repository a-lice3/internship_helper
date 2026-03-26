"""Remotive API client for remote internship offers.

Completely free, no authentication or API key required.
Focuses on remote jobs — good for remote internships worldwide.
"""

import logging

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

REMOTIVE_API = "https://remotive.com/api/remote-jobs"


class RemotiveSource(OfferSource):
    name = "remotive"

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
    ) -> list[RawOffer]:
        params: dict[str, str | int] = {
            "search": keywords,
            "limit": 100,  # fetch more to filter for internships
        }

        try:
            resp = httpx.get(REMOTIVE_API, params=params, timeout=20)
            resp.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Remotive API failed: %s", exc)
            return []

        data = resp.json()
        jobs = data.get("jobs", [])
        logger.info("Remotive: %d raw results for '%s'", len(jobs), keywords)

        import re

        kw_lower = keywords.lower().split()
        offers: list[RawOffer] = []

        for job in jobs:
            title = job.get("title", "")
            title_lower = title.lower()
            job_type = (job.get("job_type") or "").lower()
            description = job.get("description", "") or ""

            # Filter for internship-related roles
            is_intern = any(
                tag in title_lower or tag in job_type
                for tag in ("intern", "stage", "stagiaire", "apprenti", "junior", "entry")
            )

            # Also check if keywords match even if not explicitly internship-tagged
            desc_lower = description[:2000].lower()
            kw_match = any(
                kw in title_lower or kw in desc_lower for kw in kw_lower
            ) if kw_lower else True

            if not (is_intern or kw_match):
                continue

            # Strip HTML from description
            clean_desc = re.sub(r"<[^>]+>", " ", description)
            clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

            candidate_location = job.get("candidate_required_location", "")

            salary = job.get("salary") or None
            if salary and salary.strip() == "":
                salary = None

            offers.append(
                RawOffer(
                    source="remotive",
                    source_id=str(job.get("id", "")),
                    company=job.get("company_name", ""),
                    title=title,
                    description=clean_desc[:2000] if clean_desc else None,
                    locations=candidate_location or "Remote",
                    link=job.get("url"),
                    contract_type=job.get("job_type") or "Remote",
                    salary=salary,
                    published_at=job.get("publication_date"),
                )
            )

            if len(offers) >= max_results:
                break

        logger.info("Remotive: found %d offers for '%s'", len(offers), keywords)
        return offers
