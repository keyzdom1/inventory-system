"""Smoke-test every endpoint group on a running backend (:8000)."""

import httpx

BASE = "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=15)

# --- health ---
assert c.get("/api/health").json() == {"status": "ok"}
print("health: ok")

# --- products ---
products = c.get("/api/products").json()
assert isinstance(products, list) and len(products) >= 12
p = next(x for x in products if x["name"] == "HP Pavilion 15 Laptop")
print(f"products: {len(products)}; target id={p['id']} stock={p['quantity_in_stock']}")

low = c.get("/api/products/low-stock").json()
assert all(x["quantity_in_stock"] <= x["reorder_level"] for x in low)
print(f"low-stock: {len(low)} items, all <= reorder level")

# --- sale: success path deducts stock atomically ---
before = p["quantity_in_stock"]
sale = c.post(
    "/api/sales",
    json={
        "customer_id": None,
        "items": [{"product_id": p["id"], "quantity": 2}],
    },
)
assert sale.status_code == 201, sale.text
body = sale.json()
expected_total = 2 * float(p["selling_price"])
expected_profit = 2 * (float(p["selling_price"]) - float(p["cost_price"]))
assert abs(float(body["total_amount"]) - expected_total) < 0.01
assert abs(float(body["total_profit"]) - expected_profit) < 0.01
after = c.get(f"/api/products/{p['id']}").json()
assert after["quantity_in_stock"] == before - 2, "stock not deducted!"
print(f"sale ok: total={body['total_amount']} profit={body['total_profit']} stock {before}->{after['quantity_in_stock']}")

# --- sale: oversell rejected with shortages detail, stock untouched ---
over = before - 2 + 10
bad = c.post("/api/sales", json={"customer_id": None, "items": [{"product_id": p["id"], "quantity": over}]})
assert bad.status_code == 400, f"expected 400, got {bad.status_code}"
detail = bad.json()["detail"]
short = detail["shortages"][0]
assert short["product_id"] == p["id"] and short["available"] == before - 2
still = c.get(f"/api/products/{p['id']}").json()
assert still["quantity_in_stock"] == before - 2, "stock changed on rejected sale!"
print(f"oversell rejected: HTTP 400, shortage reported ({short['requested']} > {short['available']}), stock unchanged")

# --- sale: duplicate lines merge into one deduction ---
dup_qty = min(2, still["quantity_in_stock"] // 3)
merged = c.post(
    "/api/sales",
    json={"customer_id": None, "items": [
        {"product_id": p["id"], "quantity": dup_qty},
        {"product_id": p["id"], "quantity": dup_qty},
    ]},
)
assert merged.status_code == 201, merged.text
m = c.get(f"/api/products/{p['id']}").json()
assert m["quantity_in_stock"] == still["quantity_in_stock"] - 2 * dup_qty
print(f"duplicate lines merged: sold 2x{dup_qty}, stock now {m['quantity_in_stock']}")

# --- customers + history ---
custs = c.get("/api/customers").json()
hist = c.get(f"/api/customers/{custs[0]['id']}/history").json()
assert hist["sales_count"] == len(hist["sales"])
print(f"customers: {len(custs)}; history for '{custs[0]['name']}': {hist['sales_count']} sales, spent={hist['total_spent']}")

# --- suppliers + purchase restock increments stock ---
sups = c.get("/api/suppliers").json()
pre = m["quantity_in_stock"]
pur = c.post(
    "/api/purchases",
    json={"supplier_id": sups[0]["id"], "product_id": p["id"], "quantity": 5, "unit_cost": None},
)
assert pur.status_code == 201, pur.text
post_p = c.get(f"/api/products/{p['id']}").json()
assert post_p["quantity_in_stock"] == pre + 5
print(f"purchase restock: +5 units, stock {pre}->{post_p['quantity_in_stock']}; unit_cost defaulted to cost_price={pur.json()['unit_cost']}")

# --- dashboard ---
s = c.get("/api/dashboard/summary").json()
assert set(s) == {"todays_sales", "products_sold_today", "low_stock_count", "total_customers"}
monthly = c.get("/api/dashboard/monthly").json()
assert monthly and monthly[0]["revenue"] >= monthly[-1]["revenue"], "monthly not sorted by revenue"
print(f"dashboard: today={s['todays_sales']} sold_today={s['products_sold_today']} low={s['low_stock_count']} cust={s['total_customers']}")
print(f"monthly top row: {monthly[0]['product_name']} qty={monthly[0]['quantity_sold']} rev={monthly[0]['revenue']}")

# --- validation errors ---
r404 = c.post("/api/sales", json={"customer_id": 99999, "items": [{"product_id": p["id"], "quantity": 1}]})
assert r404.status_code == 404
r422 = c.post("/api/sales", json={"customer_id": None, "items": [{"product_id": p["id"], "quantity": 0}]})
assert r422.status_code == 422
print("validation: unknown customer -> 404, quantity=0 -> 422")

print("\nALL SMOKE TESTS PASSED")
