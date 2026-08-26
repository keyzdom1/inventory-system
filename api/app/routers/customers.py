import math
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("")
def list_customers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.Customer)) or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    items = db.scalars(
        select(models.Customer).order_by(models.Customer.name).offset(offset).limit(limit)
    ).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.post("", response_model=schemas.CustomerOut, status_code=201)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(customer_id: int, payload: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    try:
        db.delete(customer)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this customer has sales recorded",
        )


@router.get("/{customer_id}/history", response_model=schemas.CustomerHistoryOut)
def customer_history(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    rows = db.execute(
        select(
            models.Sale.id,
            models.Sale.sale_date,
            models.Sale.total_amount,
            func.coalesce(func.sum(models.SaleItem.quantity), 0).label("items_count"),
        )
        .outerjoin(models.SaleItem, models.SaleItem.sale_id == models.Sale.id)
        .where(models.Sale.customer_id == customer_id)
        .group_by(models.Sale.id)
        .order_by(models.Sale.sale_date.desc())
    ).all()

    history_items = [
        schemas.CustomerHistoryItem(
            sale_id=r.id,
            sale_date=r.sale_date,
            total_amount=r.total_amount,
            items_count=int(r.items_count),
        )
        for r in rows
    ]
    return schemas.CustomerHistoryOut(
        customer_id=customer.id,
        customer_name=customer.name,
        total_spent=sum((h.total_amount for h in history_items), start=Decimal("0")),
        sales_count=len(history_items),
        sales=history_items,
    )
