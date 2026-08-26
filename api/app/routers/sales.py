from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..services.sale_service import record_sale

router = APIRouter(prefix="/api/sales", tags=["sales"])


def sale_to_out(sale: models.Sale) -> schemas.SaleOut:
    return schemas.SaleOut(
        id=sale.id,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else None,
        sale_date=sale.sale_date,
        total_amount=sale.total_amount,
        total_profit=sale.total_profit,
        items=[
            schemas.SaleItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "?",
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                line_profit=item.line_profit,
            )
            for item in sale.items
        ],
    )


@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    sale = record_sale(db, payload)
    db.refresh(sale)
    return sale_to_out(sale)


@router.get("", response_model=list[schemas.SaleOut])
def list_sales(
    day: date | None = Query(default=None, description="Filter by sale date (YYYY-MM-DD)"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = (
        select(models.Sale)
        .options(joinedload(models.Sale.customer), joinedload(models.Sale.items))
        .order_by(models.Sale.sale_date.desc(), models.Sale.id.desc())
        .limit(limit)
    )
    if day:
        stmt = stmt.where(models.Sale.sale_date >= day).where(models.Sale.sale_date < date.fromordinal(day.toordinal() + 1))
    sales = db.scalars(stmt).unique().all()
    return [sale_to_out(s) for s in sales]
