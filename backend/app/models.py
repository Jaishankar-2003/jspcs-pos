import uuid
from sqlalchemy import Column, String, Integer, Boolean, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # 'ADMIN' or 'CASHIER'
    full_name = Column(String(100))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    barcode = Column(String(50))
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    sub_category = Column(String(100))
    brand = Column(String(100))
    unit_of_measure = Column(String(50))
    price = Column(Numeric(10, 2), nullable=False)
    gst_rate = Column(Numeric(5, 2), default=0)
    hsn_code = Column(String(20))
    is_taxable = Column(Boolean, default=True)
    low_stock_threshold = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)

    stock = relationship("Stock", back_populates="product", uselist=False, cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stock"

    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    quantity = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="stock")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(String, primary_key=True, default=generate_uuid)
    cashier_id = Column(String, ForeignKey("users.id"))
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(50))
    customer_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    cashier = relationship("User")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    sale_id = Column(String, ForeignKey("sales.id", ondelete="CASCADE"))
    product_id = Column(String, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)

class Unit(Base):
    __tablename__ = "units"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, index=True, nullable=False)

class SubCategory(Base):
    __tablename__ = "sub_categories"
    id = Column(String, primary_key=True, default=generate_uuid)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), index=True, nullable=False)
