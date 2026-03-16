def test_create_user(client):
    response = client.post("/users", json={"name": "Alice", "email": "alice@test.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Alice"
    assert data["email"] == "alice@test.com"
    assert "id" in data


def test_get_user(client, sample_user):
    response = client.get(f"/users/{sample_user['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Alice"


def test_get_user_not_found(client):
    response = client.get("/users/99999")
    assert response.status_code == 404
