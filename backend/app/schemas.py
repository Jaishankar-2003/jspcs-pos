from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from uuid import UUID

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "CASHIER"

class UserResponse(BaseModel):
    id: UUID
    username: str
    role: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str

class ProductCreate(BaseModel):
    sku: str
    name: str
    price: Decimal
    low_stock_threshold: int = 10
    initial_stock: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = None
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: UUID
    sku: str
    name: str
    price: Decimal
    low_stock_threshold: int
    is_active: bool
    stock_quantity: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)

class StockUpdate(BaseModel):
    quantity: int

class CartItem(BaseModel):
    product_id: UUID
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CartItem]

class CheckoutResponse(BaseModel):
    sale_id: UUID
    total_amount: Decimal
    invoice_path: str

class SaleItemResponse(BaseModel):
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    model_config = ConfigDict(from_attributes=True)

class SaleResponse(BaseModel):
    id: UUID
    cashier_id: Optional[UUID]
    total_amount: Decimal
    created_at: datetime
    items: List[SaleItemResponse]
    model_config = ConfigDict(from_attributes=True)
