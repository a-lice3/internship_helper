"""The Muse API client for international internship offers.

Free API, no authentication required (500 requests/hour).
"""

import logging
import re

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

MUSE_API_URL = "https://www.themuse.com/api/public/jobs"

# City name -> The Muse formatted location(s)
CITY_LOCATIONS: dict[str, list[str]] = {
    "london": ["London, United Kingdom"],
    "manchester": ["Manchester, United Kingdom"],
    "edinburgh": ["Edinburgh, United Kingdom"],
    "new york": ["New York, NY"],
    "san francisco": ["San Francisco, CA"],
    "los angeles": ["Los Angeles, CA"],
    "chicago": ["Chicago, IL"],
    "seattle": ["Seattle, WA"],
    "boston": ["Boston, MA"],
    "austin": ["Austin, TX"],
    "washington": ["Washington, DC"],
    "dubai": ["Dubai, United Arab Emirates"],
    "abu dhabi": ["Abu Dhabi, United Arab Emirates"],
    "berlin": ["Berlin, Germany"],
    "munich": ["Munich, Germany"],
    "amsterdam": ["Amsterdam, Netherlands"],
    "barcelona": ["Barcelona, Spain"],
    "madrid": ["Madrid, Spain"],
    "dublin": ["Dublin, Ireland"],
    "zurich": ["Zurich, Switzerland"],
    "singapore": ["Singapore"],
    "tokyo": ["Tokyo, Japan"],
    "toronto": ["Toronto, Canada"],
    "montreal": ["Montreal, Canada"],
    "sydney": ["Sydney, Australia"],
    "melbourne": ["Melbourne, Australia"],
    "paris": ["Paris, France"],
    "lisbon": ["Lisbon, Portugal"],
    "milan": ["Milan, Italy"],
    "vienna": ["Vienna, Austria"],
    "brussels": ["Brussels, Belgium"],
    "copenhagen": ["Copenhagen, Denmark"],
    "stockholm": ["Stockholm, Sweden"],
    "hong kong": ["Hong Kong"],
    "seoul": ["Seoul, South Korea"],
}

# Country name -> The Muse location(s) for broad country search
COUNTRY_LOCATIONS: dict[str, list[str]] = {
    "uk": ["London, United Kingdom", "United Kingdom"],
    "united kingdom": ["London, United Kingdom", "United Kingdom"],
    "england": ["London, United Kingdom", "United Kingdom"],
    "usa": ["New York, NY", "San Francisco, CA", "United States"],
    "us": ["New York, NY", "San Francisco, CA", "United States"],
    "united states": ["New York, NY", "San Francisco, CA", "United States"],
    "uae": ["Dubai, United Arab Emirates"],
    "united arab emirates": ["Dubai, United Arab Emirates"],
    "germany": ["Berlin, Germany", "Munich, Germany"],
    "netherlands": ["Amsterdam, Netherlands"],
    "spain": ["Barcelona, Spain", "Madrid, Spain"],
    "ireland": ["Dublin, Ireland"],
    "switzerland": ["Zurich, Switzerland"],
    "singapore": ["Singapore"],
    "japan": ["Tokyo, Japan"],
    "canada": ["Toronto, Canada", "Montreal, Canada"],
    "australia": ["Sydney, Australia", "Melbourne, Australia"],
    "france": ["Paris, France"],
}


def _strip_html(html: str | None) -> str | None:
    """Remove HTML tags and return plain text."""
    if not html:
        return None
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text if text else None


class TheMuseSource(OfferSource):
    name = "themuse"

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
        country: str | None = None,
    ) -> list[RawOffer]:
        params: list[tuple[str, str | int | float | bool | None]] = [
            ("page", "0"),
            ("level", "Internship"),
        ]

        # Resolve location for The Muse
        muse_locations = self._resolve_location(location, country)
        if muse_locations:
            for loc in muse_locations:
                params.append(("location", loc))

        logger.info("The Muse params: %s", params)

        try:
            resp = httpx.get(
                MUSE_API_URL,
                params=params,
                timeout=20,
            )
            resp.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("The Muse API failed: %s", exc)
            return []

        data = resp.json()
        results = data.get("results", [])
        total = data.get("total", 0)
        logger.info("The Muse: %d total hits, processing %d", total, len(results))

        # Filter by keywords in title or content
        kw_lower = keywords.lower().split()

        offers: list[RawOffer] = []
        for job in results:
            title = job.get("name", "")
            contents = _strip_html(job.get("contents")) or ""

            # Check if at least one keyword matches title or content
            title_lower = title.lower()
            content_lower = contents[:1000].lower()
            if kw_lower and not any(
                kw in title_lower or kw in content_lower for kw in kw_lower
            ):
                continue

            company = job.get("company", {}).get("name", "")
            locations_list = [loc.get("name", "") for loc in job.get("locations", [])]
            levels = [lvl.get("name", "") for lvl in job.get("levels", [])]
            refs = job.get("refs", {})

            offers.append(
                RawOffer(
                    source="themuse",
                    source_id=str(job.get("id", "")),
                    company=company,
                    title=title,
                    description=contents[:2000] if contents else None,
                    locations=", ".join(locations_list) if locations_list else None,
                    link=refs.get("landing_page"),
                    contract_type=levels[0] if levels else "Internship",
                    salary=None,
                    published_at=job.get("publication_date"),
                )
            )

            if len(offers) >= max_results:
                break

        logger.info("The Muse: found %d offers for '%s'", len(offers), keywords)
        return offers

    def _resolve_location(
        self,
        location: str | None,
        country: str | None,
    ) -> list[str] | None:
        """Convert location/country to The Muse location strings."""
        if location:
            key = location.strip().lower()
            # Check city mapping first
            if key in CITY_LOCATIONS:
                return CITY_LOCATIONS[key]
            # Check if it's a country name
            if key in COUNTRY_LOCATIONS:
                return COUNTRY_LOCATIONS[key]

        # Fall back to country
        if country:
            key = country.strip().lower()
            if key in COUNTRY_LOCATIONS:
                return COUNTRY_LOCATIONS[key]

        return None
