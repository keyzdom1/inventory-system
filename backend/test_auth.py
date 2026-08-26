def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "newuser"
    assert data["user"]["role"] == "user"


def test_register_duplicate_username(client):
    client.post("/api/auth/register", json={
        "username": "dup",
        "email": "a@example.com",
        "password": "password123",
    })
    res = client.post("/api/auth/register", json={
        "username": "dup",
        "email": "b@example.com",
        "password": "password123",
    })
    assert res.status_code == 409


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "username": "user1",
        "email": "same@example.com",
        "password": "password123",
    })
    res = client.post("/api/auth/register", json={
        "username": "user2",
        "email": "same@example.com",
        "password": "password123",
    })
    assert res.status_code == 409


def test_login_success(client):
    client.post("/api/auth/register", json={
        "username": "logintest",
        "email": "login@example.com",
        "password": "password123",
    })
    res = client.post("/api/auth/login", json={
        "username": "logintest",
        "password": "password123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "username": "wrongpass",
        "email": "wp@example.com",
        "password": "password123",
    })
    res = client.post("/api/auth/login", json={
        "username": "wrongpass",
        "password": "wrongpassword",
    })
    assert res.status_code == 401


def test_login_nonexistent_user(client):
    res = client.post("/api/auth/login", json={
        "username": "nobody",
        "password": "password123",
    })
    assert res.status_code == 401


def test_me_authenticated(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "testuser"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403)
