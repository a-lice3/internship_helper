def test_create_and_list_notes(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Google", "title": "SWE Intern"},
        headers=auth_header,
    ).json()

    resp = client.post(
        f"/users/{uid}/offers/{offer['id']}/notes",
        json={"content": "Recruiter name: Jane Doe"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "Recruiter name: Jane Doe"
    assert data["offer_id"] == offer["id"]

    resp = client.get(f"/users/{uid}/offers/{offer['id']}/notes", headers=auth_header)
    assert len(resp.json()) == 1


def test_update_note(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Meta", "title": "ML Intern"},
        headers=auth_header,
    ).json()

    note = client.post(
        f"/users/{uid}/offers/{offer['id']}/notes",
        json={"content": "Initial note"},
        headers=auth_header,
    ).json()

    resp = client.patch(
        f"/users/{uid}/offers/{offer['id']}/notes/{note['id']}",
        json={"content": "Updated note content"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == "Updated note content"


def test_delete_note(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Apple", "title": "iOS Intern"},
        headers=auth_header,
    ).json()

    note = client.post(
        f"/users/{uid}/offers/{offer['id']}/notes",
        json={"content": "To delete"},
        headers=auth_header,
    ).json()

    resp = client.delete(
        f"/users/{uid}/offers/{offer['id']}/notes/{note['id']}",
        headers=auth_header,
    )
    assert resp.status_code == 200

    resp = client.get(f"/users/{uid}/offers/{offer['id']}/notes", headers=auth_header)
    assert len(resp.json()) == 0


def test_note_on_nonexistent_offer(client, sample_user, auth_header):
    uid = sample_user["id"]
    resp = client.post(
        f"/users/{uid}/offers/9999/notes",
        json={"content": "Should fail"},
        headers=auth_header,
    )
    assert resp.status_code == 404


def test_note_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "X", "title": "Y"},
        headers=auth_header,
    ).json()

    resp = client.patch(
        f"/users/{uid}/offers/{offer['id']}/notes/9999",
        json={"content": "nope"},
        headers=auth_header,
    )
    assert resp.status_code == 404
