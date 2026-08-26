from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.sale_service import record_purchase

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


@router.post("", response_model=schemas.PurchaseOut, status_code=201)
def create_purchase(payload: schemas.PurchaseCreate, db: Session = Depends(get_db)):
    purchase = record_purchase(db, payload)
    return schemas.PurchaseOut(
        id=purchase.id,
        supplier_id=purchase.supplier_id,
        supplier_name=purchase.supplier.name,
        product_id=purchase.product_id,
        product_name=purchase.product.name,
        quantity=purchase.quantity,
        unit_cost=purchase.unit_cost,
        purchase_date=purchase.purchase_date,
    )


@router.get("", response_model=list[schemas.PurchaseOut])
def list_purchases(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.scalars(
        select(models.Purchase).order_by(models.Purchase.purchase_date.desc()).limit(limit)
    ).all()
    return [
        schemas.PurchaseOut(
            id=p.id,
            supplier_id=p.supplier_id,
            supplier_name=p.supplier.name,
            product_id=p.product_id,
            product_name=p.product.name,
            quantity=p.quantity,
            unit_cost=p.unit_cost,
            purchase_date=p.purchase_date,
        )
        for p in rows
    ]
