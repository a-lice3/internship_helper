def test_create_and_list_reminders(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.post(
        f"/users/{uid}/reminders",
        json={
            "title": "Follow up with Google",
            "reminder_type": "follow_up",
            "due_at": "2026-04-01T10:00:00",
            "description": "Send a thank you email",
        },
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Follow up with Google"
    assert data["reminder_type"] == "follow_up"
    assert data["is_done"] is False

    resp = client.get(f"/users/{uid}/reminders", headers=auth_header)
    assert len(resp.json()["items"]) == 1


def test_toggle_reminder_done(client, sample_user, auth_header):
    uid = sample_user["id"]
    reminder = client.post(
        f"/users/{uid}/reminders",
        json={"title": "Deadline", "due_at": "2026-04-01T10:00:00"},
        headers=auth_header,
    ).json()

    resp = client.patch(
        f"/users/{uid}/reminders/{reminder['id']}",
        json={"is_done": True},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["is_done"] is True

    # By default, done reminders are excluded
    resp = client.get(f"/users/{uid}/reminders", headers=auth_header)
    assert len(resp.json()["items"]) == 0

    # With include_done=true, it should appear
    resp = client.get(f"/users/{uid}/reminders?include_done=true", headers=auth_header)
    assert len(resp.json()["items"]) == 1


def test_update_reminder(client, sample_user, auth_header):
    uid = sample_user["id"]
    reminder = client.post(
        f"/users/{uid}/reminders",
        json={"title": "Old title", "due_at": "2026-04-01T10:00:00"},
        headers=auth_header,
    ).json()

    resp = client.patch(
        f"/users/{uid}/reminders/{reminder['id']}",
        json={"title": "New title", "reminder_type": "deadline"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"
    assert resp.json()["reminder_type"] == "deadline"


def test_delete_reminder(client, sample_user, auth_header):
    uid = sample_user["id"]
    reminder = client.post(
        f"/users/{uid}/reminders",
        json={"title": "To delete", "due_at": "2026-04-01T10:00:00"},
        headers=auth_header,
    ).json()

    resp = client.delete(
        f"/users/{uid}/reminders/{reminder['id']}", headers=auth_header
    )
    assert resp.status_code == 200

    resp = client.get(f"/users/{uid}/reminders?include_done=true", headers=auth_header)
    assert len(resp.json()["items"]) == 0


def test_reminder_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.get(f"/users/{uid}/reminders/9999", headers=auth_header)
    assert resp.status_code == 404


def test_reminder_linked_to_offer(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Google", "title": "SWE Intern"},
        headers=auth_header,
    ).json()

    resp = client.post(
        f"/users/{uid}/reminders",
        json={
            "title": "Apply deadline",
            "due_at": "2026-04-15T23:59:00",
            "offer_id": offer["id"],
            "reminder_type": "deadline",
        },
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["offer_id"] == offer["id"]
