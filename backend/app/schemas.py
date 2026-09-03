from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RoleEnum(str, Enum):
    admin = "admin"
    manager = "manager"
    cashier = "cashier"
    salesperson = "salesperson"
    inventory_clerk = "inventory_clerk"
    accountant = "accountant"
    user = "user"


# ---------- Products ----------
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(default="General", max_length=100)
    cost_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)
    quantity_in_stock: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=5, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    cost_price: Optional[Decimal] = Field(default=None, ge=0)
    selling_price: Optional[Decimal] = Field(default=None, ge=0)
    quantity_in_stock: Optional[int] = Field(default=None, ge=0)
    reorder_level: Optional[int] = Field(default=None, ge=0)


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Customers ----------
class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    address: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=200)
    address: Optional[str] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class CustomerHistoryItem(BaseModel):
    sale_id: int
    sale_date: datetime
    total_amount: Decimal
    items_count: int


class CustomerHistoryOut(BaseModel):
    customer_id: int
    customer_name: str
    total_spent: Decimal
    sales_count: int
    sales: list[CustomerHistoryItem]


# ---------- Suppliers ----------
class SupplierBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=200)
    address: Optional[str] = None


class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- Sales ----------
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    customer_id: int | None = None
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    line_profit: Decimal


class SaleOut(BaseModel):
    id: int
    customer_id: int | None
    customer_name: str | None
    sale_date: datetime
    total_amount: Decimal
    total_profit: Decimal
    items: list[SaleItemOut]


# ---------- Purchases ----------
class PurchaseCreate(BaseModel):
    supplier_id: int
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)


class PurchaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_id: int
    supplier_name: str
    product_id: int
    product_name: str
    quantity: int
    unit_cost: Decimal
    purchase_date: datetime


# ---------- Pagination ----------
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(max_length=200)
    password: str = Field(min_length=6)
    requested_role: Optional[RoleEnum] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    is_approved: bool
    is_active: bool


class UserUpdateRole(BaseModel):
    role: RoleEnum


class UserUpdateStatus(BaseModel):
    is_active: bool


class ApproveUser(BaseModel):
    role: RoleEnum = RoleEnum.cashier


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RegisterResponse(BaseModel):
    message: str
    user: UserOut


# ---------- Dashboard ----------
class DashboardSummary(BaseModel):
    todays_sales: Decimal
    products_sold_today: int
    low_stock_count: int
    total_customers: int


class MonthlyProductSales(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal
