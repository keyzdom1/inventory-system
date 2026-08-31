from contextlib import asynccontextmanager

import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError, ProgrammingError

from . import models  # noqa: F401 — imported so Base.metadata sees every table
from .database import Base, DATABASE_URL, engine
from .routers import auth, customers, dashboard, products, purchases, sales, suppliers, admin


def ensure_database_exists() -> None:
    """Create the target database on first run so the app is zero-touch.

    Connects to the server's maintenance database ('postgres') and issues
    CREATE DATABASE when the configured database is missing. Non-PostgreSQL
    URLs (e.g. SQLite in tests) are left untouched.
    """
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        engine.connect().close()  # probe; closes immediately
        return
    except (OperationalError, ProgrammingError):
        pass

    url = make_url(DATABASE_URL)
    dbname = url.database
    if not dbname:
        return
    try:
        conn = psycopg2.connect(
            host=url.host,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            dbname="postgres",
        )
    except psycopg2.OperationalError as exc:
        raise RuntimeError(
            "Could not connect to PostgreSQL to create the database. "
            f"Check the user/password/host in backend/.env (DATABASE_URL). Original error: {exc}"
        ) from exc
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE "{dbname}"')
        print(f"Created database '{dbname}'")
    except psycopg2.errors.DuplicateDatabase:
        pass
    finally:
        conn.close()


def init_db() -> None:
    ensure_database_exists()
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Small Business Inventory & Sales System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    admin.router,
    products.router,
    customers.router,
    suppliers.router,
    sales.router,
    purchases.router,
    dashboard.router,
):
    app.include_router(router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    """The UI is a standalone Next.js app (frontend/) run via `npm run dev`."""
    return {"name": "Small Business Inventory & Sales System API", "docs": "/docs"}
