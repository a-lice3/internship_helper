"""Integration tests for the search router endpoints."""

from unittest.mock import patch

from src.scrapers.base import RawOffer

FAKE_OFFERS = [
    RawOffer(
        source="wttj",
        source_id="wttj-1",
        company="Acme",
        title="ML Intern",
        description="Machine learning internship",
        locations="Paris",
        link="https://wttj.co/1",
        contract_type="Stage",
    ),
    RawOffer(
        source="wttj",
        source_id="wttj-2",
        company="Beta Inc",
        title="Backend Intern",
        description="Backend dev",
        locations="Lyon",
        link="https://wttj.co/2",
        contract_type="Stage",
    ),
]

FAKE_MATCH_RESULTS = [
    {"score": 85, "reasons": ["Strong Python skills"]},
    {"score": 60, "reasons": ["Some backend experience"]},
]

FAKE_EXTRACT_PARAMS = {
    "keywords": "machine learning",
    "location": "Paris",
    "country": "France",
    "radius_km": 30,
    "sources": ["wttj"],
}


# ---------- Helpers ----------


def _create_scraped_offers(client, uid, auth_header):
    """Run a chat-search to populate scraped offers in DB."""
    with (
        patch(
            "src.routers.search.extract_search_params",
            return_value=FAKE_EXTRACT_PARAMS,
        ),
        patch(
            "src.routers.search._wttj_source.search",
            return_value=FAKE_OFFERS,
        ),
        patch(
            "src.routers.search.match_offers_to_profile",
            return_value=FAKE_MATCH_RESULTS,
        ),
    ):
        resp = client.post(
            f"/users/{uid}/chat-search",
            json={"message": "stage ML a Paris"},
            headers=auth_header,
        )
    assert resp.status_code == 200
    return resp.json()


# ---------- POST /users/{uid}/chat-search ----------


def test_chat_search_returns_results(client, sample_user, auth_header):
    uid = sample_user["id"]
    data = _create_scraped_offers(client, uid, auth_header)

    assert data["total"] == 2
    assert len(data["results"]) == 2
    assert data["sources_used"] == ["wttj"]
    # Results sorted by score descending
    assert data["results"][0]["match_score"] >= data["results"][1]["match_score"]
    assert data["results"][0]["company"] == "Acme"
    assert data["parsed_query"] == FAKE_EXTRACT_PARAMS


def test_chat_search_no_results(client, sample_user, auth_header):
    uid = sample_user["id"]
    with (
        patch(
            "src.routers.search.extract_search_params",
            return_value=FAKE_EXTRACT_PARAMS,
        ),
        patch("src.routers.search._wttj_source.search", return_value=[]),
    ):
        resp = client.post(
            f"/users/{uid}/chat-search",
            json={"message": "nothing here"},
            headers=auth_header,
        )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0
    assert resp.json()["results"] == []


def test_chat_search_mistral_error(client, sample_user, auth_header):
    uid = sample_user["id"]
    with patch(
        "src.routers.search.extract_search_params",
        side_effect=RuntimeError("API down"),
    ):
        resp = client.post(
            f"/users/{uid}/chat-search",
            json={"message": "test"},
            headers=auth_header,
        )
    assert resp.status_code == 502


# ---------- POST /users/{uid}/search-offers ----------


def test_search_offers_structured(client, sample_user, auth_header):
    uid = sample_user["id"]
    with (
        patch("src.routers.search._wttj_source.search", return_value=FAKE_OFFERS),
        patch(
            "src.routers.search.match_offers_to_profile",
            return_value=FAKE_MATCH_RESULTS,
        ),
    ):
        resp = client.post(
            f"/users/{uid}/search-offers",
            json={
                "keywords": "ML",
                "sources": ["wttj"],
                "country": "France",
            },
            headers=auth_header,
        )
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


# ---------- GET /users/{uid}/scraped-offers ----------


def test_list_scraped_offers(client, sample_user, auth_header):
    uid = sample_user["id"]
    _create_scraped_offers(client, uid, auth_header)

    resp = client.get(f"/users/{uid}/scraped-offers", headers=auth_header)
    assert resp.status_code == 200
    offers = resp.json()
    assert len(offers) == 2
    # Ordered by match_score desc
    assert offers[0]["match_score"] >= offers[1]["match_score"]


def test_list_scraped_offers_empty(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.get(f"/users/{uid}/scraped-offers", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------- POST /users/{uid}/scraped-offers/{id}/save ----------


def test_save_scraped_offer_to_tracker(client, sample_user, auth_header):
    uid = sample_user["id"]
    data = _create_scraped_offers(client, uid, auth_header)
    scraped_id = data["results"][0]["id"]

    resp = client.post(
        f"/users/{uid}/scraped-offers/{scraped_id}/save",
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert "offer_id" in resp.json()

    # The saved offer should be in the tracker with bookmarked status
    tracker_offer_id = resp.json()["offer_id"]
    offer_resp = client.get(
        f"/users/{uid}/offers/{tracker_offer_id}",
        headers=auth_header,
    )
    assert offer_resp.status_code == 200
    assert offer_resp.json()["status"] == "bookmarked"
    assert offer_resp.json()["date_applied"] is None


def test_save_scraped_offer_marks_as_saved(client, sample_user, auth_header):
    uid = sample_user["id"]
    data = _create_scraped_offers(client, uid, auth_header)
    scraped_id = data["results"][0]["id"]

    client.post(
        f"/users/{uid}/scraped-offers/{scraped_id}/save",
        headers=auth_header,
    )

    # Check the scraped offer is now marked as saved
    resp = client.get(f"/users/{uid}/scraped-offers", headers=auth_header)
    saved_offer = next(o for o in resp.json() if o["id"] == scraped_id)
    assert saved_offer["saved"] is True


def test_save_scraped_offer_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.post(
        f"/users/{uid}/scraped-offers/9999/save",
        headers=auth_header,
    )
    assert resp.status_code == 404


# ---------- DELETE /users/{uid}/scraped-offers/{id} ----------


def test_delete_scraped_offer(client, sample_user, auth_header):
    uid = sample_user["id"]
    data = _create_scraped_offers(client, uid, auth_header)
    scraped_id = data["results"][0]["id"]

    resp = client.delete(
        f"/users/{uid}/scraped-offers/{scraped_id}",
        headers=auth_header,
    )
    assert resp.status_code == 200

    # Confirm it's gone
    resp = client.get(f"/users/{uid}/scraped-offers", headers=auth_header)
    assert len(resp.json()) == 1


def test_delete_scraped_offer_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.delete(
        f"/users/{uid}/scraped-offers/9999",
        headers=auth_header,
    )
    assert resp.status_code == 404


# ---------- DELETE /users/{uid}/scraped-offers ----------


def test_clear_scraped_offers(client, sample_user, auth_header):
    uid = sample_user["id"]
    _create_scraped_offers(client, uid, auth_header)

    resp = client.delete(f"/users/{uid}/scraped-offers", headers=auth_header)
    assert resp.status_code == 200
    assert "2" in resp.json()["detail"]

    # Confirm empty
    resp = client.get(f"/users/{uid}/scraped-offers", headers=auth_header)
    assert resp.json() == []
