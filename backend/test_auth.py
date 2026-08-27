def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["message"] == "Account created. Pending admin approval."
    assert data["user"]["username"] == "newuser"
    assert data["user"]["role"] == "user"
    assert data["user"]["is_approved"] is False


def test_register_admin_email_auto_approves(client):
    res = client.post("/api/auth/register", json={
        "username": "adminuser",
        "email": "donworldwider2@gmail.com",
        "password": "password123",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["message"] == "Account created and approved"
    assert data["user"]["role"] == "admin"
    assert data["user"]["is_approved"] is True


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


def test_login_unapproved_user(client):
    client.post("/api/auth/register", json={
        "username": "unapproved",
        "email": "unapproved@example.com",
        "password": "password123",
    })
    res = client.post("/api/auth/login", json={
        "username": "unapproved",
        "password": "password123",
    })
    assert res.status_code == 403
    assert "pending" in res.json()["detail"].lower()


def test_login_success(client, auth_headers):
    res = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "password123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["user"]["is_approved"] is True


def test_login_wrong_password(client, auth_headers):
    res = client.post("/api/auth/login", json={
        "username": "testuser",
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
    assert res.json()["is_approved"] is True


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403)


def test_admin_list_pending_users(client, admin_headers):
    client.post("/api/auth/register", json={
        "username": "pending1",
        "email": "pending1@example.com",
        "password": "password123",
    })
    client.post("/api/auth/register", json={
        "username": "pending2",
        "email": "pending2@example.com",
        "password": "password123",
    })
    res = client.get("/api/admin/users/pending", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 2
    assert all(not u["is_approved"] for u in users)


def test_admin_approve_user(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "toapprove",
        "email": "toapprove@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]

    res = client.post(f"/api/admin/users/{user_id}/approve", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["is_approved"] is True

    login_res = client.post("/api/auth/login", json={
        "username": "toapprove",
        "password": "password123",
    })
    assert login_res.status_code == 200


def test_admin_reject_user(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "toreject",
        "email": "toreject@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]

    res = client.post(f"/api/admin/users/{user_id}/reject", headers=admin_headers)
    assert res.status_code == 204


def test_non_admin_cannot_access_admin_endpoints(client, auth_headers):
    res = client.get("/api/admin/users/pending", headers=auth_headers)
    assert res.status_code == 403
