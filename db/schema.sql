-- Small Business Inventory & Sales System — PostgreSQL schema
-- The FastAPI backend also auto-creates these tables on startup (SQLAlchemy),
-- but you can run this file manually with:  psql -U postgres -d inventory_system -f schema.sql

CREATE TABLE IF NOT EXISTS products (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(200)  NOT NULL,
    category           VARCHAR(100)  NOT NULL DEFAULT 'General',
    cost_price         NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
    selling_price      NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
    quantity_in_stock  INTEGER       NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    reorder_level      INTEGER       NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(50),
    email       VARCHAR(200),
    address     TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(200) NOT NULL,
    phone    VARCHAR(50),
    email    VARCHAR(200),
    address  TEXT
);

CREATE TABLE IF NOT EXISTS sales (
    id            SERIAL PRIMARY KEY,
    customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    sale_date     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_profit  NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sale_items (
    id           SERIAL PRIMARY KEY,
    sale_id      INTEGER       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id   INTEGER       NOT NULL REFERENCES products(id),
    quantity     INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(12,2) NOT NULL,
    line_total   NUMERIC(12,2) NOT NULL,
    line_profit  NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
    id             SERIAL PRIMARY KEY,
    supplier_id    INTEGER       NOT NULL REFERENCES suppliers(id),
    product_id     INTEGER       NOT NULL REFERENCES products(id),
    quantity       INTEGER       NOT NULL CHECK (quantity > 0),
    unit_cost      NUMERIC(12,2) NOT NULL,
    purchase_date  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products (quantity_in_stock);
