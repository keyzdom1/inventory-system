import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db

router = APIRouter(prefix="/api/products", tags=["products"])

_write_roles = ("admin", "manager", "inventory_clerk")


@router.get("/low-stock", response_model=list[schemas.ProductOut])
def low_stock(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    return db.scalars(
        select(models.Product)
        .where(models.Product.quantity_in_stock <= models.Product.reorder_level)
        .order_by(models.Product.name)
    ).all()


@router.get("")
def list_products(
    q: str | None = Query(default=None, description="Search by name/category"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    stmt = select(models.Product).order_by(models.Product.created_at.desc(), models.Product.id.desc())
    count_stmt = select(func.count()).select_from(models.Product)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(models.Product.name.ilike(like) | models.Product.category.ilike(like))
        count_stmt = count_stmt.where(models.Product.name.ilike(like) | models.Product.category.ilike(like))

    total = db.scalar(count_stmt) or 0
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    items = db.scalars(stmt.offset(offset).limit(limit)).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_role(*_write_roles)),
):
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_role(*_write_roles)),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_role(*_write_roles)),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this product has sales or purchase records",
        )
