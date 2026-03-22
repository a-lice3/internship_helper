"""Tests for CV analysis features: toggle default, general analysis, offer-specific analysis."""

from unittest.mock import patch

# ---------- helpers ----------


def _create_cv(client, uid, auth_header, name="My CV", content="CV content here"):
    return client.post(
        f"/users/{uid}/cvs",
        json={"content": content, "name": name, "company": "TestCo"},
        headers=auth_header,
    ).json()


def _create_offer(client, uid, auth_header):
    return client.post(
        f"/users/{uid}/offers",
        json={
            "company": "Google",
            "title": "SWE Intern",
            "description": "Build cool stuff",
        },
        headers=auth_header,
    ).json()


# ---------- Toggle default CV ----------


def test_toggle_default_cv(client, sample_user, auth_header):
    uid = sample_user["id"]
    cv1 = _create_cv(client, uid, auth_header, name="CV 1")
    cv2 = _create_cv(client, uid, auth_header, name="CV 2")

    # Set cv1 as default
    resp = client.post(
        f"/users/{uid}/cvs/{cv1['id']}/toggle-default", headers=auth_header
    )
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # Set cv2 as default — cv1 should lose default
    resp = client.post(
        f"/users/{uid}/cvs/{cv2['id']}/toggle-default", headers=auth_header
    )
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # Verify cv1 is no longer default
    cvs = client.get(f"/users/{uid}/cvs", headers=auth_header).json()
    defaults = [c for c in cvs if c["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == cv2["id"]


def test_toggle_default_cv_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.post(f"/users/{uid}/cvs/9999/toggle-default", headers=auth_header)
    assert resp.status_code == 404


def test_first_cv_gets_default(client, sample_user, auth_header):
    """The first uploaded CV should automatically become the default."""
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)
    assert cv["is_default"] is True


def test_second_cv_not_default(client, sample_user, auth_header):
    """Subsequent CVs should not be default automatically."""
    uid = sample_user["id"]
    _create_cv(client, uid, auth_header, name="CV 1")
    cv2 = _create_cv(client, uid, auth_header, name="CV 2")
    assert cv2["is_default"] is False


# ---------- General CV analysis ----------


_GENERAL_ANALYSIS_RESULT = {
    "score": 8,
    "summary": "Solid CV with clear structure.",
    "strengths": ["Good formatting", "Relevant skills"],
    "improvements": ["Add more quantified achievements"],
}


@patch("src.llm_service.analyze_cv_general", return_value=_GENERAL_ANALYSIS_RESULT)
def test_analyze_cv_general(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)

    resp = client.post(f"/users/{uid}/cvs/{cv['id']}/analyze", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 8
    assert data["summary"] == "Solid CV with clear structure."
    assert len(data["strengths"]) == 2
    assert len(data["improvements"]) == 1
    mock_llm.assert_called_once()


@patch("src.llm_service.analyze_cv_general", return_value=_GENERAL_ANALYSIS_RESULT)
def test_analyze_cv_not_found(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.post(f"/users/{uid}/cvs/9999/analyze", headers=auth_header)
    assert resp.status_code == 404
    mock_llm.assert_not_called()


@patch("src.llm_service.analyze_cv_general", return_value=_GENERAL_ANALYSIS_RESULT)
def test_get_stored_cv_analyses(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)

    # Trigger analysis
    client.post(f"/users/{uid}/cvs/{cv['id']}/analyze", headers=auth_header)

    # Fetch stored analyses
    resp = client.get(f"/users/{uid}/cv-analyses", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["cv_id"] == cv["id"]
    assert data[0]["score"] == 8
    assert data[0]["strengths"] == ["Good formatting", "Relevant skills"]


@patch("src.llm_service.analyze_cv_general", return_value=_GENERAL_ANALYSIS_RESULT)
def test_cv_analysis_is_upserted(mock_llm, client, sample_user, auth_header):
    """Re-analyzing the same CV should update the existing record, not create a duplicate."""
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)

    client.post(f"/users/{uid}/cvs/{cv['id']}/analyze", headers=auth_header)
    client.post(f"/users/{uid}/cvs/{cv['id']}/analyze", headers=auth_header)

    resp = client.get(f"/users/{uid}/cv-analyses", headers=auth_header)
    assert len(resp.json()) == 1


# ---------- CV Offer Analysis (suggest changes) ----------


_SUGGESTIONS_RESULT = {
    "score": 7,
    "suggested_title": "Software Engineer Intern",
    "suggested_profile": "Motivated CS student...",
    "other_suggestions": ["Highlight Python experience", "Add project links"],
}


@patch("src.routers.ai.suggest_cv_changes", return_value=_SUGGESTIONS_RESULT)
def test_suggest_cv_changes(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)
    offer = _create_offer(client, uid, auth_header)

    resp = client.post(
        f"/users/{uid}/offers/{offer['id']}/suggest-cv-changes",
        json={"cv_id": cv["id"]},
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 7
    assert data["suggested_title"] == "Software Engineer Intern"
    assert len(data["other_suggestions"]) == 2
    assert data["offer_title"] == "SWE Intern"
    assert data["company"] == "Google"
    mock_llm.assert_called_once()


@patch("src.routers.ai.suggest_cv_changes", return_value=_SUGGESTIONS_RESULT)
def test_suggest_cv_changes_offer_not_found(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)

    resp = client.post(
        f"/users/{uid}/offers/9999/suggest-cv-changes",
        json={"cv_id": cv["id"]},
        headers=auth_header,
    )
    assert resp.status_code == 404


@patch("src.routers.ai.suggest_cv_changes", return_value=_SUGGESTIONS_RESULT)
def test_suggest_cv_changes_cv_not_found(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = _create_offer(client, uid, auth_header)

    resp = client.post(
        f"/users/{uid}/offers/{offer['id']}/suggest-cv-changes",
        json={"cv_id": 9999},
        headers=auth_header,
    )
    assert resp.status_code == 404


@patch("src.routers.ai.suggest_cv_changes", return_value=_SUGGESTIONS_RESULT)
def test_get_stored_cv_offer_analyses(mock_llm, client, sample_user, auth_header):
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)
    offer = _create_offer(client, uid, auth_header)

    # Trigger analysis
    client.post(
        f"/users/{uid}/offers/{offer['id']}/suggest-cv-changes",
        json={"cv_id": cv["id"]},
        headers=auth_header,
    )

    # Fetch stored
    resp = client.get(f"/users/{uid}/cv-offer-analyses", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["offer_id"] == offer["id"]
    assert data[0]["cv_id"] == cv["id"]
    assert data[0]["score"] == 7
    assert data[0]["other_suggestions"] == [
        "Highlight Python experience",
        "Add project links",
    ]


@patch("src.routers.ai.suggest_cv_changes", return_value=_SUGGESTIONS_RESULT)
def test_cv_offer_analysis_is_upserted(mock_llm, client, sample_user, auth_header):
    """Re-analyzing the same CV+offer pair should update, not duplicate."""
    uid = sample_user["id"]
    cv = _create_cv(client, uid, auth_header)
    offer = _create_offer(client, uid, auth_header)

    client.post(
        f"/users/{uid}/offers/{offer['id']}/suggest-cv-changes",
        json={"cv_id": cv["id"]},
        headers=auth_header,
    )
    client.post(
        f"/users/{uid}/offers/{offer['id']}/suggest-cv-changes",
        json={"cv_id": cv["id"]},
        headers=auth_header,
    )

    resp = client.get(f"/users/{uid}/cv-offer-analyses", headers=auth_header)
    assert len(resp.json()) == 1
