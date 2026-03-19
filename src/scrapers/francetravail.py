"""France Travail (ex-Pole Emploi) API client for internship offers."""

import logging
import time

import httpx

from src.config import FRANCE_TRAVAIL_CLIENT_ID, FRANCE_TRAVAIL_CLIENT_SECRET
from src.scrapers.base import OfferSource, RawOffer

logger = logging.getLogger(__name__)

TOKEN_URL = (
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    "?realm=/partenaire"
)
SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
GEO_API_URL = "https://geo.api.gouv.fr/communes"

# Fallback mapping for major cities (geo.api.gouv.fr can be flaky)
CITY_DEPT: dict[str, str] = {
    "paris": "75",
    "lyon": "69",
    "marseille": "13",
    "toulouse": "31",
    "bordeaux": "33",
    "lille": "59",
    "nantes": "44",
    "strasbourg": "67",
    "montpellier": "34",
    "rennes": "35",
    "grenoble": "38",
    "nice": "06",
}


class FranceTravailSource(OfferSource):
    name = "francetravail"

    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expires: float = 0
        self._dept_cache: dict[str, str] = {}

    def _get_token(self) -> str:
        """Obtain an OAuth2 access token (cached until expiry)."""
        if self._token and time.time() < self._token_expires:
            return self._token

        if not FRANCE_TRAVAIL_CLIENT_ID or not FRANCE_TRAVAIL_CLIENT_SECRET:
            raise RuntimeError(
                "FRANCE_TRAVAIL_CLIENT_ID and FRANCE_TRAVAIL_CLIENT_SECRET "
                "must be set to use France Travail API."
            )

        resp = httpx.post(
            TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": FRANCE_TRAVAIL_CLIENT_ID,
                "client_secret": FRANCE_TRAVAIL_CLIENT_SECRET,
                "scope": "api_offresdemploiv2 o2dsoffre",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expires = time.time() + data.get("expires_in", 1500) - 60
        return self._token  # type: ignore[return-value]

    def _resolve_departement(self, location: str) -> str | None:
        """Resolve a city name to a département code using geo.api.gouv.fr."""
        key = location.strip().lower()
        if key in self._dept_cache:
            return self._dept_cache[key]

        # Check hardcoded fallback first
        if key in CITY_DEPT:
            self._dept_cache[key] = CITY_DEPT[key]
            return CITY_DEPT[key]

        try:
            resp = httpx.get(
                GEO_API_URL,
                params={
                    "nom": location,
                    "limit": 5,
                    "fields": "nom,codeDepartement,population",
                },
                timeout=10,
            )
            resp.raise_for_status()
            communes = resp.json()
            if not communes:
                return None

            # Pick the commune with the highest population (avoids e.g. "Parisot" > "Paris")
            best = max(communes, key=lambda c: c.get("population", 0))
            dept = best.get("codeDepartement")
            if dept:
                self._dept_cache[key] = dept
                logger.info(
                    "Resolved '%s' -> %s (dept %s, pop %s)",
                    location,
                    best.get("nom"),
                    dept,
                    best.get("population"),
                )
                return dept
        except Exception as exc:
            logger.warning("Could not resolve département for '%s': %s", location, exc)

        return None

    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
    ) -> list[RawOffer]:
        token = self._get_token()

        params: dict[str, str | int] = {
            "motsCles": keywords,
            "range": f"0-{min(max_results, 149)}",
        }

        if location:
            dept = self._resolve_departement(location)
            if dept:
                params["departement"] = dept

        logger.info("France Travail search params: %s", params)

        try:
            resp = httpx.get(
                SEARCH_URL,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            logger.info(
                "France Travail response: status=%s, length=%s",
                resp.status_code,
                len(resp.text),
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("France Travail API error: %s", exc.response.text[:300])
            return []
        except httpx.RequestError as exc:
            logger.error("France Travail request failed: %s", exc)
            return []

        if not resp.text.strip():
            logger.warning(
                "France Travail returned empty body (status %s)",
                resp.status_code,
            )
            return []

        try:
            data = resp.json()
        except Exception as exc:
            logger.error(
                "France Travail JSON parse error: %s — body: %.200s",
                exc,
                resp.text,
            )
            return []

        resultats = data.get("resultats") or []

        offers: list[RawOffer] = []
        for item in resultats[:max_results]:
            entreprise = item.get("entreprise", {})
            lieu = item.get("lieuTravail", {})
            salaire = item.get("salaire", {})

            salary_str = None
            if salaire.get("libelle"):
                salary_str = salaire["libelle"]

            offers.append(
                RawOffer(
                    source="francetravail",
                    source_id=item.get("id", ""),
                    company=entreprise.get("nom", "Entreprise non renseignee"),
                    title=item.get("intitule", ""),
                    description=item.get("description"),
                    locations=lieu.get("libelle"),
                    link=item.get("origineOffre", {}).get("urlOrigine")
                    or f"https://candidat.francetravail.fr/offres/recherche/detail/{item.get('id', '')}",
                    contract_type=item.get("typeContratLibelle"),
                    salary=salary_str,
                    published_at=item.get("dateCreation"),
                )
            )

        logger.info("France Travail: found %d offers for '%s'", len(offers), keywords)
        return offers
