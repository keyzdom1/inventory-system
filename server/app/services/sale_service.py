from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas


class StockError(HTTPException):
    def __init__(self, shortages: list[dict]):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Insufficient stock", "shortages": shortages},
        )


def record_sale(db: Session, payload: schemas.SaleCreate) -> models.Sale:
    """Record a sale atomically: validate stock (row-locked), save sale + items,
    deduct stock. Any failure rolls everything back — stock can never go negative."""
    if payload.customer_id is not None:
        customer = db.get(models.Customer, payload.customer_id)
        if customer is None:
            raise HTTPException(status_code=404, detail=f"Customer {payload.customer_id} not found")

    # Merge duplicate product lines so quantities are checked against one lock per product.
    wanted: dict[int, int] = {}
    for item in payload.items:
        wanted[item.product_id] = wanted.get(item.product_id, 0) + item.quantity

    products: dict[int, models.Product] = {}
    shortages: list[dict] = []
    for pid, qty in wanted.items():
        product = db.execute(
            select(models.Product).where(models.Product.id == pid).with_for_update()
        ).scalar_one_or_none()
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product {pid} not found")
        if product.quantity_in_stock < qty:
            shortages.append(
                {
                    "product_id": pid,
                    "product_name": product.name,
                    "requested": qty,
                    "available": product.quantity_in_stock,
                }
            )
        products[pid] = product
    if shortages:
        raise StockError(shortages)

    total_amount = Decimal("0")
    total_profit = Decimal("0")
    sale = models.Sale(customer_id=payload.customer_id, total_amount=0, total_profit=0)
    db.add(sale)
    db.flush()  # assigns sale.id before inserting items

    for pid, qty in wanted.items():
        product = products[pid]
        line_total = product.selling_price * qty
        line_profit = (product.selling_price - product.cost_price) * qty
        db.add(
            models.SaleItem(
                sale_id=sale.id,
                product_id=pid,
                quantity=qty,
                unit_price=product.selling_price,  # snapshot price at time of sale
                line_total=line_total,
                line_profit=line_profit,
            )
        )
        product.quantity_in_stock -= qty
        total_amount += line_total
        total_profit += line_profit

    sale.total_amount = total_amount
    sale.total_profit = total_profit
    db.commit()
    db.refresh(sale)
    return sale


def record_purchase(db: Session, payload: schemas.PurchaseCreate) -> models.Purchase:
    """Record a restock purchase atomically: validate refs, add stock."""
    supplier = db.get(models.Supplier, payload.supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier {payload.supplier_id} not found")

    product = db.execute(
        select(models.Product).where(models.Product.id == payload.product_id).with_for_update()
    ).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {payload.product_id} not found")

    unit_cost = payload.unit_cost if payload.unit_cost is not None else product.cost_price
    purchase = models.Purchase(
        supplier_id=payload.supplier_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        unit_cost=unit_cost,
    )
    db.add(purchase)
    product.quantity_in_stock += payload.quantity
    db.commit()
    db.refresh(purchase)
    return purchase
