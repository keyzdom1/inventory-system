import math
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db
from ..services.sale_service import record_sale

router = APIRouter(prefix="/api/sales", tags=["sales"])

_write_roles = ("admin", "manager", "cashier", "salesperson")


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
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_role(*_write_roles)),
):
    sale = record_sale(db, payload)
    db.refresh(sale)
    return sale_to_out(sale)


@router.get("")
def list_sales(
    day: date | None = Query(default=None, description="Filter by sale date (YYYY-MM-DD)"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    stmt = (
        select(models.Sale)
        .options(joinedload(models.Sale.customer), joinedload(models.Sale.items))
        .order_by(models.Sale.sale_date.desc(), models.Sale.id.desc())
    )
    count_stmt = select(func.count()).select_from(models.Sale)

    if day:
        stmt = stmt.where(
            models.Sale.sale_date >= day,
            models.Sale.sale_date < date.fromordinal(day.toordinal() + 1),
        )
        count_stmt = count_stmt.where(
            models.Sale.sale_date >= day,
            models.Sale.sale_date < date.fromordinal(day.toordinal() + 1),
        )

    total = db.scalar(count_stmt) or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    sales = db.scalars(stmt.offset(offset).limit(limit)).unique().all()

    return {
        "items": [sale_to_out(s) for s in sales],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }
