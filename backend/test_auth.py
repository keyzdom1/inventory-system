from app import models
from conftest import TestingSessionLocal


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


# ── New user management tests ──────────────────────────────────────────────


def test_admin_list_all_users(client, admin_headers):
    client.post("/api/auth/register", json={
        "username": "user_a",
        "email": "a@example.com",
        "password": "password123",
    })
    client.post("/api/auth/register", json={
        "username": "user_b",
        "email": "b@example.com",
        "password": "password123",
    })
    res = client.get("/api/admin/users", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 3  # admin + 2 new users


def test_admin_list_users_filter_by_role(client, admin_headers):
    res = client.get("/api/admin/users?role=admin", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert all(u["role"] == "admin" for u in users)


def test_admin_list_users_filter_by_status(client, admin_headers):
    client.post("/api/auth/register", json={
        "username": "pending_u",
        "email": "pending_u@example.com",
        "password": "password123",
    })
    res = client.get("/api/admin/users?status=pending", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert all(not u["is_approved"] for u in users)


def test_admin_user_stats(client, admin_headers):
    res = client.get("/api/admin/users/stats", headers=admin_headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total" in stats
    assert "pending" in stats
    assert "active" in stats
    assert "roles" in stats


def test_admin_get_single_user(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "getme",
        "email": "getme@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]
    res = client.get(f"/api/admin/users/{user_id}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "getme"


def test_admin_change_user_role(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "promote_me",
        "email": "promote@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]
    # Approve first
    client.post(f"/api/admin/users/{user_id}/approve", headers=admin_headers)
    # Change role
    res = client.put(f"/api/admin/users/{user_id}/role", json={"role": "manager"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "manager"


def test_admin_cannot_demote_another_admin(client, admin_headers):
    # Create second admin via DB
    from app.auth import create_access_token, hash_password
    from app.database import Base
    db = TestingSessionLocal()
    other_admin = models.User(
        username="other_admin",
        email="other_admin@example.com",
        hashed_password=hash_password("password123"),
        role="admin",
        is_approved=True,
    )
    db.add(other_admin)
    db.commit()
    db.refresh(other_admin)
    db.close()

    res = client.put(
        f"/api/admin/users/{other_admin.id}/role",
        json={"role": "user"},
        headers=admin_headers,
    )
    assert res.status_code == 400


def test_admin_toggle_user_status(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "toggle_me",
        "email": "toggle@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]
    client.post(f"/api/admin/users/{user_id}/approve", headers=admin_headers)

    # Deactivate
    res = client.put(f"/api/admin/users/{user_id}/status", json={"is_active": False}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Activate
    res = client.put(f"/api/admin/users/{user_id}/status", json={"is_active": True}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_admin_cannot_deactivate_self(client, admin_headers):
    # Get admin user ID
    me = client.get("/api/auth/me", headers=admin_headers)
    admin_id = me.json()["id"]
    res = client.put(f"/api/admin/users/{admin_id}/status", json={"is_active": False}, headers=admin_headers)
    assert res.status_code == 400


def test_admin_delete_user(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "delete_me",
        "email": "delete@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]
    res = client.delete(f"/api/admin/users/{user_id}", headers=admin_headers)
    assert res.status_code == 204


def test_admin_cannot_delete_other_admin(client, admin_headers):
    from app.auth import hash_password
    db = TestingSessionLocal()
    other_admin = models.User(
        username="nodelete_admin",
        email="nodelete@example.com",
        hashed_password=hash_password("password123"),
        role="admin",
        is_approved=True,
    )
    db.add(other_admin)
    db.commit()
    db.refresh(other_admin)
    db.close()

    res = client.delete(f"/api/admin/users/{other_admin.id}", headers=admin_headers)
    assert res.status_code == 400


def test_deactivated_user_cannot_login(client, admin_headers):
    reg = client.post("/api/auth/register", json={
        "username": "deactivated",
        "email": "deactivated@example.com",
        "password": "password123",
    })
    user_id = reg.json()["user"]["id"]
    client.post(f"/api/admin/users/{user_id}/approve", headers=admin_headers)
    client.put(f"/api/admin/users/{user_id}/status", json={"is_active": False}, headers=admin_headers)

    res = client.post("/api/auth/login", json={
        "username": "deactivated",
        "password": "password123",
    })
    assert res.status_code == 403
    assert "deactivated" in res.json()["detail"].lower()


def test_non_admin_cannot_list_all_users(client, auth_headers):
    res = client.get("/api/admin/users", headers=auth_headers)
    assert res.status_code == 403
