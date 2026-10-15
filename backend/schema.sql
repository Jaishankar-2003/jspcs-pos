CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CASHIER')),
    full_name VARCHAR(100),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit_of_measure VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    hsn_code VARCHAR(20),
    is_taxable BOOLEAN DEFAULT TRUE,
    low_stock_threshold INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE stock (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Default login accounts (bcrypt via passlib)
-- admin / admin123
-- cashier / cashier123
INSERT INTO users (username, password_hash, role, full_name) VALUES
    ('admin', '$2b$12$Cz0lbWhdpkrxV/SpPhRca.QDhp7RZV025BS4oODgpqjCUoHyXXtZS', 'ADMIN', 'Administrator'),
    ('cashier', '$2b$12$l39m48bA3pYR/GPMgXSuO.vJ7vjOYwBiQFsaveUm52I22qmCLEL3O', 'CASHIER', 'Cashier');
