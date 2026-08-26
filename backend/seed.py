"""Seed the database with realistic demo data for a Nigerian electronics store.

Usage (from the backend/ folder):
    python seed.py            # seeds only if the database is empty
    python seed.py --reset    # wipes existing rows, then seeds fresh data

Rows are inserted in a single transaction using the same business rules the
sale service enforces: unit prices are snapshotted at sale time, profit is
computed per line item, and stock can never go negative.
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from app import models
from app.database import SessionLocal

random.seed(42)

UTC = timezone.utc

PRODUCTS = [
    # name, category, cost_price, selling_price, opening_stock, reorder_level
    ("HP Pavilion 15 Laptop", "Laptops", 385_000, 465_000, 14, 5),
    ("Dell Inspiron 15 Laptop", "Laptops", 350_000, 429_000, 11, 5),
    ("Lenovo IdeaPad Slim 3", "Laptops", 298_000, 365_000, 9, 4),
    ("Samsung 24-inch Monitor", "Monitors", 92_000, 118_000, 18, 8),
    ("LG 22-inch Monitor", "Monitors", 78_000, 99_000, 15, 8),
    ("Logitech K120 Keyboard", "Accessories", 6_500, 9_500, 40, 15),
    ("Logitech M185 Mouse", "Accessories", 5_200, 8_000, 45, 15),
    ("HP DeskJet 2720 Printer", "Printers", 68_000, 85_000, 7, 4),
    ("Anker PowerCore 20000", "Power", 21_000, 28_500, 22, 10),
    ("Oraimo FreePods 4", "Audio", 14_500, 19_900, 26, 12),
    ("Tecno Spark 20 Phone", "Phones", 132_000, 158_000, 12, 6),
    ("SanDisk Ultra 128GB Flash Drive", "Storage", 8_500, 12_500, 35, 12),
]

CUSTOMERS = [
    ("Adaeze Okafor", "0803 123 4567", "adaeze.okafor@example.com", "12 Allen Avenue, Ikeja, Lagos"),
    ("Chinedu Balogun", "0812 987 6543", "chinedu.balogun@example.com", "5 Ahmadu Bello Way, Victoria Island, Lagos"),
    ("Fatima Bello", "0706 456 1234", "fatima.bello@example.com", "23 Zoo Road, Kano"),
    ("Emeka Obi", "0909 222 3344", "emeka.obi@example.com", "8 Aba Road, Port Harcourt"),
    ("Blessing Adeyemi", "0815 777 8899", "blessing.adeyemi@example.com", "45 Ring Road, Ibadan"),
    ("Tunde Afolabi", "0703 555 1010", "tunde.afolabi@example.com", "17 Nasarawa Road, Abuja"),
]

SUPPLIERS = [
    ("Computer Village Traders Ltd", "0802 111 2222", "sales@cvttraders.ng", "Otigba Street, Ikeja, Lagos"),
    ("Simba Distribution Nigeria", "0811 333 4444", "orders@simbadist.ng", "Wharf Road, Apapa, Lagos"),
    ("Slot Systems Wholesale", "0708 999 0000", "wholesale@slot.ng", "Computer Village, Ikeja, Lagos"),
]

LOW_STOCK_TARGETS = {
    "Samsung 24-inch Monitor": (3, 8),
    "Anker PowerCore 20000": (5, 10),
    "HP DeskJet 2720 Printer": (1, 4),
    "Oraimo FreePods 4": (4, 12),
    "SanDisk Ultra 128GB Flash Drive": (6, 12),
}

BIG_TICKET_MIN_PRICE = 100_000


def month_bounds(now: datetime):
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, now


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data.")
    parser.add_argument("--reset", action="store_true", help="delete existing rows before seeding")
    args = parser.parse_args()

    from app.main import init_db

    init_db()

    db = SessionLocal()
    try:
        if args.reset:
            print("Resetting existing data...")
            db.execute(delete(models.SaleItem))
            db.execute(delete(models.Sale))
            db.execute(delete(models.Purchase))
            db.execute(delete(models.Product))
            db.execute(delete(models.Customer))
            db.execute(delete(models.Supplier))
            db.commit()
        elif db.scalar(select(models.Product.id).limit(1)) is not None:
            print("Database already contains data — nothing to do. Use --reset to wipe and reseed.")
            return

        now = datetime.now(UTC)
        month_start, _ = month_bounds(now)

        products = {}
        for name, category, cost, price, stock, reorder in PRODUCTS:
            products[name] = models.Product(
                name=name,
                category=category,
                cost_price=cost,
                selling_price=price,
                quantity_in_stock=stock,
                reorder_level=reorder,
            )
        customers = [models.Customer(name=n, phone=p, email=e, address=a) for n, p, e, a in CUSTOMERS]
        suppliers = [models.Supplier(name=n, phone=p, email=e, address=a) for n, p, e, a in SUPPLIERS]
        db.add_all(products.values())
        db.add_all(customers)
        db.add_all(suppliers)
        db.flush()
        print(f"Inserted {len(products)} products, {len(customers)} customers, {len(suppliers)} suppliers.")

        purchase_rows = []
        for name, p in products.items():
            restocks = random.randint(1, 2)
            for _ in range(restocks):
                supplier = random.choice(suppliers)
                qty = random.randint(15, 45)
                p.quantity_in_stock += qty
                when = max(month_start, now - timedelta(days=random.randint(5, 27), hours=random.randint(0, 8)))
                purchase_rows.append(
                    models.Purchase(
                        supplier_id=supplier.id,
                        product_id=p.id,
                        quantity=qty,
                        unit_cost=p.cost_price,
                        purchase_date=when,
                    )
                )
        db.add_all(purchase_rows)
        db.flush()
        print(f"Recorded {len(purchase_rows)} restock purchases.")

        sale_rows = []
        item_rows = []
        for i in range(42):
            chosen = random.sample(list(products.values()), k=random.randint(1, 3))
            lines = []
            for p in chosen:
                qty = random.randint(1, 2) if p.selling_price >= BIG_TICKET_MIN_PRICE else random.randint(1, 6)
                if p.quantity_in_stock < qty:
                    continue
                lines.append((p, qty))
            if not lines:
                continue

            walk_in = random.random() < 0.3
            customer = None if walk_in else random.choice(customers)

            total_amount = 0
            total_profit = 0
            sale = models.Sale(
                customer_id=customer.id if customer else None,
                total_amount=0,
                total_profit=0,
            )
            for p, qty in lines:
                line_total = p.selling_price * qty
                line_profit = (p.selling_price - p.cost_price) * qty
                item_rows.append(
                    models.SaleItem(
                        sale=sale,
                        product_id=p.id,
                        quantity=qty,
                        unit_price=p.selling_price,
                        line_total=line_total,
                        line_profit=line_profit,
                    )
                )
                p.quantity_in_stock -= qty
                total_amount += line_total
                total_profit += line_profit
            sale.total_amount = total_amount
            sale.total_profit = total_profit
            sale_rows.append(sale)

        today_count = 4
        span_minutes = max(1, int((now - month_start).total_seconds() // 60))
        for idx, sale in enumerate(sale_rows):
            if idx < today_count:
                midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
                earliest = max(midnight, now - timedelta(hours=6))
                latest_minute = max(1, int((now - earliest).total_seconds() // 60) - 1)
                sale.sale_date = earliest + timedelta(minutes=random.randint(0, latest_minute))
            else:
                sale.sale_date = month_start + timedelta(minutes=random.randint(0, span_minutes - 1))

        db.add_all(sale_rows)
        db.add_all(item_rows)
        db.flush()
        print(f"Recorded {len(sale_rows)} sales with {len(item_rows)} line items (4 dated today).")

        for name, (stock, extra) in LOW_STOCK_TARGETS.items():
            p = products[name]
            p.quantity_in_stock = stock
            p.reorder_level = max(p.reorder_level, stock + random.randint(1, extra - stock))

        db.commit()

        counts = {
            "products": len(products),
            "customers": len(customers),
            "suppliers": len(suppliers),
            "sales": len(sale_rows),
            "sale_items": len(item_rows),
            "purchases": len(purchase_rows),
        }
        low = sum(1 for p in products.values() if p.quantity_in_stock <= p.reorder_level)
        print("Seed complete:")
        for table, n in counts.items():
            print(f"  {table:<12} {n}")
        print(f"  low-stock    {low}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
