from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users/pending", response_model=list[schemas.UserOut])
def list_pending_users(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(
        select(models.User).where(models.User.is_approved == False).order_by(models.User.created_at.desc())
    ).all()
    return users


@router.post("/users/{user_id}/approve", response_model=schemas.UserOut)
def approve_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_approved:
        raise HTTPException(status_code=400, detail="User is already approved")
    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reject", status_code=204)
def reject_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot reject an admin user")
    db.delete(user)
    db.commit()
