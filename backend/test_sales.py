def test_create_sale(client, auth_headers, sample_product, sample_customer):
    res = client.post("/api/sales", json={
        "customer_id": sample_customer["id"],
        "items": [{"product_id": sample_product["id"], "quantity": 2}],
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert float(data["total_amount"]) == 400000  # 200000 * 2
    assert float(data["total_profit"]) == 100000  # (200000 - 150000) * 2
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 2


def test_create_sale_walkin(client, auth_headers, sample_product):
    res = client.post("/api/sales", json={
        "customer_id": None,
        "items": [{"product_id": sample_product["id"], "quantity": 1}],
    }, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["customer_id"] is None
    assert res.json()["customer_name"] is None


def test_sale_deducts_stock(client, auth_headers, sample_product):
    client.post("/api/sales", json={
        "items": [{"product_id": sample_product["id"], "quantity": 3}],
    }, headers=auth_headers)
    res = client.get(f"/api/products/{sample_product['id']}", headers=auth_headers)
    assert res.json()["quantity_in_stock"] == 7  # 10 - 3


def test_sale_insufficient_stock(client, auth_headers, sample_product):
    res = client.post("/api/sales", json={
        "items": [{"product_id": sample_product["id"], "quantity": 100}],
    }, headers=auth_headers)
    assert res.status_code == 400
    data = res.json()
    assert "shortages" in data["detail"]


def test_sale_nonexistent_product(client, auth_headers):
    res = client.post("/api/sales", json={
        "items": [{"product_id": 9999, "quantity": 1}],
    }, headers=auth_headers)
    assert res.status_code == 404


def test_sale_nonexistent_customer(client, auth_headers, sample_product):
    res = client.post("/api/sales", json={
        "customer_id": 9999,
        "items": [{"product_id": sample_product["id"], "quantity": 1}],
    }, headers=auth_headers)
    assert res.status_code == 404


def test_list_sales(client, auth_headers, sample_product):
    client.post("/api/sales", json={
        "items": [{"product_id": sample_product["id"], "quantity": 1}],
    }, headers=auth_headers)
    res = client.get("/api/sales", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_sale_duplicate_lines_merged(client, auth_headers, sample_product):
    res = client.post("/api/sales", json={
        "items": [
            {"product_id": sample_product["id"], "quantity": 2},
            {"product_id": sample_product["id"], "quantity": 3},
        ],
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 5
    assert float(data["total_amount"]) == 1000000  # 200000 * 5


def test_sale_empty_items(client, auth_headers):
    res = client.post("/api/sales", json={
        "items": [],
    }, headers=auth_headers)
    assert res.status_code == 422
