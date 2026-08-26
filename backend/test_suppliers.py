def test_create_supplier(client, auth_headers):
    res = client.post("/api/suppliers", json={
        "name": "New Supplier",
        "phone": "08011111111",
        "email": "new@supplier.com",
        "address": "Supplier Lane",
    }, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["name"] == "New Supplier"


def test_list_suppliers_pagination(client, auth_headers, sample_supplier):
    res = client.get("/api/suppliers", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


def test_update_supplier(client, auth_headers, sample_supplier):
    res = client.put(f"/api/suppliers/{sample_supplier['id']}", json={
        "name": "Updated Supplier",
        "phone": "08022222222",
        "email": "updated@supplier.com",
        "address": "New Address",
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Supplier"


def test_update_supplier_partial(client, auth_headers, sample_supplier):
    res = client.put(f"/api/suppliers/{sample_supplier['id']}", json={
        "email": "partial@update.com",
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "partial@update.com"
    assert res.json()["name"] == "Tech Supplies Ltd"


def test_delete_supplier(client, auth_headers, sample_supplier):
    res = client.delete(f"/api/suppliers/{sample_supplier['id']}", headers=auth_headers)
    assert res.status_code == 204


def test_delete_supplier_not_found(client, auth_headers):
    res = client.delete("/api/suppliers/9999", headers=auth_headers)
    assert res.status_code == 404


def test_delete_supplier_with_purchases_fails(client, auth_headers, sample_supplier, sample_product):
    client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 5,
    }, headers=auth_headers)
    res = client.delete(f"/api/suppliers/{sample_supplier['id']}", headers=auth_headers)
    assert res.status_code == 409
