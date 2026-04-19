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
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    unitOfMeasure: Optional[str] = Field(None, alias="unitOfMeasure")
    sellingPrice: Decimal = Field(..., alias="sellingPrice")
    gstRate: Decimal = Field(0, alias="gstRate")
    hsnCode: Optional[str] = Field(None, alias="hsnCode")
    isTaxable: bool = Field(True, alias="isTaxable")
    low_stock_threshold: int = 10
    currentStock: int = Field(0, alias="currentStock")
    
    model_config = ConfigDict(populate_by_name=True)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sellingPrice: Optional[Decimal] = Field(None, alias="sellingPrice")
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(populate_by_name=True)

class ProductResponse(BaseModel):
    id: UUID
    sku: str
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    unitOfMeasure: Optional[str] = Field(None, validation_alias="unit_of_measure", serialization_alias="unitOfMeasure")
    price: Decimal
    sellingPrice: Decimal = Field(..., validation_alias="price", serialization_alias="sellingPrice")
    gstRate: Decimal = Field(0, validation_alias="gst_rate", serialization_alias="gstRate")
    hsnCode: Optional[str] = Field(None, validation_alias="hsn_code", serialization_alias="hsnCode")
    isTaxable: bool = Field(True, validation_alias="is_taxable", serialization_alias="isTaxable")
    low_stock_threshold: int
    isActive: bool = Field(True, validation_alias="is_active", serialization_alias="isActive")
    stock_quantity: int = 0
    currentStock: int = Field(0, validation_alias="stock_quantity", serialization_alias="currentStock")
    availableStock: int = Field(0, validation_alias="stock_quantity", serialization_alias="availableStock")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class StockUpdate(BaseModel):
    quantity: int

class CartItem(BaseModel):
    product_id: UUID = Field(..., alias="productId")
    quantity: int
    
    model_config = ConfigDict(populate_by_name=True)

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    customerName: Optional[str] = Field(None, alias="customerName")
    paymentMode: Optional[str] = Field(None, alias="paymentMode")
    
    model_config = ConfigDict(populate_by_name=True)

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
