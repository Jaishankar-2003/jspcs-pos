import uuid
from sqlalchemy import Column, String, Integer, Boolean, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # 'ADMIN' or 'CASHIER'
    full_name = Column(String(100))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSession(Base):
    __tablename__ = "user_sessions"

    token = Column(String(100), primary_key=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    username = Column(String(50), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    barcode = Column(String(50))
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    sub_category = Column(String(100))
    brand = Column(String(100))
    unit_of_measure = Column(String(50))
    cost_price = Column(Numeric(10, 2), default=0.00)
    price = Column(Numeric(10, 2), nullable=False)
    gst_rate = Column(Numeric(5, 2), default=0)
    hsn_code = Column(String(20))
    is_taxable = Column(Boolean, default=True)
    low_stock_threshold = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)

    stock = relationship("Stock", back_populates="product", uselist=False, cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product", cascade="all, delete-orphan")
    batches = relationship("ProductBatch", back_populates="product", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stock"

    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    quantity = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="stock")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False, index=True)
    # Types: OPENING_STOCK, PURCHASE_RECEIVED, SALE, SALES_RETURN, DAMAGE, EXPIRY, MANUAL_ADJUSTMENT, PURCHASE_RETURN, OTHER
    previous_quantity = Column(Integer, nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reference_type = Column(String(50), nullable=True) # "SALE", "PURCHASE", "RETURN", "MANUAL"
    reference_id = Column(String, nullable=True)
    reason = Column(String(255), nullable=True)
    created_by = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")
    user = relationship("User")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    gstin = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchases = relationship("Purchase", back_populates="supplier")

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    purchase_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(GUID, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    discount_amount = Column(Numeric(10, 2), default=0.00)
    notes = Column(Text, nullable=True)
    created_by = Column(GUID, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    received_at = Column(DateTime(timezone=True), nullable=True)

    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    creator = relationship("User")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    purchase_id = Column(GUID, ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(GUID, ForeignKey("products.id"), nullable=False)
    ordered_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, default=0)
    damaged_quantity = Column(Integer, default=0)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00)
    discount_percent = Column(Numeric(5, 2), default=0.00)
    line_total = Column(Numeric(10, 2), nullable=False)
    batch_number = Column(String(100), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")

class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    purchase_item_id = Column(GUID, ForeignKey("purchase_items.id", ondelete="SET NULL"), nullable=True)
    mfg_date = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=False, index=True)
    cost_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    selling_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="batches")

class CashierShift(Base):
    __tablename__ = "cashier_shifts"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    cashier_id = Column(GUID, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(20), default="OPEN") # OPEN, CLOSED
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    opening_cash = Column(Numeric(10, 2), default=0.00)
    closing_cash_actual = Column(Numeric(10, 2), nullable=True)
    closing_cash_expected = Column(Numeric(10, 2), nullable=True)
    cash_difference = Column(Numeric(10, 2), nullable=True)
    cash_sales = Column(Numeric(10, 2), default=0.00)
    card_sales = Column(Numeric(10, 2), default=0.00)
    upi_sales = Column(Numeric(10, 2), default=0.00)
    refund_total = Column(Numeric(10, 2), default=0.00)
    notes = Column(String(500), nullable=True)

    cashier = relationship("User")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    invoice_number = Column(String(50), index=True, nullable=True)
    cashier_id = Column(GUID, ForeignKey("users.id"))
    shift_id = Column(GUID, ForeignKey("cashier_shifts.id", ondelete="SET NULL"), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    discount_amount = Column(Numeric(10, 2), default=0.00)
    discount_percent = Column(Numeric(5, 2), default=0.00)
    discount_reason = Column(String(255), nullable=True)
    payment_mode = Column(String(50))
    customer_name = Column(String(100))
    customer_phone = Column(String(50), nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    cashier = relationship("User")
    shift = relationship("CashierShift")
    returns = relationship("SalesReturn", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    sale_id = Column(GUID, ForeignKey("sales.id", ondelete="CASCADE"))
    product_id = Column(GUID, ForeignKey("products.id"))
    batch_id = Column(GUID, ForeignKey("product_batches.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2), default=0.00)
    discount_amount = Column(Numeric(10, 2), default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    subtotal = Column(Numeric(10, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
    batch = relationship("ProductBatch")

class SalesReturn(Base):
    __tablename__ = "sales_returns"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    return_number = Column(String(50), unique=True, index=True, nullable=False)
    sale_id = Column(GUID, ForeignKey("sales.id"), nullable=False)
    cashier_id = Column(GUID, ForeignKey("users.id"), nullable=True)
    shift_id = Column(GUID, ForeignKey("cashier_shifts.id", ondelete="SET NULL"), nullable=True)
    refund_mode = Column(String(50), default="CASH")
    total_refund_amount = Column(Numeric(10, 2), nullable=False)
    return_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="returns")
    cashier = relationship("User")
    items = relationship("SalesReturnItem", back_populates="sales_return", cascade="all, delete-orphan")

class SalesReturnItem(Base):
    __tablename__ = "sales_return_items"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    return_id = Column(GUID, ForeignKey("sales_returns.id", ondelete="CASCADE"), nullable=False)
    sale_item_id = Column(GUID, ForeignKey("sale_items.id"), nullable=True)
    product_id = Column(GUID, ForeignKey("products.id"), nullable=False)
    batch_id = Column(GUID, ForeignKey("product_batches.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    refund_subtotal = Column(Numeric(10, 2), nullable=False)
    condition = Column(String(50), default="SELLABLE") # SELLABLE or DAMAGED

    sales_return = relationship("SalesReturn", back_populates="items")
    product = relationship("Product")
    sale_item = relationship("SaleItem")

class Category(Base):
    __tablename__ = "categories"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)

class Unit(Base):
    __tablename__ = "units"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, index=True, nullable=False)

class SubCategory(Base):
    __tablename__ = "sub_categories"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    category_id = Column(GUID, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), index=True, nullable=False)
