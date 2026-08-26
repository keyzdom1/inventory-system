import datetime as dt

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    today = dt.date.today()
    month_start = today.replace(day=1)

    todays_sales = (
        db.scalar(
            select(func.coalesce(func.sum(models.Sale.total_amount), 0)).where(
                models.Sale.sale_date >= today,
                models.Sale.sale_date < today + dt.timedelta(days=1),
            )
        )
        or Decimal("0")
    )

    products_sold_today = int(
        db.scalar(
            select(func.coalesce(func.sum(models.SaleItem.quantity), 0))
            .join(models.Sale, models.Sale.id == models.SaleItem.sale_id)
            .where(models.Sale.sale_date >= today, models.Sale.sale_date < today + dt.timedelta(days=1))
        )
        or 0
    )

    low_stock_count = int(
        db.scalar(
            select(func.count())
            .select_from(models.Product)
            .where(models.Product.quantity_in_stock <= models.Product.reorder_level)
        )
        or 0
    )

    total_customers = int(db.scalar(select(func.count()).select_from(models.Customer)) or 0)

    _ = month_start  # reserved for future month-to-date stats
    return schemas.DashboardSummary(
        todays_sales=Decimal(todays_sales),
        products_sold_today=products_sold_today,
        low_stock_count=low_stock_count,
        total_customers=total_customers,
    )


@router.get("/monthly", response_model=list[schemas.MonthlyProductSales])
def monthly_sales(db: Session = Depends(get_db)):
    """Sales this month grouped by product (quantity + revenue), highest revenue first."""
    today = dt.date.today()
    month_start = today.replace(day=1)

    rows = db.execute(
        select(
            models.SaleItem.product_id,
            models.Product.name.label("product_name"),
            func.sum(models.SaleItem.quantity).label("quantity_sold"),
            func.sum(models.SaleItem.line_total).label("revenue"),
        )
        .join(models.Sale, models.Sale.id == models.SaleItem.sale_id)
        .join(models.Product, models.Product.id == models.SaleItem.product_id)
        .where(models.Sale.sale_date >= month_start)
        .group_by(models.SaleItem.product_id, models.Product.name)
        .order_by(func.sum(models.SaleItem.line_total).desc())
    ).all()

    return [
        schemas.MonthlyProductSales(
            product_id=r.product_id,
            product_name=r.product_name,
            quantity_sold=int(r.quantity_sold),
            revenue=Decimal(r.revenue or 0),
        )
        for r in rows
    ]
