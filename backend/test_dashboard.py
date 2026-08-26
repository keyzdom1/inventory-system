def test_dashboard_summary(client, auth_headers):
    res = client.get("/api/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "todays_sales" in data
    assert "products_sold_today" in data
    assert "low_stock_count" in data
    assert "total_customers" in data


def test_dashboard_summary_with_sale(client, auth_headers, sample_product, sample_customer):
    client.post("/api/sales", json={
        "customer_id": sample_customer["id"],
        "items": [{"product_id": sample_product["id"], "quantity": 2}],
    }, headers=auth_headers)
    res = client.get("/api/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert float(data["todays_sales"]) == 400000
    assert data["products_sold_today"] == 2
    assert data["total_customers"] == 1


def test_dashboard_summary_low_stock_count(client, auth_headers):
    client.post("/api/products", json={
        "name": "Low Product",
        "category": "Test",
        "cost_price": 1000,
        "selling_price": 2000,
        "quantity_in_stock": 1,
        "reorder_level": 5,
    }, headers=auth_headers)
    res = client.get("/api/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["low_stock_count"] >= 1


def test_dashboard_monthly(client, auth_headers, sample_product):
    client.post("/api/sales", json={
        "items": [{"product_id": sample_product["id"], "quantity": 3}],
    }, headers=auth_headers)
    res = client.get("/api/dashboard/monthly", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["product_name"] == "Test Laptop"
    assert data[0]["quantity_sold"] == 3
    assert float(data[0]["revenue"]) == 600000  # 200000 * 3


def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
