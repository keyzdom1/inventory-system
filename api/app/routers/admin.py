from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Pending user approval (existing) ────────────────────────────────────────

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
    payload: schemas.ApproveUser | None = None,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_approved:
        raise HTTPException(status_code=400, detail="User is already approved")
    user.is_approved = True
    role = payload.role.value if payload else "cashier"
    user.role = role
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


# ── Full user management ────────────────────────────────────────────────────

@router.get("/users", response_model=list[schemas.UserOut])
def list_users(
    role: str | None = Query(default=None, description="Filter by role"),
    status_filter: str | None = Query(default=None, alias="status", description="Filter: active, inactive, pending"),
    q: str | None = Query(default=None, description="Search by username or email"),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = select(models.User).order_by(models.User.created_at.desc())
    if role:
        stmt = stmt.where(models.User.role == role)
    if status_filter == "active":
        stmt = stmt.where(models.User.is_approved == True, models.User.is_active == True)
    elif status_filter == "inactive":
        stmt = stmt.where(models.User.is_active == False)
    elif status_filter == "pending":
        stmt = stmt.where(models.User.is_approved == False)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(models.User.username.ilike(like) | models.User.email.ilike(like))
    return db.scalars(stmt).all()


@router.get("/users/stats")
def user_stats(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.User)) or 0
    pending = db.scalar(select(func.count()).select_from(models.User).where(models.User.is_approved == False)) or 0
    active = db.scalar(
        select(func.count()).select_from(models.User).where(models.User.is_approved == True, models.User.is_active == True)
    ) or 0
    role_rows = db.execute(
        select(models.User.role, func.count()).group_by(models.User.role)
    ).all()
    roles = {r: c for r, c in role_rows}
    return {
        "total": total,
        "pending": pending,
        "active": active,
        "roles": roles,
    }


@router.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: int,
    payload: schemas.UserUpdateRole,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change role of another admin")
    if user.id == admin.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change your own admin role")
    user.role = payload.role.value
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/status", response_model=schemas.UserOut)
def update_user_status(
    user_id: int,
    payload: schemas.UserUpdateStatus,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate an admin account")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin user")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
