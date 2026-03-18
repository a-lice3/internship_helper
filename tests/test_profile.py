def test_add_and_list_skills(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/skills",
        json={"name": "Python", "category": "programming", "level": "advanced"},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Python"

    response = client.get(f"/users/{uid}/skills", headers=auth_header)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_delete_skill(client, sample_user, auth_header):
    uid = sample_user["id"]
    skill = client.post(
        f"/users/{uid}/skills",
        json={"name": "SQL", "category": "programming"},
        headers=auth_header,
    ).json()

    response = client.delete(f"/users/{uid}/skills/{skill['id']}", headers=auth_header)
    assert response.status_code == 200

    response = client.get(f"/users/{uid}/skills", headers=auth_header)
    assert len(response.json()) == 0


def test_add_and_list_experiences(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/experiences",
        json={
            "title": "My App",
            "description": "A web app",
            "technologies": "Python, FastAPI",
        },
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "My App"

    response = client.get(f"/users/{uid}/experiences", headers=auth_header)
    assert len(response.json()) == 1


def test_add_and_list_education(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/education",
        json={"school": "MIT", "degree": "BSc", "field": "Computer Science"},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["school"] == "MIT"

    response = client.get(f"/users/{uid}/education", headers=auth_header)
    assert len(response.json()) == 1


def test_add_and_list_languages(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/languages",
        json={"language": "French", "level": "native"},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["language"] == "French"

    response = client.get(f"/users/{uid}/languages", headers=auth_header)
    assert len(response.json()) == 1


def test_profile_unauthenticated(client):
    response = client.post(
        "/users/999/skills", json={"name": "Python", "category": "programming"}
    )
    assert response.status_code == 401
