# Small Business Inventory & Sales System

A web app for a Nigerian electronics store to manage products, inventory, sales, customers, and suppliers — with low-stock alerts, per-line profit tracking, and a dashboard summarizing daily/monthly performance. Amounts are in Nigerian Naira (₦).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS + Motion (animations) + Chart.js |
| Backend | Python FastAPI + SQLAlchemy 2 |
| Database | PostgreSQL (works with any Postgres, incl. hosted Neon) |

## Project structure

```
backend/          FastAPI app
  app/routers/    REST endpoints (products, customers, suppliers, sales, purchases, dashboard)
  app/services/   Sale & purchase business logic (stock checks, transactions)
  seed.py         Demo data seeder (idempotent; --reset wipes first)
  smoke_test.py   End-to-end API assertions against a running server
frontend/         Next.js UI
db/schema.sql     Raw SQL schema reference (tables are also auto-created by the app)
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- A PostgreSQL database (local or hosted)

## Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt     # Linux/macOS: .venv/bin/pip ...
```

Create `backend/.env` (copy from `.env.example`) and point it at your database:

```
DATABASE_URL=postgresql://user:password@host:5432/inventory_system
```

For Neon or other hosted providers keep any query params your provider requires,
e.g. `?sslmode=require`.

The app creates its tables automatically on startup (and creates the database
itself on local Postgres if it doesn't exist).

### Seed demo data (optional)

```powershell
.venv\Scripts\python seed.py           # add --reset to wipe existing data first
```

Seeds a Nigerian electronics catalog (12 products), customers, suppliers,
restock purchases, ~42 sales across the current month, and 5 deliberately
low-stock products so the alerts view has something to show.

### Run the API

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the dev server proxies `/api/*` to the backend
(override the target with the `BACKEND_URL` env var in `next.config.ts`).

## Smoke test

With the backend running:

```powershell
cd backend
.venv\Scripts\python smoke_test.py
```

Verifies health, product listing, low-stock invariant, sale recording with
exact profit/stock math, oversell rejection (stock untouched), duplicate-line
merging, customer history, purchase restocking, dashboard summary/monthly
breakdown, and error cases.

## Features

- **Products** — full CRUD, search, per-product reorder levels, restock modal
- **Sales** — multi-line sale builder with live totals, walk-in or linked customer,
  atomic stock deduction, insufficient-stock rejection with per-line shortages
  (shake animation + inline errors), price/profit snapshots at time of sale
- **Customers** — CRUD plus expandable purchase history (totals + per-sale rows)
- **Suppliers** — CRUD, record purchases that increase stock automatically
- **Low stock alerts** — dedicated view of products at/below reorder level with
  one-click restock; dashboard card links to it and pulses when count > 0
- **Dashboard** — today's sales (₦ counter), products sold today, low-stock count,
  total customers, revenue chart + per-product monthly table

## API overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products` (`?q=`) | List/search products |
| POST | `/api/products` | Create product |
| GET/PUT/DELETE | `/api/products/{id}` | Read / update / delete (409 if referenced) |
| GET | `/api/products/low-stock` | Products where `quantity_in_stock <= reorder_level` |
| GET/POST | `/api/customers` | List / create customers |
| PUT/DELETE | `/api/customers/{id}` | Update / delete (409 if they have sales) |
| GET | `/api/customers/{id}/history` | Purchase history + totals |
| GET/POST | `/api/suppliers` | List / create suppliers |
| PUT/DELETE | `/api/suppliers/{id}` | Update / delete (409 if they have purchases) |
| GET/POST | `/api/sales` (`?day=`, `?limit=`) | List / record a sale (transactional) |
| GET/POST | `/api/purchases` | List / record purchases (increases stock) |
| GET | `/api/dashboard/summary` | Today's sales, products sold, low stock, customers |
| GET | `/api/dashboard/monthly` | This month's sales grouped by product |

Full request/response schemas: http://localhost:8000/docs
