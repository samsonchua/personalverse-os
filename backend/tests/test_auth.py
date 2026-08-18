def test_register_creates_account_and_returns_token(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@personalverse.ai", "password": "supersecret", "full_name": "New User"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["user"]["email"] == "newuser@personalverse.ai"


def test_register_duplicate_email_rejected(client, registered_user):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": registered_user["user"]["email"], "password": "whatever123", "full_name": "Dup"},
    )
    assert res.status_code == 400


def test_login_with_correct_password_succeeds(client, registered_user):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["user"]["email"], "password": "testpass123"},
    )
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_with_wrong_password_rejected(client, registered_user):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["user"]["email"], "password": "wrong-password"},
    )
    assert res.status_code == 400


def test_login_unknown_email_rejected(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@personalverse.ai", "password": "whatever123"},
    )
    assert res.status_code == 400


def test_me_requires_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user_with_valid_token(client, registered_user, auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == registered_user["user"]["email"]


def test_me_rejects_garbage_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401
