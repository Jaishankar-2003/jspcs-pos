from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "CASHIER"
    fullName: Optional[str] = Field(None, alias="fullName")
    roleId: Optional[str] = Field(None, alias="roleId")
    email: Optional[str] = None
    
    model_config = ConfigDict(populate_by_name=True)

class UserResponse(BaseModel):
    id: UUID
    username: str
    role: str
    fullName: Optional[str] = Field(None, validation_alias="full_name", serialization_alias="fullName")
    email: Optional[str] = None
    isActive: bool = Field(True, validation_alias="is_active", serialization_alias="isActive")
    isOnline: bool = False
    createdAt: Optional[datetime] = Field(None, validation_alias="created_at", serialization_alias="createdAt")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    type: str = "bearer"
    username: str
    role: str
    permissions: List[str] = []
    expiresAt: Optional[str] = None

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
    sellingPrice: Optional[Decimal] = None
    currentStock: Optional[int] = None
    availableStock: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)
# ... (rest of the file remains same)
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
