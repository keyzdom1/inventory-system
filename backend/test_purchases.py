def test_create_purchase(client, auth_headers, sample_product, sample_supplier):
    res = client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 20,
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["quantity"] == 20
    assert data["supplier_name"] == "Tech Supplies Ltd"
    assert data["product_name"] == "Test Laptop"


def test_purchase_increases_stock(client, auth_headers, sample_product, sample_supplier):
    client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 15,
    }, headers=auth_headers)
    res = client.get(f"/api/products/{sample_product['id']}", headers=auth_headers)
    assert res.json()["quantity_in_stock"] == 25  # 10 + 15


def test_purchase_custom_cost(client, auth_headers, sample_product, sample_supplier):
    res = client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 10,
        "unit_cost": 160000,
    }, headers=auth_headers)
    assert res.status_code == 201
    assert float(res.json()["unit_cost"]) == 160000


def test_purchase_default_cost(client, auth_headers, sample_product, sample_supplier):
    res = client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 10,
    }, headers=auth_headers)
    assert res.status_code == 201
    assert float(res.json()["unit_cost"]) == 150000  # defaults to product cost_price


def test_purchase_nonexistent_supplier(client, auth_headers, sample_product):
    res = client.post("/api/purchases", json={
        "supplier_id": 9999,
        "product_id": sample_product["id"],
        "quantity": 10,
    }, headers=auth_headers)
    assert res.status_code == 404


def test_purchase_nonexistent_product(client, auth_headers, sample_supplier):
    res = client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": 9999,
        "quantity": 10,
    }, headers=auth_headers)
    assert res.status_code == 404


def test_list_purchases(client, auth_headers, sample_product, sample_supplier):
    client.post("/api/purchases", json={
        "supplier_id": sample_supplier["id"],
        "product_id": sample_product["id"],
        "quantity": 10,
    }, headers=auth_headers)
    res = client.get("/api/purchases", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1
