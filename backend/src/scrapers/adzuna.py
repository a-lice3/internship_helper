"""Adzuna API client for internship offers.

Free tier: 250 requests/month. Requires API key from https://developer.adzuna.com/.
Covers UK, US, DE, FR, NL, AU, BR, IN, and more.
"""

import logging
import os

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

ADZUNA_API = "https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"

# Map country names to Adzuna country codes
COUNTRY_CODES: dict[str, str] = {
    "france": "fr",
    "fr": "fr",
    "united kingdom": "gb",
    "uk": "gb",
    "gb": "gb",
    "germany": "de",
    "de": "de",
    "netherlands": "nl",
    "nl": "nl",
    "united states": "us",
    "usa": "us",
    "us": "us",
    "australia": "au",
    "au": "au",
    "canada": "ca",
    "ca": "ca",
    "india": "in",
    "in": "in",
    "brazil": "br",
    "br": "br",
    "italy": "it",
    "it": "it",
    "spain": "es",
    "es": "es",
    "poland": "pl",
    "pl": "pl",
    "austria": "at",
    "at": "at",
    "switzerland": "ch",
    "ch": "ch",
    "belgium": "be",
    "be": "be",
    "south africa": "za",
    "za": "za",
    "singapore": "sg",
    "sg": "sg",
    "new zealand": "nz",
    "nz": "nz",
}


class AdzunaSource(OfferSource):
    name = "adzuna"

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
        country: str = "France",
    ) -> list[RawOffer]:
        app_id = os.getenv("ADZUNA_APP_ID")
        app_key = os.getenv("ADZUNA_APP_KEY")
        if not app_id or not app_key:
            logger.warning("Adzuna credentials not set (ADZUNA_APP_ID, ADZUNA_APP_KEY)")
            return []

        country_code = COUNTRY_CODES.get(country.lower().strip(), "fr")

        params: dict[str, str | int] = {
            "app_id": app_id,
            "app_key": app_key,
            "what": f"{keywords} intern OR internship OR stage",
            "results_per_page": min(max_results, 50),
            "content-type": "application/json",
        }

        if location:
            params["where"] = location
            params["distance"] = radius_km

        url = ADZUNA_API.format(country=country_code, page=1)

        try:
            resp = httpx.get(url, params=params, timeout=20)
            resp.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Adzuna API failed: %s", exc)
            return []

        data = resp.json()
        results = data.get("results", [])
        logger.info("Adzuna: %d results for '%s' in %s", len(results), keywords, country_code)

        offers: list[RawOffer] = []
        for job in results[:max_results]:
            location_name = job.get("location", {}).get("display_name", "")
            company_name = job.get("company", {}).get("display_name", "Unknown")

            salary_min = job.get("salary_min")
            salary_max = job.get("salary_max")
            salary = None
            if salary_min and salary_max:
                salary = f"{salary_min:.0f} - {salary_max:.0f}"
            elif salary_min:
                salary = f"{salary_min:.0f}"

            offers.append(
                RawOffer(
                    source="adzuna",
                    source_id=str(job.get("id", "")),
                    company=company_name,
                    title=job.get("title", ""),
                    description=(job.get("description") or "")[:2000] or None,
                    locations=location_name or None,
                    link=job.get("redirect_url"),
                    contract_type=job.get("contract_type") or "Internship",
                    salary=salary,
                    published_at=job.get("created"),
                )
            )

        logger.info("Adzuna: found %d offers for '%s'", len(offers), keywords)
        return offers
