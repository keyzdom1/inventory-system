def test_create_product(client, auth_headers):
    res = client.post("/api/products", json={
        "name": "HP Laptop",
        "category": "Laptops",
        "cost_price": 150000,
        "selling_price": 200000,
        "quantity_in_stock": 10,
        "reorder_level": 3,
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "HP Laptop"
    assert float(data["cost_price"]) == 150000
    assert float(data["selling_price"]) == 200000
    assert data["quantity_in_stock"] == 10
    assert data["reorder_level"] == 3


def test_list_products_pagination(client, auth_headers, sample_product):
    res = client.get("/api/products", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "pages" in data
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


def test_list_products_search(client, auth_headers, sample_product):
    res = client.get("/api/products?q=Laptop", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 1


def test_list_products_search_no_results(client, auth_headers, sample_product):
    res = client.get("/api/products?q=Nonexistent", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["items"]) == 0


def test_get_product(client, auth_headers, sample_product):
    res = client.get(f"/api/products/{sample_product['id']}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Test Laptop"


def test_get_product_not_found(client, auth_headers):
    res = client.get("/api/products/9999", headers=auth_headers)
    assert res.status_code == 404


def test_update_product_partial(client, auth_headers, sample_product):
    res = client.put(f"/api/products/{sample_product['id']}", json={
        "selling_price": 250000,
    }, headers=auth_headers)
    assert res.status_code == 200
    assert float(res.json()["selling_price"]) == 250000
    assert res.json()["name"] == "Test Laptop"


def test_update_product_full(client, auth_headers, sample_product):
    res = client.put(f"/api/products/{sample_product['id']}", json={
        "name": "Updated Laptop",
        "category": "Laptops",
        "cost_price": 180000,
        "selling_price": 250000,
        "quantity_in_stock": 15,
        "reorder_level": 5,
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Laptop"


def test_delete_product(client, auth_headers, sample_product):
    res = client.delete(f"/api/products/{sample_product['id']}", headers=auth_headers)
    assert res.status_code == 204
    res = client.get(f"/api/products/{sample_product['id']}", headers=auth_headers)
    assert res.status_code == 404


def test_delete_product_not_found(client, auth_headers):
    res = client.delete("/api/products/9999", headers=auth_headers)
    assert res.status_code == 404


def test_low_stock(client, auth_headers):
    client.post("/api/products", json={
        "name": "Low Stock Item",
        "category": "Test",
        "cost_price": 1000,
        "selling_price": 2000,
        "quantity_in_stock": 2,
        "reorder_level": 5,
    }, headers=auth_headers)
    res = client.get("/api/products/low-stock", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert any(p["name"] == "Low Stock Item" for p in items)
