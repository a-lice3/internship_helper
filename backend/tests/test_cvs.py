def test_upload_and_list_cvs(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/cvs",
        json={"content": "My CV content here", "company": "Google"},
        headers=auth_header,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "My CV content here"
    assert data["company"] == "Google"
    assert data["is_adapted"] is False

    response = client.get(f"/users/{uid}/cvs", headers=auth_header)
    assert len(response.json()) == 1


def test_cv_linked_to_offer(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Meta", "title": "SWE Intern"},
        headers=auth_header,
    ).json()

    response = client.post(
        f"/users/{uid}/cvs",
        json={"content": "CV for Meta", "company": "Meta", "offer_id": offer["id"]},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["offer_id"] == offer["id"]
