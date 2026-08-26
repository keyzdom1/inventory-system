import os
import pytest

# Force SQLite before any app imports
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    res = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_product(client, auth_headers):
    res = client.post("/api/products", json={
        "name": "Test Laptop",
        "category": "Laptops",
        "cost_price": 150000,
        "selling_price": 200000,
        "quantity_in_stock": 10,
        "reorder_level": 3,
    }, headers=auth_headers)
    return res.json()


@pytest.fixture
def sample_customer(client, auth_headers):
    res = client.post("/api/customers", json={
        "name": "John Doe",
        "phone": "08031234567",
        "email": "john@example.com",
    }, headers=auth_headers)
    return res.json()


@pytest.fixture
def sample_supplier(client, auth_headers):
    res = client.post("/api/suppliers", json={
        "name": "Tech Supplies Ltd",
        "phone": "08098765432",
        "email": "supply@tech.com",
    }, headers=auth_headers)
    return res.json()
