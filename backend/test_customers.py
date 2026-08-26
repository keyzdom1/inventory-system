def test_create_customer(client, auth_headers):
    res = client.post("/api/customers", json={
        "name": "Jane Smith",
        "phone": "08012345678",
        "email": "jane@example.com",
        "address": "123 Lagos Street",
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Jane Smith"
    assert data["phone"] == "08012345678"


def test_list_customers_pagination(client, auth_headers, sample_customer):
    res = client.get("/api/customers", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


def test_update_customer(client, auth_headers, sample_customer):
    res = client.put(f"/api/customers/{sample_customer['id']}", json={
        "name": "John Updated",
        "phone": "08099999999",
        "email": "john.updated@example.com",
        "address": "456 Updated Ave",
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "John Updated"


def test_update_customer_partial(client, auth_headers, sample_customer):
    res = client.put(f"/api/customers/{sample_customer['id']}", json={
        "phone": "08077777777",
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["phone"] == "08077777777"
    assert res.json()["name"] == "John Doe"


def test_delete_customer(client, auth_headers, sample_customer):
    res = client.delete(f"/api/customers/{sample_customer['id']}", headers=auth_headers)
    assert res.status_code == 204


def test_delete_customer_not_found(client, auth_headers):
    res = client.delete("/api/customers/9999", headers=auth_headers)
    assert res.status_code == 404


def test_customer_history_empty(client, auth_headers, sample_customer):
    res = client.get(f"/api/customers/{sample_customer['id']}/history", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["sales_count"] == 0
    assert float(data["total_spent"]) == 0


def test_customer_history_not_found(client, auth_headers):
    res = client.get("/api/customers/9999/history", headers=auth_headers)
    assert res.status_code == 404
