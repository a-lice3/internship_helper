def test_dashboard_empty(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.get(f"/users/{uid}/dashboard", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_offers"] == 0
    assert data["average_interview_score"] is None
    assert data["upcoming_reminders"] == []
    assert data["interview_sessions_count"] == 0


def test_dashboard_with_offers(client, sample_user, auth_header):
    uid = sample_user["id"]
    client.post(
        f"/users/{uid}/offers",
        json={"company": "A", "title": "Job A", "status": "applied"},
        headers=auth_header,
    )
    client.post(
        f"/users/{uid}/offers",
        json={"company": "B", "title": "Job B", "status": "applied"},
        headers=auth_header,
    )
    client.post(
        f"/users/{uid}/offers",
        json={"company": "C", "title": "Job C", "status": "rejected"},
        headers=auth_header,
    )

    resp = client.get(f"/users/{uid}/dashboard", headers=auth_header)
    data = resp.json()
    assert data["total_offers"] == 3
    assert data["offers_by_status"]["applied"] == 2
    assert data["offers_by_status"]["rejected"] == 1


def test_dashboard_with_reminders(client, sample_user, auth_header):
    uid = sample_user["id"]
    client.post(
        f"/users/{uid}/reminders",
        json={"title": "Future reminder", "due_at": "2099-01-01T10:00:00"},
        headers=auth_header,
    )

    resp = client.get(f"/users/{uid}/dashboard", headers=auth_header)
    data = resp.json()
    assert len(data["upcoming_reminders"]) == 1
    assert data["upcoming_reminders"][0]["title"] == "Future reminder"


def test_calendar_empty(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.get(
        f"/users/{uid}/calendar?start=2026-03-01&end=2026-03-31",
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["events"] == []


def test_calendar_with_reminder(client, sample_user, auth_header):
    uid = sample_user["id"]
    client.post(
        f"/users/{uid}/reminders",
        json={"title": "March reminder", "due_at": "2026-03-15T14:00:00"},
        headers=auth_header,
    )

    resp = client.get(
        f"/users/{uid}/calendar?start=2026-03-01&end=2026-03-31",
        headers=auth_header,
    )
    events = resp.json()["events"]
    assert len(events) == 1
    assert events[0]["event_type"] == "reminder"
    assert events[0]["title"] == "March reminder"


def test_calendar_invalid_dates(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.get(
        f"/users/{uid}/calendar?start=bad&end=also-bad",
        headers=auth_header,
    )
    assert resp.status_code == 400
