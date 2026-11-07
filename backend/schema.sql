CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CASHIER')),
    full_name VARCHAR(100),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    username VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    brand VARCHAR(100),
    unit_of_measure VARCHAR(50),
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    hsn_code VARCHAR(20),
    is_taxable BOOLEAN DEFAULT TRUE,
    low_stock_threshold INTEGER DEFAULT 10,
    is_inclusive BOOLEAN DEFAULT FALSE,
    mrp DECIMAL(10, 2),
    tax_type VARCHAR(20) DEFAULT 'TAXABLE',
    custom_cgst_rate DECIMAL(5, 2),
    custom_sgst_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS stock (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,
    previous_quantity INTEGER NOT NULL,
    quantity_changed INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    reason VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address VARCHAR(500),
    gstin VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    cgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    sgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    igst_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    additional_charges DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_interstate BOOLEAN DEFAULT FALSE,
    supplier_invoice_number VARCHAR(100),
    supplier_invoice_date TIMESTAMP WITH TIME ZONE,
    payment_terms VARCHAR(100),
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    purchase_unit VARCHAR(50) DEFAULT 'Unit',
    conversion_factor DECIMAL(10, 3) DEFAULT 1.0,
    base_unit VARCHAR(50),
    purchase_quantity DECIMAL(10, 2),
    purchase_unit_price DECIMAL(10, 2),
    converted_quantity DECIMAL(10, 2),
    ordered_quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_type VARCHAR(20) DEFAULT 'TAXABLE',
    is_inclusive BOOLEAN DEFAULT FALSE,
    taxable_amount DECIMAL(10, 2) DEFAULT 0.00,
    cgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    sgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    igst_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    additional_charges DECIMAL(10, 2) DEFAULT 0.00,
    line_total DECIMAL(10, 2) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    supplier_invoice_number VARCHAR(100),
    supplier_invoice_date TIMESTAMP WITH TIME ZONE,
    invoice_taxable_amount DECIMAL(10, 2) DEFAULT 0.00,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    cgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    sgst_amount DECIMAL(10, 2) DEFAULT 0.00,
    igst_amount DECIMAL(10, 2) DEFAULT 0.00,
    invoice_total DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    purchase_item_id UUID REFERENCES purchase_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    purchase_unit VARCHAR(50) DEFAULT 'Unit',
    conversion_factor DECIMAL(10, 3) DEFAULT 1.0,
    ordered_quantity DECIMAL(10, 2) NOT NULL,
    received_quantity DECIMAL(10, 2) DEFAULT 0.0,
    accepted_quantity DECIMAL(10, 2) DEFAULT 0.0,
    damaged_quantity DECIMAL(10, 2) DEFAULT 0.0,
    rejected_quantity DECIMAL(10, 2) DEFAULT 0.0,
    accepted_stock_quantity DECIMAL(10, 2) DEFAULT 0.0,
    damaged_stock_quantity DECIMAL(10, 2) DEFAULT 0.0,
    purchase_unit_cost DECIMAL(10, 2) NOT NULL,
    base_unit_cost DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    line_total DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS grn_item_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_item_id UUID NOT NULL REFERENCES goods_receipt_items(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    received_quantity DECIMAL(10, 2) NOT NULL,
    accepted_quantity DECIMAL(10, 2) NOT NULL,
    damaged_quantity DECIMAL(10, 2) DEFAULT 0.0,
    rejected_quantity DECIMAL(10, 2) DEFAULT 0.0,
    converted_accepted_quantity DECIMAL(10, 2) NOT NULL,
    converted_damaged_quantity DECIMAL(10, 2) DEFAULT 0.0,
    mfg_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    purchase_cost DECIMAL(10, 2) NOT NULL,
    base_unit_cost DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS purchase_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    grn_id UUID REFERENCES goods_receipts(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    document_category VARCHAR(50) DEFAULT 'OTHER',
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    purchase_item_id UUID REFERENCES purchase_items(id) ON DELETE SET NULL,
    mfg_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mrp DECIMAL(10, 2),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    grn_id UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
    initial_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'OPEN',
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_cash DECIMAL(10, 2) DEFAULT 0.00,
    closing_cash_actual DECIMAL(10, 2),
    closing_cash_expected DECIMAL(10, 2),
    cash_difference DECIMAL(10, 2),
    cash_sales DECIMAL(10, 2) DEFAULT 0.00,
    card_sales DECIMAL(10, 2) DEFAULT 0.00,
    upi_sales DECIMAL(10, 2) DEFAULT 0.00,
    refund_total DECIMAL(10, 2) DEFAULT 0.00,
    notes VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50),
    cashier_id UUID REFERENCES users(id),
    shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_reason VARCHAR(255),
    payment_mode VARCHAR(50),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(50),
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(50) NOT NULL UNIQUE,
    sale_id UUID NOT NULL REFERENCES sales(id),
    cashier_id UUID REFERENCES users(id),
    shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
    refund_mode VARCHAR(50) DEFAULT 'CASH',
    total_refund_amount DECIMAL(10, 2) NOT NULL,
    return_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    refund_subtotal DECIMAL(10, 2) NOT NULL,
    condition VARCHAR(50) DEFAULT 'SELLABLE'
);

-- Default login accounts (bcrypt via passlib)
-- admin / admin123
-- cashier / cashier123
INSERT INTO users (username, password_hash, role, full_name) VALUES
    ('admin', '$2b$12$Cz0lbWhdpkrxV/SpPhRca.QDhp7RZV025BS4oODgpqjCUoHyXXtZS', 'ADMIN', 'Administrator'),
    ('cashier', '$2b$12$l39m48bA3pYR/GPMgXSuO.vJ7vjOYwBiQFsaveUm52I22qmCLEL3O', 'CASHIER', 'Cashier')
ON CONFLICT (username) DO NOTHING;
