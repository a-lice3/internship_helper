"""Unit tests for scraper parsing logic (no real HTTP calls)."""

from unittest.mock import patch, MagicMock

import httpx

from src.scrapers.wttj import WTTJSource
from src.scrapers.francetravail import FranceTravailSource
from src.scrapers.themuse import TheMuseSource, _strip_html

# ---------- WTTJ ----------


def _wttj_algolia_response(hits: list[dict]) -> dict:
    return {"results": [{"hits": hits, "nbHits": len(hits)}]}


@patch("src.scrapers.wttj._ALGOLIA_API_KEY", "fake-key")
@patch("src.scrapers.wttj._ALGOLIA_APP_ID", "fake-app")
@patch("src.scrapers.wttj.httpx.post")
def test_wttj_parses_hits(mock_post):
    hit = {
        "reference": "ref-123",
        "name": "Data Science Intern",
        "body": "Great internship",
        "slug": "data-science-intern_paris",
        "published_at_date": "2026-03-01",
        "salary": {"label": "1200€/month"},
        "organization": {"name": "Acme Corp", "slug": "acme-corp"},
        "office": {"city": "Paris"},
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = _wttj_algolia_response([hit])
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    source = WTTJSource()
    offers = source.search("data science", location=None)

    assert len(offers) == 1
    assert offers[0].source == "wttj"
    assert offers[0].source_id == "ref-123"
    assert offers[0].company == "Acme Corp"
    assert offers[0].title == "Data Science Intern"
    assert offers[0].locations == "Paris"
    assert offers[0].salary == "1200€/month"
    assert "acme-corp" in offers[0].link


@patch("src.scrapers.wttj._ALGOLIA_API_KEY", "fake-key")
@patch("src.scrapers.wttj._ALGOLIA_APP_ID", "fake-app")
@patch("src.scrapers.wttj.httpx.post")
def test_wttj_empty_response(mock_post):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"results": []}
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    source = WTTJSource()
    offers = source.search("anything")
    assert offers == []


@patch("src.scrapers.wttj._ALGOLIA_API_KEY", "fake-key")
@patch("src.scrapers.wttj._ALGOLIA_APP_ID", "fake-app")
@patch("src.scrapers.wttj.httpx.post")
def test_wttj_http_error_returns_empty(mock_post):
    mock_post.side_effect = httpx.RequestError("timeout")

    source = WTTJSource()
    offers = source.search("data")
    assert offers == []


@patch("src.scrapers.wttj._ALGOLIA_API_KEY", "fake-key")
@patch("src.scrapers.wttj._ALGOLIA_APP_ID", "fake-app")
@patch("src.scrapers.wttj.httpx.post")
def test_wttj_salary_string(mock_post):
    """salary can be a plain string instead of a dict."""
    hit = {
        "reference": "ref-456",
        "name": "Dev Intern",
        "slug": "dev-intern_lyon",
        "organization": {"name": "Corp", "slug": "corp"},
        "office": {},
        "salary": "negotiable",
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = _wttj_algolia_response([hit])
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    offers = WTTJSource().search("dev")
    assert offers[0].salary == "negotiable"


@patch("src.scrapers.wttj._ALGOLIA_API_KEY", "fake-key")
@patch("src.scrapers.wttj._ALGOLIA_APP_ID", "fake-app")
@patch("src.scrapers.wttj.httpx.post")
def test_wttj_respects_max_results(mock_post):
    hits = [
        {
            "reference": f"ref-{i}",
            "name": f"Job {i}",
            "slug": f"job-{i}_paris",
            "organization": {"name": "Co", "slug": "co"},
            "office": {},
        }
        for i in range(10)
    ]
    mock_resp = MagicMock()
    mock_resp.json.return_value = _wttj_algolia_response(hits)
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    offers = WTTJSource().search("job", max_results=3)
    assert len(offers) == 3


# ---------- France Travail ----------


@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_SECRET", "fake-secret")
@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_ID", "fake-id")
@patch("src.scrapers.francetravail.httpx.get")
@patch("src.scrapers.francetravail.httpx.post")
def test_ft_parses_resultats(mock_post, mock_get):
    # Mock token request
    token_resp = MagicMock()
    token_resp.json.return_value = {"access_token": "fake-token", "expires_in": 1500}
    token_resp.raise_for_status = MagicMock()
    mock_post.return_value = token_resp

    # Mock search request
    search_resp = MagicMock()
    search_resp.status_code = 200
    search_resp.text = '{"resultats": [...]}'
    search_resp.json.return_value = {
        "resultats": [
            {
                "id": "ft-001",
                "intitule": "Stage Data Analyst",
                "description": "Analyse de donnees",
                "entreprise": {"nom": "BigCo"},
                "lieuTravail": {"libelle": "75 - Paris"},
                "salaire": {"libelle": "1000€/mois"},
                "typeContratLibelle": "Stage",
                "dateCreation": "2026-03-10",
                "origineOffre": {"urlOrigine": "https://example.com/ft-001"},
            }
        ]
    }
    search_resp.raise_for_status = MagicMock()
    mock_get.return_value = search_resp

    source = FranceTravailSource()
    offers = source.search("data analyst", location="Paris")

    assert len(offers) == 1
    assert offers[0].source == "francetravail"
    assert offers[0].source_id == "ft-001"
    assert offers[0].company == "BigCo"
    assert offers[0].title == "Stage Data Analyst"
    assert offers[0].locations == "75 - Paris"
    assert offers[0].salary == "1000€/mois"


@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_SECRET", "fake-secret")
@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_ID", "fake-id")
@patch("src.scrapers.francetravail.httpx.get")
@patch("src.scrapers.francetravail.httpx.post")
def test_ft_empty_body_returns_empty(mock_post, mock_get):
    token_resp = MagicMock()
    token_resp.json.return_value = {"access_token": "t", "expires_in": 1500}
    token_resp.raise_for_status = MagicMock()
    mock_post.return_value = token_resp

    search_resp = MagicMock()
    search_resp.status_code = 200
    search_resp.text = ""
    search_resp.raise_for_status = MagicMock()
    mock_get.return_value = search_resp

    offers = FranceTravailSource().search("anything")
    assert offers == []


@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_SECRET", "fake-secret")
@patch("src.scrapers.francetravail.FRANCE_TRAVAIL_CLIENT_ID", "fake-id")
@patch("src.scrapers.francetravail.httpx.get")
@patch("src.scrapers.francetravail.httpx.post")
def test_ft_http_error_returns_empty(mock_post, mock_get):
    token_resp = MagicMock()
    token_resp.json.return_value = {"access_token": "t", "expires_in": 1500}
    token_resp.raise_for_status = MagicMock()
    mock_post.return_value = token_resp

    mock_get.side_effect = httpx.RequestError("network error")

    offers = FranceTravailSource().search("data")
    assert offers == []


# ---------- The Muse ----------


def test_strip_html():
    assert _strip_html("<p>Hello <b>world</b></p>") == "Hello world"
    assert _strip_html(None) is None
    assert _strip_html("") is None


@patch("src.scrapers.themuse.httpx.get")
def test_muse_parses_results(mock_get):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "total": 1,
        "results": [
            {
                "id": 42,
                "name": "Software Intern",
                "contents": "<p>Build software</p>",
                "company": {"name": "TechCo"},
                "locations": [{"name": "London, United Kingdom"}],
                "levels": [{"name": "Internship"}],
                "refs": {"landing_page": "https://themuse.com/jobs/42"},
                "publication_date": "2026-03-15",
            }
        ],
    }
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    source = TheMuseSource()
    offers = source.search("software", location="london", country="UK")

    assert len(offers) == 1
    assert offers[0].source == "themuse"
    assert offers[0].source_id == "42"
    assert offers[0].company == "TechCo"
    assert offers[0].title == "Software Intern"
    assert offers[0].locations == "London, United Kingdom"
    assert offers[0].link == "https://themuse.com/jobs/42"


@patch("src.scrapers.themuse.httpx.get")
def test_muse_filters_by_keyword(mock_get):
    """Offers whose title/content don't match keywords are skipped."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "total": 1,
        "results": [
            {
                "id": 99,
                "name": "Marketing Manager",
                "contents": "<p>Marketing role</p>",
                "company": {"name": "Co"},
                "locations": [],
                "levels": [],
                "refs": {},
            }
        ],
    }
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    offers = TheMuseSource().search("data science")
    assert offers == []


@patch("src.scrapers.themuse.httpx.get")
def test_muse_http_error_returns_empty(mock_get):
    mock_get.side_effect = httpx.RequestError("fail")

    offers = TheMuseSource().search("intern")
    assert offers == []


def test_muse_resolve_location_city():
    source = TheMuseSource()
    assert source._resolve_location("London", None) == ["London, United Kingdom"]


def test_muse_resolve_location_country_fallback():
    source = TheMuseSource()
    assert source._resolve_location(None, "Germany") == [
        "Berlin, Germany",
        "Munich, Germany",
    ]


def test_muse_resolve_location_unknown():
    source = TheMuseSource()
    assert source._resolve_location("middle of nowhere", "Atlantis") is None
