from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
from decimal import Decimal
from uuid import UUID

# --- Auth & Users ---
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

# --- Products & Stock ---
class ProductCreate(BaseModel):
    sku: str
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    subCategory: Optional[str] = Field(None, alias="subCategory")
    brand: Optional[str] = None
    unitOfMeasure: Optional[str] = Field(None, alias="unitOfMeasure")
    costPrice: Optional[Decimal] = Field(0, alias="costPrice")
    sellingPrice: Decimal = Field(..., alias="sellingPrice")
    gstRate: Decimal = Field(0, alias="gstRate")
    hsnCode: Optional[str] = Field(None, alias="hsnCode")
    isTaxable: bool = Field(True, alias="isTaxable")
    low_stock_threshold: int = 10
    currentStock: int = Field(0, alias="currentStock")
    model_config = ConfigDict(populate_by_name=True)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = Field(None, alias="subCategory")
    brand: Optional[str] = None
    unitOfMeasure: Optional[str] = Field(None, alias="unitOfMeasure")
    costPrice: Optional[Decimal] = Field(None, alias="costPrice")
    sellingPrice: Optional[Decimal] = Field(None, alias="sellingPrice")
    gstRate: Optional[Decimal] = Field(None, alias="gstRate")
    hsnCode: Optional[str] = Field(None, alias="hsnCode")
    isTaxable: Optional[bool] = Field(None, alias="isTaxable")
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    currentStock: Optional[int] = Field(None, alias="currentStock")
    model_config = ConfigDict(populate_by_name=True)

class ProductResponse(BaseModel):
    id: UUID
    sku: str
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    subCategory: Optional[str] = Field(None, validation_alias="sub_category", serialization_alias="subCategory")
    brand: Optional[str] = None
    unitOfMeasure: Optional[str] = Field(None, validation_alias="unit_of_measure", serialization_alias="unitOfMeasure")
    costPrice: Decimal = Field(0, validation_alias="cost_price", serialization_alias="costPrice")
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
    reason: Optional[str] = "Manual update"

class BulkDeleteRequest(BaseModel):
    ids: List[UUID]

# --- Sales, Billing & Checkout ---
class CartItem(BaseModel):
    product_id: UUID = Field(..., alias="productId")
    quantity: int
    unit_price: Optional[Decimal] = Field(None, alias="unitPrice")
    discount_percent: Optional[Decimal] = Field(Decimal("0.00"), alias="discountPercent")
    batch_id: Optional[UUID] = Field(None, alias="batchId")
    model_config = ConfigDict(populate_by_name=True)

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    customerName: Optional[str] = Field(None, alias="customerName")
    customerPhone: Optional[str] = Field(None, alias="customerPhone")
    paymentMode: Optional[str] = Field("CASH", alias="paymentMode")
    discountPercent: Optional[Decimal] = Field(Decimal("0.00"), alias="discountPercent")
    discountAmount: Optional[Decimal] = Field(Decimal("0.00"), alias="discountAmount")
    discountReason: Optional[str] = Field(None, alias="discountReason")
    notes: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

class CheckoutResponse(BaseModel):
    sale_id: UUID
    invoice_number: Optional[str] = None
    total_amount: Decimal
    invoice_path: str

class SaleItemResponse(BaseModel):
    product_id: Optional[str] = None
    productId: Optional[str] = None
    product_name: str
    productName: Optional[str] = None
    category: Optional[str] = "General"
    quantity: int
    unit_price: Decimal
    unitPrice: Optional[Decimal] = None
    discount: Optional[Decimal] = Decimal("0.00")
    tax: Optional[Decimal] = Decimal("0.00")
    subtotal: Decimal
    finalAmount: Optional[Decimal] = None
    total: Optional[Decimal] = None
    batch_number: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SaleResponse(BaseModel):
    id: UUID
    invoiceNumber: Optional[str] = None
    cashier_id: Optional[UUID] = None
    cashierName: Optional[str] = None
    total_amount: Decimal
    grandTotal: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    totalTaxAmount: Optional[Decimal] = None
    discountAmount: Optional[Decimal] = None
    paymentMode: Optional[str] = "CASH"
    customerName: Optional[str] = "Walk-in"
    customerPhone: Optional[str] = None
    status: Optional[str] = "PAID"
    created_at: datetime
    invoiceDate: Optional[str] = None
    invoiceTime: Optional[str] = None
    items: List[SaleItemResponse] = []
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Master Data ---
class CategoryCreate(BaseModel):
    name: str

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)

class UnitCreate(BaseModel):
    name: str

class UnitResponse(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)

class SubCategoryCreate(BaseModel):
    name: str
    categoryId: UUID = Field(..., alias="categoryId")

class SubCategoryResponse(BaseModel):
    id: UUID
    name: str
    categoryId: UUID = Field(..., validation_alias="category_id", serialization_alias="categoryId")
    model_config = ConfigDict(from_attributes=True)

# --- Feature A: Supplier Management ---
class SupplierCreate(BaseModel):
    name: str
    contactPerson: Optional[str] = Field(None, alias="contactPerson")
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contactPerson: Optional[str] = Field(None, alias="contactPerson")
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None
    isActive: Optional[bool] = Field(None, alias="isActive")
    model_config = ConfigDict(populate_by_name=True)

class SupplierResponse(BaseModel):
    id: UUID
    name: str
    contactPerson: Optional[str] = Field(None, validation_alias="contact_person", serialization_alias="contactPerson")
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    notes: Optional[str] = None
    isActive: bool = Field(True, validation_alias="is_active", serialization_alias="isActive")
    createdAt: Optional[datetime] = Field(None, validation_alias="created_at", serialization_alias="createdAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Feature B: Purchase Management ---
class PurchaseItemCreate(BaseModel):
    productId: UUID = Field(..., alias="productId")
    orderedQuantity: int = Field(..., alias="orderedQuantity")
    unitCost: Decimal = Field(..., alias="unitCost")
    taxRate: Optional[Decimal] = Field(Decimal("0.00"), alias="taxRate")
    discountPercent: Optional[Decimal] = Field(Decimal("0.00"), alias="discountPercent")
    batchNumber: Optional[str] = Field(None, alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, alias="expiryDate")
    model_config = ConfigDict(populate_by_name=True)

class PurchaseCreate(BaseModel):
    supplierId: UUID = Field(..., alias="supplierId")
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]
    model_config = ConfigDict(populate_by_name=True)

class PurchaseReceiveItem(BaseModel):
    itemId: UUID = Field(..., alias="itemId")
    receivedQuantity: int = Field(..., alias="receivedQuantity")
    damagedQuantity: Optional[int] = Field(0, alias="damagedQuantity")
    batchNumber: Optional[str] = Field(None, alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, alias="expiryDate")
    model_config = ConfigDict(populate_by_name=True)

class PurchaseReceiveRequest(BaseModel):
    items: List[PurchaseReceiveItem]

class PurchaseItemResponse(BaseModel):
    id: UUID
    productId: UUID = Field(..., validation_alias="product_id", serialization_alias="productId")
    productName: Optional[str] = None
    orderedQuantity: int = Field(..., validation_alias="ordered_quantity", serialization_alias="orderedQuantity")
    receivedQuantity: int = Field(0, validation_alias="received_quantity", serialization_alias="receivedQuantity")
    damagedQuantity: int = Field(0, validation_alias="damaged_quantity", serialization_alias="damagedQuantity")
    unitCost: Decimal = Field(..., validation_alias="unit_cost", serialization_alias="unitCost")
    taxRate: Decimal = Field(0, validation_alias="tax_rate", serialization_alias="taxRate")
    discountPercent: Decimal = Field(0, validation_alias="discount_percent", serialization_alias="discountPercent")
    lineTotal: Decimal = Field(..., validation_alias="line_total", serialization_alias="lineTotal")
    batchNumber: Optional[str] = Field(None, validation_alias="batch_number", serialization_alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, validation_alias="expiry_date", serialization_alias="expiryDate")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class PurchaseResponse(BaseModel):
    id: UUID
    purchaseNumber: str = Field(..., validation_alias="purchase_number", serialization_alias="purchaseNumber")
    supplierId: UUID = Field(..., validation_alias="supplier_id", serialization_alias="supplierId")
    supplierName: Optional[str] = None
    status: str
    totalAmount: Decimal = Field(..., validation_alias="total_amount", serialization_alias="totalAmount")
    taxAmount: Decimal = Field(0, validation_alias="tax_amount", serialization_alias="taxAmount")
    discountAmount: Decimal = Field(0, validation_alias="discount_amount", serialization_alias="discountAmount")
    notes: Optional[str] = None
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    receivedAt: Optional[datetime] = Field(None, validation_alias="received_at", serialization_alias="receivedAt")
    items: List[PurchaseItemResponse] = []
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Feature C: Inventory Stock Movement Ledger ---
class StockMovementResponse(BaseModel):
    id: UUID
    productId: UUID = Field(..., validation_alias="product_id", serialization_alias="productId")
    productName: Optional[str] = None
    productSku: Optional[str] = None
    movementType: str = Field(..., validation_alias="movement_type", serialization_alias="movementType")
    previousQuantity: int = Field(..., validation_alias="previous_quantity", serialization_alias="previousQuantity")
    quantityChanged: int = Field(..., validation_alias="quantity_changed", serialization_alias="quantityChanged")
    newQuantity: int = Field(..., validation_alias="new_quantity", serialization_alias="newQuantity")
    referenceType: Optional[str] = Field(None, validation_alias="reference_type", serialization_alias="referenceType")
    referenceId: Optional[str] = Field(None, validation_alias="reference_id", serialization_alias="referenceId")
    reason: Optional[str] = None
    createdBy: Optional[str] = Field(None, validation_alias="created_by", serialization_alias="createdBy")
    creatorUsername: Optional[str] = None
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Feature D: Sales Returns and Refunds ---
class SalesReturnItemCreate(BaseModel):
    saleItemId: Optional[UUID] = Field(None, alias="saleItemId")
    productId: UUID = Field(..., alias="productId")
    quantity: int
    condition: Optional[str] = "SELLABLE" # SELLABLE or DAMAGED
    model_config = ConfigDict(populate_by_name=True)

class SalesReturnCreate(BaseModel):
    saleId: UUID = Field(..., alias="saleId")
    refundMode: Optional[str] = Field("CASH", alias="refundMode")
    reason: Optional[str] = None
    items: List[SalesReturnItemCreate]
    model_config = ConfigDict(populate_by_name=True)

class SalesReturnItemResponse(BaseModel):
    id: UUID
    productId: UUID = Field(..., validation_alias="product_id", serialization_alias="productId")
    productName: Optional[str] = None
    quantity: int
    unitPrice: Decimal = Field(..., validation_alias="unit_price", serialization_alias="unitPrice")
    refundSubtotal: Decimal = Field(..., validation_alias="refund_subtotal", serialization_alias="refundSubtotal")
    condition: str
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SalesReturnResponse(BaseModel):
    id: UUID
    returnNumber: str = Field(..., validation_alias="return_number", serialization_alias="returnNumber")
    saleId: UUID = Field(..., validation_alias="sale_id", serialization_alias="saleId")
    saleInvoiceNumber: Optional[str] = None
    cashierName: Optional[str] = None
    refundMode: str = Field(..., validation_alias="refund_mode", serialization_alias="refundMode")
    totalRefundAmount: Decimal = Field(..., validation_alias="total_refund_amount", serialization_alias="totalRefundAmount")
    returnReason: Optional[str] = Field(None, validation_alias="return_reason", serialization_alias="returnReason")
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    items: List[SalesReturnItemResponse] = []
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Feature E: Cashier Shift Management ---
class ShiftOpenRequest(BaseModel):
    openingCash: Decimal = Field(Decimal("0.00"), alias="openingCash")
    notes: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

class ShiftCloseRequest(BaseModel):
    actualCash: Decimal = Field(..., alias="actualCash")
    notes: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

class ShiftResponse(BaseModel):
    id: UUID
    cashierId: UUID = Field(..., validation_alias="cashier_id", serialization_alias="cashierId")
    cashierUsername: Optional[str] = None
    status: str
    openedAt: datetime = Field(..., validation_alias="opened_at", serialization_alias="openedAt")
    closedAt: Optional[datetime] = Field(None, validation_alias="closed_at", serialization_alias="closedAt")
    openingCash: Decimal = Field(0, validation_alias="opening_cash", serialization_alias="openingCash")
    closingCashActual: Optional[Decimal] = Field(None, validation_alias="closing_cash_actual", serialization_alias="closingCashActual")
    closingCashExpected: Optional[Decimal] = Field(None, validation_alias="closing_cash_expected", serialization_alias="closingCashExpected")
    cashDifference: Optional[Decimal] = Field(None, validation_alias="cash_difference", serialization_alias="cashDifference")
    cashSales: Decimal = Field(0, validation_alias="cash_sales", serialization_alias="cashSales")
    cardSales: Decimal = Field(0, validation_alias="card_sales", serialization_alias="cardSales")
    upiSales: Decimal = Field(0, validation_alias="upi_sales", serialization_alias="upiSales")
    refundTotal: Decimal = Field(0, validation_alias="refund_total", serialization_alias="refundTotal")
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Feature F: Batch and Expiry Management ---
class ProductBatchCreate(BaseModel):
    productId: UUID = Field(..., alias="productId")
    batchNumber: str = Field(..., alias="batchNumber")
    mfgDate: Optional[datetime] = Field(None, alias="mfgDate")
    expiryDate: datetime = Field(..., alias="expiryDate")
    costPrice: Decimal = Field(..., alias="costPrice")
    sellingPrice: Decimal = Field(..., alias="sellingPrice")
    initialQuantity: int = Field(..., alias="initialQuantity")
    model_config = ConfigDict(populate_by_name=True)

class ProductBatchResponse(BaseModel):
    id: UUID
    productId: UUID = Field(..., validation_alias="product_id", serialization_alias="productId")
    productName: Optional[str] = None
    productSku: Optional[str] = None
    batchNumber: str = Field(..., validation_alias="batch_number", serialization_alias="batchNumber")
    mfgDate: Optional[datetime] = Field(None, validation_alias="mfg_date", serialization_alias="mfgDate")
    expiryDate: datetime = Field(..., validation_alias="expiry_date", serialization_alias="expiryDate")
    costPrice: Decimal = Field(..., validation_alias="cost_price", serialization_alias="costPrice")
    sellingPrice: Decimal = Field(..., validation_alias="selling_price", serialization_alias="sellingPrice")
    initialQuantity: int = Field(..., validation_alias="initial_quantity", serialization_alias="initialQuantity")
    currentQuantity: int = Field(..., validation_alias="current_quantity", serialization_alias="currentQuantity")
    isActive: bool = Field(True, validation_alias="is_active", serialization_alias="isActive")
    isExpired: bool = False
    daysUntilExpiry: int = 0
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- System Settings ---
class SettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
