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


# ---------- JWT-specific tests ----------


def test_expired_token(client):
    """An expired JWT should be rejected with 401."""
    from datetime import datetime, timedelta, timezone

    from jose import jwt

    from src.config import JWT_ALGORITHM, JWT_SECRET_KEY

    expired_payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
    }
    expired_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    response = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401


def test_invalid_token(client):
    """A garbage token should be rejected with 401."""
    response = client.get(
        "/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"}
    )
    assert response.status_code == 401


def test_token_wrong_secret(client):
    """A token signed with a different secret should be rejected."""
    from jose import jwt

    from src.config import JWT_ALGORITHM

    payload = {"sub": "1"}
    bad_token = jwt.encode(payload, "wrong-secret-key", algorithm=JWT_ALGORITHM)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert response.status_code == 401


def test_token_missing_sub(client):
    """A token without a 'sub' claim should be rejected."""
    from jose import jwt

    from src.config import JWT_ALGORITHM, JWT_SECRET_KEY

    token = jwt.encode({"data": "no-sub"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_nonexistent_user(client):
    """A valid token referencing a deleted/nonexistent user should be rejected."""
    from jose import jwt

    from src.config import JWT_ALGORITHM, JWT_SECRET_KEY

    token = jwt.encode({"sub": "999999"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_register_duplicate_email(client):
    """Registering with an already-used email should fail with 400."""
    payload = {"name": "Alice", "email": "dup@test.com", "password": "secret123"}
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_nonexistent_email(client):
    """Login with an email that was never registered should fail."""
    response = client.post(
        "/auth/login",
        json={"email": "nobody@test.com", "password": "secret123"},
    )
    assert response.status_code == 401
