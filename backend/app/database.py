import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite if Postgres URL is not provided
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pos.db")

# SQLite needs special args
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, use_insertmanyvalues=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import time
    max_retries = 10
    retry_delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == max_retries:
                raise e
            print(f"[Database] Connection attempt {attempt} failed ({e}), retrying in {retry_delay}s...")
            time.sleep(retry_delay)
    
    # Safe migration: ensure new columns exist if tables already existed
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    with engine.connect() as conn:
        is_pg = conn.dialect.name == "postgresql"
        uuid_col_type = "UUID" if is_pg else "VARCHAR(100)"

        # Check products table
        if "products" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("products")]
            if "cost_price" not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00"))
                conn.commit()
            if "is_inclusive" not in columns:
                bool_type = "BOOLEAN DEFAULT FALSE" if is_pg else "BOOLEAN DEFAULT 0"
                conn.execute(text(f"ALTER TABLE products ADD COLUMN is_inclusive {bool_type}"))
                conn.commit()

        # Check sales table
        if "sales" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("sales")]
            new_sales_cols = {
                "invoice_number": "VARCHAR(50)",
                "shift_id": uuid_col_type,
                "subtotal": "DECIMAL(10, 2) DEFAULT 0.00",
                "tax_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "cgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "sgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "igst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "discount_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "discount_percent": "DECIMAL(5, 2) DEFAULT 0.00",
                "discount_reason": "VARCHAR(255)",
                "customer_phone": "VARCHAR(50)",
                "notes": "VARCHAR(500)"
            }
            for col_name, col_type in new_sales_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE sales ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Check sale_items table
        if "sale_items" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("sale_items")]
            new_item_cols = {
                "batch_id": uuid_col_type,
                "unit_cost": "DECIMAL(10, 2) DEFAULT 0.00",
                "discount_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "tax_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "cgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "sgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "igst_amount": "DECIMAL(10, 2) DEFAULT 0.00"
            }
            for col_name, col_type in new_item_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE sale_items ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Check sales_return_items table
        if "sales_return_items" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("sales_return_items")]
            new_ret_cols = {
                "tax_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "unit_cost": "DECIMAL(10, 2) DEFAULT 0.00"
            }
            for col_name, col_type in new_ret_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE sales_return_items ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Check purchases table
        if "purchases" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("purchases")]
            new_purchase_cols = {
                "subtotal": "DECIMAL(10, 2) DEFAULT 0.00",
                "cgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "sgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "igst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "is_interstate": "BOOLEAN DEFAULT FALSE" if is_pg else "BOOLEAN DEFAULT 0",
                "additional_charges": "DECIMAL(10, 2) DEFAULT 0.00",
                "supplier_invoice_number": "VARCHAR(100)",
                "supplier_invoice_date": "TIMESTAMP WITH TIME ZONE" if is_pg else "DATETIME",
                "payment_terms": "VARCHAR(100)",
                "due_date": "TIMESTAMP WITH TIME ZONE" if is_pg else "DATETIME"
            }
            for col_name, col_type in new_purchase_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE purchases ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Check purchase_items table
        if "purchase_items" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("purchase_items")]
            new_p_item_cols = {
                "purchase_unit": "VARCHAR(50) DEFAULT 'Unit'",
                "conversion_factor": "DECIMAL(10, 3) DEFAULT 1.0",
                "base_unit": "VARCHAR(50)",
                "purchase_quantity": "DECIMAL(10, 2)",
                "purchase_unit_price": "DECIMAL(10, 2)",
                "converted_quantity": "DECIMAL(10, 2)",
                "tax_type": "VARCHAR(20) DEFAULT 'TAXABLE'",
                "is_inclusive": "BOOLEAN DEFAULT FALSE" if is_pg else "BOOLEAN DEFAULT 0",
                "taxable_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "cgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "sgst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "igst_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "discount_amount": "DECIMAL(10, 2) DEFAULT 0.00",
                "additional_charges": "DECIMAL(10, 2) DEFAULT 0.00"
            }
            for col_name, col_type in new_p_item_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE purchase_items ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Check product_batches table
        if "product_batches" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("product_batches")]
            new_batch_cols = {
                "mrp": "DECIMAL(10, 2)",
                "supplier_id": uuid_col_type,
                "grn_id": uuid_col_type
            }
            for col_name, col_type in new_batch_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE product_batches ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

        # Seed default users if empty
        user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if user_count == 0:
            import uuid
            admin_id = str(uuid.uuid4())
            cashier_id = str(uuid.uuid4())
            conn.execute(text(
                "INSERT INTO users (id, username, password_hash, role, full_name, email, is_active) VALUES "
                f"('{admin_id}', 'admin', '$2b$12$Cz0lbWhdpkrxV/SpPhRca.QDhp7RZV025BS4oODgpqjCUoHyXXtZS', 'ADMIN', 'Administrator', 'admin@jspcs.com', TRUE), "
                f"('{cashier_id}', 'cashier', '$2b$12$l39m48bA3pYR/GPMgXSuO.vJ7vjOYwBiQFsaveUm52I22qmCLEL3O', 'CASHIER', 'Cashier', 'cashier@jspcs.com', TRUE)"
            ))
            conn.commit()
