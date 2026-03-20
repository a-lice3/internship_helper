"""Base class for offer sources (API clients & scrapers)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class RawOffer:
    """Normalized offer from any source."""

    source: str  # "francetravail" or "wttj"
    source_id: str
    company: str
    title: str
    description: str | None = None
    locations: str | None = None
    link: str | None = None
    contract_type: str | None = None
    salary: str | None = None
    published_at: str | None = None


class OfferSource(ABC):
    """Abstract base class for offer sources."""

    name: str = ""

    @abstractmethod
    def search(
        self,
        keywords: str,
        location: str | None = None,
        radius_km: int = 30,
        max_results: int = 20,
    ) -> list[RawOffer]:
        """Search for internship offers and return normalized results."""
        ...
