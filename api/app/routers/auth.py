from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

ADMIN_EMAIL = "donworldwider2@gmail.com"


@router.post("/register", response_model=schemas.RegisterResponse, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(models.User).where(
            (models.User.username == payload.username) | (models.User.email == payload.email)
        )
    )
    if existing:
        field = "Username" if existing.username == payload.username else "Email"
        raise HTTPException(status_code=409, detail=f"{field} already taken")

    is_admin_email = payload.email.lower() == ADMIN_EMAIL.lower()

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="admin" if is_admin_email else (payload.requested_role.value if payload.requested_role else "user"),
        is_approved=is_admin_email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if is_admin_email:
        return schemas.RegisterResponse(
            message="Account created and approved",
            user=schemas.UserOut.model_validate(user),
        )

    return schemas.RegisterResponse(
        message="Account created. Pending admin approval.",
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(
        select(models.User).where(models.User.username == payload.username)
    )
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending admin approval. Please wait for an administrator to approve your account.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact an administrator.",
        )

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
