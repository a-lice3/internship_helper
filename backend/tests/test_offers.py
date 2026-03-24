def test_create_and_list_offers(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/offers",
        json={
            "company": "Google",
            "title": "SWE Intern",
            "description": "Build cool stuff",
            "link": "https://example.com",
            "locations": "Paris, London",
            "status": "applied",
        },
        headers=auth_header,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["company"] == "Google"
    assert data["status"] == "applied"

    response = client.get(f"/users/{uid}/offers", headers=auth_header)
    assert len(response.json()["items"]) == 1


def test_update_offer_status(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "Meta", "title": "ML Intern"},
        headers=auth_header,
    ).json()

    response = client.patch(
        f"/users/{uid}/offers/{offer['id']}",
        json={"status": "screened"},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "screened"


def test_filter_offers_by_status(client, sample_user, auth_header):
    uid = sample_user["id"]
    client.post(
        f"/users/{uid}/offers",
        json={"company": "A", "title": "Job A", "status": "applied"},
        headers=auth_header,
    )
    client.post(
        f"/users/{uid}/offers",
        json={"company": "B", "title": "Job B", "status": "rejected"},
        headers=auth_header,
    )

    response = client.get(f"/users/{uid}/offers?status=applied", headers=auth_header)
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["company"] == "A"


def test_get_single_offer(client, sample_user, auth_header):
    uid = sample_user["id"]
    offer = client.post(
        f"/users/{uid}/offers",
        json={"company": "X", "title": "Y"},
        headers=auth_header,
    ).json()

    response = client.get(f"/users/{uid}/offers/{offer['id']}", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["company"] == "X"


def test_offer_not_found(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.get(f"/users/{uid}/offers/9999", headers=auth_header)
    assert response.status_code == 404
