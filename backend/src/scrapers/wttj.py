"""Welcome to the Jungle scraper using their Algolia search API."""

import logging
import re

import httpx

from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

# Public Algolia credentials used by the WTTJ website (visible in their frontend JS)
_ALGOLIA_APP_ID = "CSEKHVMS53"
_ALGOLIA_API_KEY = "4bd8f6215d0cc52b26430765769e65a0"
ALGOLIA_URL = f"https://{_ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries"

# Major city coordinates for geo-filtering (avoids geocoding API calls)
CITY_COORDS: dict[str, tuple[float, float]] = {
    "paris": (48.8566, 2.3522),
    "lyon": (45.7640, 4.8357),
    "marseille": (43.2965, 5.3698),
    "toulouse": (43.6047, 1.4442),
    "bordeaux": (44.8378, -0.5792),
    "lille": (50.6292, 3.0573),
    "nantes": (47.2184, -1.5536),
    "strasbourg": (48.5734, 7.7521),
    "montpellier": (43.6108, 3.8767),
    "rennes": (48.1173, -1.6778),
    "grenoble": (45.1885, 5.7245),
    "nice": (43.7102, 7.2620),
    "london": (51.5074, -0.1278),
    "berlin": (52.5200, 13.4050),
    "amsterdam": (52.3676, 4.9041),
    "barcelona": (41.3874, 2.1686),
    "brussels": (50.8503, 4.3517),
    "dubai": (25.2048, 55.2708),
    "new york": (40.7128, -74.0060),
    "san francisco": (37.7749, -122.4194),
    "tokyo": (35.6762, 139.6503),
    "singapore": (1.3521, 103.8198),
    "munich": (48.1351, 11.5820),
    "zurich": (47.3769, 8.5417),
    "dublin": (53.3498, -6.2603),
    "lisbon": (38.7223, -9.1393),
    "milan": (45.4642, 9.1900),
    "madrid": (40.4168, -3.7038),
    "vienna": (48.2082, 16.3738),
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


class WTTJSource(OfferSource):
    name = "wttj"

    def __init__(self) -> None:
        self._coord_cache: dict[str, tuple[float, float] | None] = {}

    def _resolve_coords(
        self,
        location: str,
    ) -> tuple[float, float] | None:
        """Resolve a city name to lat/lng coordinates."""
        key = location.strip().lower()
        if key in self._coord_cache:
            return self._coord_cache[key]

        # Check hardcoded cities first
        if key in CITY_COORDS:
            self._coord_cache[key] = CITY_COORDS[key]
            return CITY_COORDS[key]

        # Fallback: Nominatim (OpenStreetMap) — works worldwide
        try:
            resp = httpx.get(
                NOMINATIM_URL,
                params={"q": location, "format": "json", "limit": 1},
                headers={"User-Agent": "internship-helper/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                lat = float(results[0]["lat"])
                lng = float(results[0]["lon"])
                self._coord_cache[key] = (lat, lng)
                logger.info("Geocoded '%s' -> (%s, %s)", location, lat, lng)
                return (lat, lng)
        except Exception as exc:
            logger.warning("Could not geocode '%s': %s", location, exc)

        self._coord_cache[key] = None
        return None

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
    ) -> list[RawOffer]:
        params_str = (
            f"query={keywords}"
            f"&hitsPerPage={min(max_results, 50)}"
            f"&facetFilters=%5B%5B%22contract_type%3Ainternship%22%5D%5D"
        )

        if location:
            coords = self._resolve_coords(location)
            if coords:
                lat, lng = coords
                params_str += f"&aroundLatLng={lat}%2C{lng}"
                params_str += f"&aroundRadius={radius_km * 1000}"

        headers = {
            "X-Algolia-Application-Id": _ALGOLIA_APP_ID,
            "X-Algolia-API-Key": _ALGOLIA_API_KEY,
            "Referer": "https://www.welcometothejungle.com/",
            "Origin": "https://www.welcometothejungle.com",
        }

        try:
            resp = httpx.post(
                ALGOLIA_URL,
                json={
                    "requests": [
                        {
                            "indexName": "wttj_jobs_production_fr",
                            "params": params_str,
                        }
                    ]
                },
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("WTTJ Algolia search failed: %s", exc)
            return []

        data = resp.json()
        results = data.get("results", [])
        if not results:
            logger.warning("WTTJ: no results block in response")
            return []

        hits = results[0].get("hits", [])
        nb_hits = results[0].get("nbHits", 0)
        logger.info("WTTJ: %d total hits, processing %d", nb_hits, len(hits))

        offers: list[RawOffer] = []
        for hit in hits[:max_results]:
            org = hit.get("organization", {})
            office = hit.get("office", {})
            slug = hit.get("slug", "")
            org_slug = org.get("slug", "")

            link = f"https://www.welcometothejungle.com/fr/companies/{org_slug}/jobs/{slug}"

            salary = hit.get("salary") or None
            if isinstance(salary, dict):
                salary = salary.get("label")

            # Extract city from slug: "job-title_city" or "job-title_city_ORG_ref"
            city = office.get("city")
            if not city and slug:
                match = re.match(r".+?_([a-z][a-z0-9-]+?)(?:_[A-Z]|$)", slug)
                if match:
                    city = match.group(1).replace("-", " ").title()

            offers.append(
                RawOffer(
                    source="wttj",
                    source_id=hit.get("reference", slug),
                    company=org.get("name", "Entreprise"),
                    title=hit.get("name", ""),
                    description=hit.get("body"),
                    locations=city,
                    link=link,
                    contract_type="Stage",
                    salary=salary,
                    published_at=hit.get("published_at_date"),
                )
            )

        logger.info("WTTJ: found %d offers for '%s'", len(offers), keywords)
        return offers
