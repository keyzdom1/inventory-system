# AI Build Prompt — Small Business Inventory & Sales System

Copy everything below into your AI coding assistant (Claude Code, Cursor, etc.) to start building.

---

## Project brief

Build a **Small Business Inventory & Sales System** for a Nigerian electronics store. The owner needs a web app to manage products, inventory, sales, customers, and suppliers, with a dashboard summarizing daily/monthly performance.

## Tech stack

- **Frontend:** HTML, Tailwind CSS (via CDN or build step), vanilla JavaScript (keep it simple — no framework needed unless you want to add one later)
- **Animation:** Motion (motion.dev) for number counters, staggered card entrances, and micro-interactions; Tailwind's `transition-*`/`animate-*` utilities for hover states and skeleton loaders
- **Backend:** Python with Flask (or FastAPI)
- **Database:** MySQL
- **Charts:** Chart.js for the dashboard visuals, with animation enabled
- Currency: Nigerian Naira (₦), formatted with thousands separators

## Database schema (build this first)

Design and create these tables with appropriate relationships and foreign keys:

- `products` — id, name, category, cost_price, selling_price, quantity_in_stock, reorder_level, created_at
- `customers` — id, name, phone, email, address, created_at
- `suppliers` — id, name, phone, email, address
- `sales` — id, customer_id (nullable for walk-in), sale_date, total_amount, total_profit
- `sale_items` — id, sale_id, product_id, quantity, unit_price, line_total, line_profit
- `purchases` — id, supplier_id, product_id, quantity, unit_cost, purchase_date (for restocking)

## Core features to build, in this order

1. **Product management** — add, edit, delete, list products with cost price, selling price, stock quantity, and reorder level
2. **Record a sale** — select one or more products + quantities, auto-check stock availability, block the sale (with a clear message) if requested quantity exceeds available stock, deduct stock on success, save the sale + sale_items, link to a customer (or mark as walk-in)
3. **Customer management** — add/view customers, and each customer's purchase history
4. **Supplier & restocking** — add suppliers, record purchases from them, and increase product stock accordingly
5. **Low-stock alerts** — a view/endpoint that lists all products where quantity_in_stock <= reorder_level
6. **Profit calculation** — per sale item: (selling_price - cost_price) × quantity; aggregate for daily/monthly totals
7. **Dashboard** — show today's total sales (₦), products sold today, count of low-stock items, total customers, and a table of "sales this month" grouped by product (quantity + revenue), similar to this layout:

```
-----------------------------------------
        BUSINESS DASHBOARD
-----------------------------------------
Today's Sales       ₦1,250,000
Products Sold              37
Low Stock                    8
Customers                   24
-----------------------------------------
Sales This Month
-----------------------------------------
Product       Qty       Revenue
Laptop         8        ₦6,400,000
Monitor       12        ₦2,400,000
Keyboard      17          ₦850,000
```

## Animation & polish spec

Keep all animations under ~400ms and purposeful. Implement these specifically:

- Dashboard stat cards (today's sales, products sold, low stock, customers) animate their numbers counting up from 0 on load using Motion, and fade/slide in with a staggered delay (50–100ms between cards).
- Recording a successful sale shows a toast notification sliding in and auto-dismissing after ~3 seconds.
- A rejected sale (insufficient stock) triggers a brief shake animation on the quantity input plus an inline red error message.
- Product table rows briefly flash/highlight when their stock is updated after a sale or restock.
- Buttons and product cards use Tailwind `hover:scale-[1.02]` and a shadow transition for hover feedback.
- Data lists show a Tailwind `animate-pulse` skeleton state while loading instead of a blank screen.
- Chart.js's default animation stays enabled so the monthly revenue chart bars grow in on load rather than appearing instantly.

## Business logic rules

- A sale cannot be recorded if any line item's quantity exceeds current stock — reject with a clear error, don't allow negative stock.
- Stock is deducted only after a sale is successfully saved (wrap in a transaction so a failure doesn't leave partial updates).
- Profit is always calculated per line item at the time of sale (don't recalculate later from current prices, since prices may change).
- Low-stock threshold (`reorder_level`) is configurable per product, not a global constant.

## What to build first (suggested order)

1. Set up the MySQL database and schema
2. Build the Flask/FastAPI backend with REST endpoints for products, customers, suppliers
3. Build the "record sale" endpoint with the stock-check + transaction logic above
4. Build the dashboard summary endpoint (today's sales, low stock, monthly breakdown)
5. Build the frontend with Tailwind CSS: a simple multi-page or single-page dashboard consuming these endpoints
6. Add Chart.js visuals for the monthly sales table/trend
7. Layer in Motion for the animation spec above (counters, stagger, toasts, shake, skeletons)
8. Polish: input validation, error messages, final styling pass

## Deliverable

A working local app (backend + frontend + database setup scripts/migrations) with a README explaining how to install dependencies, set up the database, and run it locally.

Please start by proposing the database schema and folder structure, then build incrementally, feature by feature, so I can test each part as it's completed.
