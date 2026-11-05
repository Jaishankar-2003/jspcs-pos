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

        # Check sales table
        if "sales" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("sales")]
            new_sales_cols = {
                "invoice_number": "VARCHAR(50)",
                "shift_id": uuid_col_type,
                "subtotal": "DECIMAL(10, 2) DEFAULT 0.00",
                "tax_amount": "DECIMAL(10, 2) DEFAULT 0.00",
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
                "tax_amount": "DECIMAL(10, 2) DEFAULT 0.00"
            }
            for col_name, col_type in new_item_cols.items():
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE sale_items ADD COLUMN {col_name} {col_type}"))
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
