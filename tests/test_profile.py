def test_add_and_list_skills(client, sample_user):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/skills",
        json={"name": "Python", "category": "programming", "level": "advanced"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Python"

    response = client.get(f"/users/{uid}/skills")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_delete_skill(client, sample_user):
    uid = sample_user["id"]
    skill = client.post(
        f"/users/{uid}/skills", json={"name": "SQL", "category": "programming"}
    ).json()

    response = client.delete(f"/users/{uid}/skills/{skill['id']}")
    assert response.status_code == 200

    response = client.get(f"/users/{uid}/skills")
    assert len(response.json()) == 0


def test_add_and_list_experiences(client, sample_user):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/experiences",
        json={
            "title": "My App",
            "description": "A web app",
            "technologies": "Python, FastAPI",
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "My App"

    response = client.get(f"/users/{uid}/experiences")
    assert len(response.json()) == 1


def test_add_and_list_education(client, sample_user):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/education",
        json={"school": "MIT", "degree": "BSc", "field": "Computer Science"},
    )
    assert response.status_code == 200
    assert response.json()["school"] == "MIT"

    response = client.get(f"/users/{uid}/education")
    assert len(response.json()) == 1


def test_add_and_list_languages(client, sample_user):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/languages", json={"language": "French", "level": "native"}
    )
    assert response.status_code == 200
    assert response.json()["language"] == "French"

    response = client.get(f"/users/{uid}/languages")
    assert len(response.json()) == 1


def test_profile_user_not_found(client):
    response = client.post(
        "/users/999/skills", json={"name": "Python", "category": "programming"}
    )
    assert response.status_code == 404
