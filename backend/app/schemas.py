from pydantic import BaseModel, ConfigDict, Field, AliasChoices
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
    mrp: Optional[Decimal] = Field(None, alias="mrp")
    gstRate: Decimal = Field(Decimal("0.00"), validation_alias=AliasChoices("gstRate", "taxRate", "gst_rate", "tax_rate"), serialization_alias="gstRate")
    hsnCode: Optional[str] = Field(None, alias="hsnCode")
    isTaxable: bool = Field(True, alias="isTaxable")
    isInclusive: Optional[bool] = Field(False, alias="isInclusive")
    taxType: Optional[str] = Field("TAXABLE", alias="taxType")
    customCgstRate: Optional[Decimal] = Field(None, alias="customCgstRate")
    customSgstRate: Optional[Decimal] = Field(None, alias="customSgstRate")
    low_stock_threshold: int = 10
    currentStock: int = Field(0, validation_alias=AliasChoices("currentStock", "stock"), serialization_alias="currentStock")
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
    mrp: Optional[Decimal] = Field(None, alias="mrp")
    gstRate: Optional[Decimal] = Field(None, validation_alias=AliasChoices("gstRate", "taxRate", "gst_rate", "tax_rate"), serialization_alias="gstRate")
    hsnCode: Optional[str] = Field(None, alias="hsnCode")
    isTaxable: Optional[bool] = Field(None, alias="isTaxable")
    isInclusive: Optional[bool] = Field(None, alias="isInclusive")
    taxType: Optional[str] = Field(None, alias="taxType")
    customCgstRate: Optional[Decimal] = Field(None, alias="customCgstRate")
    customSgstRate: Optional[Decimal] = Field(None, alias="customSgstRate")
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    currentStock: Optional[int] = Field(None, validation_alias=AliasChoices("currentStock", "stock"), serialization_alias="currentStock")
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
    mrp: Optional[Decimal] = Field(None, validation_alias="mrp", serialization_alias="mrp")
    gstRate: Decimal = Field(0, validation_alias="gst_rate", serialization_alias="gstRate")
    hsnCode: Optional[str] = Field(None, validation_alias="hsn_code", serialization_alias="hsnCode")
    isTaxable: bool = Field(True, validation_alias="is_taxable", serialization_alias="isTaxable")
    isInclusive: bool = Field(False, validation_alias="is_inclusive", serialization_alias="isInclusive")
    taxType: Optional[str] = Field("TAXABLE", validation_alias="tax_type", serialization_alias="taxType")
    customCgstRate: Optional[Decimal] = Field(None, validation_alias="custom_cgst_rate", serialization_alias="customCgstRate")
    customSgstRate: Optional[Decimal] = Field(None, validation_alias="custom_sgst_rate", serialization_alias="customSgstRate")
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
    isInterstate: Optional[bool] = Field(False, alias="isInterstate")
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
    purchaseUnit: Optional[str] = Field("Unit", alias="purchaseUnit")
    conversionFactor: Optional[Decimal] = Field(Decimal("1.0"), alias="conversionFactor")
    baseUnit: Optional[str] = Field(None, alias="baseUnit")
    purchaseQuantity: Optional[Decimal] = Field(None, alias="purchaseQuantity")
    purchaseUnitPrice: Optional[Decimal] = Field(None, alias="purchaseUnitPrice")
    orderedQuantity: Optional[int] = Field(None, alias="orderedQuantity")
    unitCost: Optional[Decimal] = Field(None, alias="unitCost")
    taxRate: Optional[Decimal] = Field(Decimal("0.00"), alias="taxRate")
    taxType: Optional[str] = Field("TAXABLE", alias="taxType")
    isInclusive: Optional[bool] = Field(False, alias="isInclusive")
    discountPercent: Optional[Decimal] = Field(Decimal("0.00"), alias="discountPercent")
    discountAmount: Optional[Decimal] = Field(Decimal("0.00"), alias="discountAmount")
    additionalCharges: Optional[Decimal] = Field(Decimal("0.00"), alias="additionalCharges")
    batchNumber: Optional[str] = Field(None, alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, alias="expiryDate")
    model_config = ConfigDict(populate_by_name=True)

class PurchaseCreate(BaseModel):
    supplierId: UUID = Field(..., alias="supplierId")
    status: Optional[str] = Field("ORDERED", alias="status")
    isInterstate: Optional[bool] = Field(False, alias="isInterstate")
    supplierInvoiceNumber: Optional[str] = Field(None, alias="supplierInvoiceNumber")
    supplierInvoiceDate: Optional[datetime] = Field(None, alias="supplierInvoiceDate")
    paymentTerms: Optional[str] = Field(None, alias="paymentTerms")
    dueDate: Optional[datetime] = Field(None, alias="dueDate")
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]
    model_config = ConfigDict(populate_by_name=True)

class GrnBatchItem(BaseModel):
    batchNumber: str = Field(..., alias="batchNumber")
    receivedQuantity: Decimal = Field(..., alias="receivedQuantity")
    acceptedQuantity: Decimal = Field(..., alias="acceptedQuantity")
    damagedQuantity: Optional[Decimal] = Field(Decimal("0.00"), alias="damagedQuantity")
    rejectedQuantity: Optional[Decimal] = Field(Decimal("0.00"), alias="rejectedQuantity")
    mfgDate: Optional[datetime] = Field(None, alias="mfgDate")
    expiryDate: Optional[datetime] = Field(None, alias="expiryDate")
    purchaseCost: Optional[Decimal] = Field(None, alias="purchaseCost")
    mrp: Optional[Decimal] = Field(None, alias="mrp")
    notes: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)

class PurchaseReceiveItem(BaseModel):
    itemId: UUID = Field(..., alias="itemId")
    receivedQuantity: Decimal = Field(..., alias="receivedQuantity")
    damagedQuantity: Optional[Decimal] = Field(Decimal("0.00"), alias="damagedQuantity")
    rejectedQuantity: Optional[Decimal] = Field(Decimal("0.00"), alias="rejectedQuantity")
    batchNumber: Optional[str] = Field(None, alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, alias="expiryDate")
    mfgDate: Optional[datetime] = Field(None, alias="mfgDate")
    batches: Optional[List[GrnBatchItem]] = Field([], alias="batches")
    sellingPrice: Optional[Decimal] = Field(None, alias="sellingPrice")
    sellingGstRate: Optional[Decimal] = Field(None, alias="sellingGstRate")
    model_config = ConfigDict(populate_by_name=True)

class PurchaseReceiveRequest(BaseModel):
    supplierInvoiceNumber: Optional[str] = Field(None, alias="supplierInvoiceNumber")
    supplierInvoiceDate: Optional[datetime] = Field(None, alias="supplierInvoiceDate")
    invoiceTaxableAmount: Optional[Decimal] = Field(None, alias="invoiceTaxableAmount")
    gstAmount: Optional[Decimal] = Field(None, alias="gstAmount")
    cgstAmount: Optional[Decimal] = Field(None, alias="cgstAmount")
    sgstAmount: Optional[Decimal] = Field(None, alias="sgstAmount")
    igstAmount: Optional[Decimal] = Field(None, alias="igstAmount")
    invoiceTotal: Optional[Decimal] = Field(None, alias="invoiceTotal")
    notes: Optional[str] = None
    items: List[PurchaseReceiveItem]
    model_config = ConfigDict(populate_by_name=True)

class PurchaseItemResponse(BaseModel):
    id: UUID
    productId: UUID = Field(..., validation_alias=AliasChoices("product_id", "productId"), serialization_alias="productId")
    productName: Optional[str] = None
    productSku: Optional[str] = None
    purchaseUnit: Optional[str] = Field("Unit", validation_alias=AliasChoices("purchase_unit", "purchaseUnit"), serialization_alias="purchaseUnit")
    conversionFactor: Optional[Decimal] = Field(Decimal("1.0"), validation_alias=AliasChoices("conversion_factor", "conversionFactor"), serialization_alias="conversionFactor")
    baseUnit: Optional[str] = Field(None, validation_alias=AliasChoices("base_unit", "baseUnit"), serialization_alias="baseUnit")
    purchaseQuantity: Optional[Decimal] = Field(None, validation_alias=AliasChoices("purchase_quantity", "purchaseQuantity"), serialization_alias="purchaseQuantity")
    purchaseUnitPrice: Optional[Decimal] = Field(None, validation_alias=AliasChoices("purchase_unit_price", "purchaseUnitPrice"), serialization_alias="purchaseUnitPrice")
    convertedQuantity: Optional[Decimal] = Field(None, validation_alias=AliasChoices("converted_quantity", "convertedQuantity"), serialization_alias="convertedQuantity")
    orderedQuantity: int = Field(..., validation_alias=AliasChoices("ordered_quantity", "orderedQuantity"), serialization_alias="orderedQuantity")
    receivedQuantity: int = Field(0, validation_alias=AliasChoices("received_quantity", "receivedQuantity"), serialization_alias="receivedQuantity")
    damagedQuantity: int = Field(0, validation_alias=AliasChoices("damaged_quantity", "damagedQuantity"), serialization_alias="damagedQuantity")
    unitCost: Decimal = Field(..., validation_alias=AliasChoices("unit_cost", "unitCost"), serialization_alias="unitCost")
    taxRate: Decimal = Field(0, validation_alias=AliasChoices("tax_rate", "taxRate"), serialization_alias="taxRate")
    taxType: Optional[str] = Field("TAXABLE", validation_alias=AliasChoices("tax_type", "taxType"), serialization_alias="taxType")
    isInclusive: Optional[bool] = Field(False, validation_alias=AliasChoices("is_inclusive", "isInclusive"), serialization_alias="isInclusive")
    taxableAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("taxable_amount", "taxableAmount"), serialization_alias="taxableAmount")
    cgstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("cgst_amount", "cgstAmount"), serialization_alias="cgstAmount")
    sgstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("sgst_amount", "sgstAmount"), serialization_alias="sgstAmount")
    igstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("igst_amount", "igstAmount"), serialization_alias="igstAmount")
    discountPercent: Decimal = Field(0, validation_alias=AliasChoices("discount_percent", "discountPercent"), serialization_alias="discountPercent")
    discountAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("discount_amount", "discountAmount"), serialization_alias="discountAmount")
    additionalCharges: Optional[Decimal] = Field(Decimal("0.00"), validation_alias=AliasChoices("additional_charges", "additionalCharges"), serialization_alias="additionalCharges")
    lineTotal: Decimal = Field(..., validation_alias=AliasChoices("line_total", "lineTotal"), serialization_alias="lineTotal")
    batchNumber: Optional[str] = Field(None, validation_alias=AliasChoices("batch_number", "batchNumber"), serialization_alias="batchNumber")
    expiryDate: Optional[datetime] = Field(None, validation_alias=AliasChoices("expiry_date", "expiryDate"), serialization_alias="expiryDate")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class PurchaseAttachmentResponse(BaseModel):
    id: UUID
    purchaseId: Optional[UUID] = Field(None, validation_alias="purchase_id", serialization_alias="purchaseId")
    grnId: Optional[UUID] = Field(None, validation_alias="grn_id", serialization_alias="grnId")
    filename: str
    fileType: Optional[str] = Field(None, validation_alias="file_type", serialization_alias="fileType")
    fileSize: Optional[int] = Field(None, validation_alias="file_size", serialization_alias="fileSize")
    documentCategory: str = Field("OTHER", validation_alias="document_category", serialization_alias="documentCategory")
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    downloadUrl: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class PurchaseResponse(BaseModel):
    id: UUID
    purchaseNumber: str = Field(..., validation_alias="purchase_number", serialization_alias="purchaseNumber")
    supplierId: UUID = Field(..., validation_alias="supplier_id", serialization_alias="supplierId")
    supplierName: Optional[str] = None
    status: str
    subtotal: Optional[Decimal] = Field(Decimal("0.00"), validation_alias="subtotal", serialization_alias="subtotal")
    taxAmount: Decimal = Field(0, validation_alias="tax_amount", serialization_alias="taxAmount")
    cgstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias="cgst_amount", serialization_alias="cgstAmount")
    sgstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias="sgst_amount", serialization_alias="sgstAmount")
    igstAmount: Optional[Decimal] = Field(Decimal("0.00"), validation_alias="igst_amount", serialization_alias="igstAmount")
    discountAmount: Decimal = Field(0, validation_alias="discount_amount", serialization_alias="discountAmount")
    additionalCharges: Optional[Decimal] = Field(Decimal("0.00"), validation_alias="additional_charges", serialization_alias="additionalCharges")
    totalAmount: Decimal = Field(..., validation_alias="total_amount", serialization_alias="totalAmount")
    isInterstate: Optional[bool] = Field(False, validation_alias="is_interstate", serialization_alias="isInterstate")
    supplierInvoiceNumber: Optional[str] = Field(None, validation_alias="supplier_invoice_number", serialization_alias="supplierInvoiceNumber")
    supplierInvoiceDate: Optional[datetime] = Field(None, validation_alias="supplier_invoice_date", serialization_alias="supplierInvoiceDate")
    paymentTerms: Optional[str] = Field(None, validation_alias="payment_terms", serialization_alias="paymentTerms")
    dueDate: Optional[datetime] = Field(None, validation_alias="due_date", serialization_alias="dueDate")
    notes: Optional[str] = None
    createdAt: datetime = Field(..., validation_alias="created_at", serialization_alias="createdAt")
    receivedAt: Optional[datetime] = Field(None, validation_alias="received_at", serialization_alias="receivedAt")
    items: List[PurchaseItemResponse] = []
    attachmentsCount: Optional[int] = 0
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
