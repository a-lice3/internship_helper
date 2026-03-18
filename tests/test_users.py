def test_register(client):
    response = client.post(
        "/auth/register",
        json={"name": "Alice", "email": "alice@test.com", "password": "secret123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Alice"
    assert data["user"]["email"] == "alice@test.com"


def test_login(client):
    # Register first
    client.post(
        "/auth/register",
        json={"name": "Alice", "email": "alice@test.com", "password": "secret123"},
    )
    # Login
    response = client.post(
        "/auth/login",
        json={"email": "alice@test.com", "password": "secret123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"name": "Alice", "email": "alice@test.com", "password": "secret123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "alice@test.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_get_me(client, auth_header):
    response = client.get("/auth/me", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["name"] == "Alice"


def test_get_user(client, auth_header, sample_user):
    response = client.get(f"/users/{sample_user['id']}", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["name"] == "Alice"


def test_get_user_forbidden(client, auth_header):
    """Cannot access another user's data."""
    response = client.get("/users/99999", headers=auth_header)
    assert response.status_code == 403


def test_unauthenticated_request(client):
    """Requests without token should be rejected."""
    response = client.get("/users/1")
    assert response.status_code == 401
