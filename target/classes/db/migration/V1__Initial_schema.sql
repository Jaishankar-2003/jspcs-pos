-- ============================================================================
-- JSPCS POS - Production PostgreSQL Schema
-- Offline LAN-based Retail Billing System
-- ============================================================================
-- Design Date: 2024
-- Database: PostgreSQL 15
-- Character Set: UTF-8
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CORE REFERENCE TABLES
-- ============================================================================

-- Roles: User role definitions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT roles_name_check CHECK (name ~ '^[A-Z_]+$')
);

-- Users: System users (Admin, Cashiers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    cashier_counter_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT users_username_check CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT users_email_check CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Cashier Counters: Physical workstation/counter information
CREATE TABLE cashier_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_number VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    ip_address INET,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT cashier_counters_counter_number_check CHECK (counter_number ~ '^[A-Z0-9_-]+$')
);

-- Add foreign key constraint after cashier_counters table is created
ALTER TABLE users ADD CONSTRAINT users_cashier_counter_fk 
    FOREIGN KEY (cashier_counter_id) REFERENCES cashier_counters(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. PRODUCT & INVENTORY MANAGEMENT
-- ============================================================================

-- Products: Master product catalog
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    selling_price DECIMAL(15, 2) NOT NULL CHECK (selling_price >= 0),
    cost_price DECIMAL(15, 2) CHECK (cost_price >= 0),
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 100),
    hsn_code VARCHAR(10),
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold >= 0),
    version INTEGER DEFAULT 0 NOT NULL CHECK (version >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT products_price_check CHECK (selling_price >= cost_price OR cost_price IS NULL),
    CONSTRAINT products_gst_taxable_check CHECK (is_taxable = FALSE OR gst_rate > 0 OR is_taxable = TRUE)
);

-- Inventory: Current stock levels (denormalized for performance)
CREATE TABLE inventory (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 0 NOT NULL CHECK (version >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_stock_check CHECK (current_stock >= reserved_stock AND reserved_stock >= 0),
    CONSTRAINT inventory_available_stock_check CHECK ((current_stock - reserved_stock) >= 0),
    CONSTRAINT inventory_negative_stock_prevention CHECK (current_stock >= 0 AND reserved_stock >= 0 AND (current_stock - reserved_stock) >= 0)
);

-- Stock Movements: Complete audit trail of stock changes
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'EXPIRED')),
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
    new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
    reference_type VARCHAR(50),
    reference_id UUID,
    reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_movements_in_out_check CHECK (
        (movement_type IN ('IN', 'RETURN') AND new_stock = previous_stock + ABS(quantity) AND new_stock >= 0) OR
        (movement_type = 'OUT' AND new_stock = previous_stock - ABS(quantity) AND new_stock >= 0) OR
        (movement_type IN ('ADJUSTMENT', 'DAMAGE', 'EXPIRED') AND new_stock >= 0)
    ),
    CONSTRAINT stock_movements_negative_stock_prevention CHECK (new_stock >= 0 AND previous_stock >= 0)
);

-- ============================================================================
-- 3. SALES & BILLING
-- ============================================================================

-- Sequence for invoice numbers (concurrency-safe)
CREATE SEQUENCE invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sales Invoices: Invoice headers
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_time TIME NOT NULL DEFAULT CURRENT_TIME,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    counter_id UUID NOT NULL REFERENCES cashier_counters(id) ON DELETE RESTRICT,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(100),
    customer_gstin VARCHAR(15),
    
    -- Amounts (pre-tax)
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    taxable_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
    
    -- Tax amounts
    cgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
    sgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
    igst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
    total_tax_amount DECIMAL(15, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount + igst_amount) STORED,
    
    -- Final amounts
    round_off DECIMAL(15, 2) DEFAULT 0,
    grand_total DECIMAL(15, 2) NOT NULL CHECK (grand_total >= 0),
    
    -- Payment status
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED')),
    
    -- Metadata
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sales_invoices_total_check CHECK (
        grand_total = subtotal - discount_amount + total_tax_amount + COALESCE(round_off, 0)
    ),
    CONSTRAINT sales_invoices_gst_logic_check CHECK (
        (cgst_amount > 0 AND sgst_amount > 0 AND igst_amount = 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount >= 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount = 0)
    ),
    CONSTRAINT sales_invoices_discount_check CHECK (discount_amount <= subtotal),
    CONSTRAINT sales_invoices_taxable_calc_check CHECK (taxable_amount = subtotal - discount_amount),
    CONSTRAINT sales_invoices_cancelled_check CHECK ((is_cancelled = FALSE AND cancelled_at IS NULL AND cancelled_by IS NULL) OR (is_cancelled = TRUE AND cancelled_at IS NOT NULL)),
    CONSTRAINT sales_invoices_customer_gstin_check CHECK (customer_gstin IS NULL OR customer_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

-- Invoice Items: Line items for each invoice
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    line_number INTEGER NOT NULL CHECK (line_number > 0),
    
    -- Product snapshot (at time of sale)
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    product_barcode VARCHAR(50),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Discounts
    discount_percent DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount DECIMAL(15, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    
    -- Amounts
    line_total DECIMAL(15, 2) NOT NULL CHECK (line_total >= 0),
    taxable_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
    
    -- GST details
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 100),
    cgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
    sgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
    igst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
    total_tax_amount DECIMAL(15, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount + igst_amount) STORED,
    
    -- Final amount
    final_amount DECIMAL(15, 2) NOT NULL CHECK (final_amount >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT invoice_items_amount_check CHECK (
        final_amount = line_total - discount_amount + total_tax_amount
    ),
    CONSTRAINT invoice_items_gst_logic_check CHECK (
        (cgst_amount > 0 AND sgst_amount > 0 AND igst_amount = 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount >= 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount = 0)
    ),
    CONSTRAINT invoice_items_discount_check CHECK (discount_amount <= line_total),
    CONSTRAINT invoice_items_line_total_calc_check CHECK (line_total = (unit_price * quantity)),
    CONSTRAINT invoice_items_taxable_calc_check CHECK (taxable_amount = line_total - discount_amount),
    CONSTRAINT invoice_items_gst_calculation_check CHECK (
        (gst_rate = 0 AND cgst_amount = 0 AND sgst_amount = 0 AND igst_amount = 0) OR
        (gst_rate > 0 AND total_tax_amount > 0)
    ),
    CONSTRAINT invoice_items_unique_line UNIQUE (invoice_id, line_number)
);

-- Payments: Payment records (supports multiple payment modes per invoice)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'WALLET', 'OTHER')),
    payment_reference VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_time TIME NOT NULL DEFAULT CURRENT_TIME,
    received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    is_refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_refunded_check CHECK ((is_refunded = FALSE AND refunded_at IS NULL AND refunded_by IS NULL) OR (is_refunded = TRUE AND refunded_at IS NOT NULL)),
    CONSTRAINT payments_date_check CHECK (payment_date <= CURRENT_DATE)
);

-- GST Tax Details: Detailed GST breakdown for invoices
CREATE TABLE gst_tax_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    gst_rate DECIMAL(5, 2) NOT NULL CHECK (gst_rate >= 0 AND gst_rate <= 100),
    taxable_amount DECIMAL(15, 2) NOT NULL CHECK (taxable_amount >= 0),
    cgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
    sgst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
    igst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
    total_tax_amount DECIMAL(15, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount + igst_amount) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gst_tax_details_unique_rate UNIQUE (invoice_id, gst_rate),
    CONSTRAINT gst_tax_details_gst_logic_check CHECK (
        (cgst_amount > 0 AND sgst_amount > 0 AND igst_amount = 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount >= 0) OR
        (cgst_amount = 0 AND sgst_amount = 0 AND igst_amount = 0)
    ),
    CONSTRAINT gst_tax_details_cgst_sgst_equal_check CHECK (
        (cgst_amount = 0 AND sgst_amount = 0) OR (cgst_amount = sgst_amount)
    ),
    CONSTRAINT gst_tax_details_rate_precision_check CHECK (gst_rate >= 0 AND gst_rate <= 100),
    CONSTRAINT gst_tax_details_taxable_check CHECK (taxable_amount >= 0)
);

-- Manual Entry Logs: Track manual product entries (when barcode not found)
CREATE TABLE manual_entry_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    counter_id UUID NOT NULL REFERENCES cashier_counters(id) ON DELETE RESTRICT,
    searched_value VARCHAR(100) NOT NULL,
    matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('SEARCH', 'SELECT', 'ADD_NEW', 'CANCEL')),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. SYSTEM & ADMINISTRATION
-- ============================================================================

-- Audit Logs: Comprehensive system audit trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_check CHECK (action ~ '^[A-Z_]+$'),
    CONSTRAINT audit_logs_entity_type_check CHECK (entity_type ~ '^[A-Z_]+$')
);

-- Licenses: Software license management
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(255) NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE')),
    max_counters INTEGER NOT NULL DEFAULT 1 CHECK (max_counters > 0),
    max_users INTEGER NOT NULL DEFAULT 5 CHECK (max_users > 0),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    hardware_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT licenses_date_check CHECK (valid_until >= valid_from),
    CONSTRAINT licenses_activated_check CHECK ((activated_at IS NULL AND activated_by IS NULL) OR (activated_at IS NOT NULL))
);

-- Backup Metadata: Track database backups
CREATE TABLE backup_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('FULL', 'INCREMENTAL', 'MANUAL')),
    backup_file_path TEXT NOT NULL,
    backup_file_size BIGINT NOT NULL CHECK (backup_file_size > 0),
    backup_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_completed_at TIMESTAMP WITH TIME ZONE,
    backup_status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (backup_status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED')),
    error_message TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_metadata_time_check CHECK (backup_completed_at IS NULL OR backup_completed_at >= backup_started_at),
    CONSTRAINT backup_metadata_status_check CHECK (
        (backup_status = 'IN_PROGRESS' AND backup_completed_at IS NULL) OR
        (backup_status IN ('SUCCESS', 'FAILED') AND backup_completed_at IS NOT NULL)
    )
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE UNIQUE INDEX idx_users_username_active ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_cashier_counter_id ON users(cashier_counter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_users_role_active ON users(role_id, is_active) WHERE deleted_at IS NULL;

-- Cashier Counters indexes
CREATE UNIQUE INDEX idx_cashier_counters_counter_number_active ON cashier_counters(counter_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_cashier_counters_deleted_at ON cashier_counters(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_cashier_counters_active ON cashier_counters(is_active) WHERE deleted_at IS NULL;

-- Products indexes
CREATE UNIQUE INDEX idx_products_sku_active ON products(sku) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_products_barcode_active ON products(barcode) WHERE deleted_at IS NULL AND barcode IS NOT NULL;
CREATE INDEX idx_products_name ON products(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_products_version ON products(version);
CREATE INDEX idx_products_category_active ON products(category, is_active) WHERE deleted_at IS NULL;

-- Inventory indexes
CREATE INDEX idx_inventory_available_stock ON inventory(available_stock);
CREATE UNIQUE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_version ON inventory(version);
CREATE INDEX idx_inventory_current_stock ON inventory(current_stock);
CREATE INDEX idx_inventory_reserved_stock ON inventory(reserved_stock);

-- Stock Movements indexes
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id) WHERE reference_type IS NOT NULL;
CREATE INDEX idx_stock_movements_product_date ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_product_type ON stock_movements(product_id, movement_type);

-- Sales Invoices indexes
CREATE UNIQUE INDEX idx_sales_invoices_invoice_number ON sales_invoices(invoice_number);
CREATE INDEX idx_sales_invoices_invoice_date ON sales_invoices(invoice_date DESC);
CREATE INDEX idx_sales_invoices_cashier_id ON sales_invoices(cashier_id);
CREATE INDEX idx_sales_invoices_counter_id ON sales_invoices(counter_id);
CREATE INDEX idx_sales_invoices_payment_status ON sales_invoices(payment_status);
CREATE INDEX idx_sales_invoices_date_range ON sales_invoices(invoice_date, invoice_time DESC);
CREATE INDEX idx_sales_invoices_cancelled ON sales_invoices(is_cancelled) WHERE is_cancelled = FALSE;
CREATE INDEX idx_sales_invoices_created_at ON sales_invoices(created_at DESC);
CREATE INDEX idx_sales_invoices_counter_date ON sales_invoices(counter_id, invoice_date DESC);
CREATE INDEX idx_sales_invoices_cashier_date ON sales_invoices(cashier_id, invoice_date DESC);

-- Invoice Items indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX idx_invoice_items_invoice_product ON invoice_items(invoice_id, product_id);
CREATE INDEX idx_invoice_items_line_number ON invoice_items(invoice_id, line_number);

-- Payments indexes
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX idx_payments_received_by ON payments(received_by);
CREATE INDEX idx_payments_refunded ON payments(is_refunded) WHERE is_refunded = FALSE;
CREATE INDEX idx_payments_invoice_refunded ON payments(invoice_id, is_refunded) WHERE is_refunded = FALSE;

-- GST Tax Details indexes
CREATE INDEX idx_gst_tax_details_invoice_id ON gst_tax_details(invoice_id);
CREATE INDEX idx_gst_tax_details_gst_rate ON gst_tax_details(gst_rate);

-- Manual Entry Logs indexes
CREATE INDEX idx_manual_entry_logs_cashier_id ON manual_entry_logs(cashier_id);
CREATE INDEX idx_manual_entry_logs_created_at ON manual_entry_logs(created_at DESC);
CREATE INDEX idx_manual_entry_logs_searched_value ON manual_entry_logs(searched_value);
CREATE INDEX idx_manual_entry_logs_counter_id ON manual_entry_logs(counter_id);

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_action ON audit_logs(entity_type, action);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Licenses indexes
CREATE UNIQUE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_active ON licenses(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_licenses_hardware_id ON licenses(hardware_id) WHERE hardware_id IS NOT NULL;

-- Backup Metadata indexes
CREATE INDEX idx_backup_metadata_created_at ON backup_metadata(created_at DESC);
CREATE INDEX idx_backup_metadata_status ON backup_metadata(backup_status);
CREATE INDEX idx_backup_metadata_type_status ON backup_metadata(backup_type, backup_status);

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashier_counters_updated_at BEFORE UPDATE ON cashier_counters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at BEFORE UPDATE ON sales_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update inventory on stock movement
CREATE OR REPLACE FUNCTION update_inventory_on_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.new_stock < 0 THEN
        RAISE EXCEPTION 'Negative stock not allowed: product_id=%, new_stock=%', NEW.product_id, NEW.new_stock;
    END IF;
    
    INSERT INTO inventory (product_id, current_stock, last_movement_at, last_updated_by, version)
    VALUES (NEW.product_id, NEW.new_stock, NEW.created_at, NEW.created_by, 0)
    ON CONFLICT (product_id) DO UPDATE
    SET current_stock = NEW.new_stock,
        last_movement_at = NEW.created_at,
        last_updated_by = NEW.created_by,
        version = inventory.version + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock movement
CREATE TRIGGER trigger_update_inventory_on_stock_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_stock_movement();

-- Function to initialize inventory for new products
CREATE OR REPLACE FUNCTION initialize_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (product_id, current_stock, version)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT (product_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create inventory record for new products
CREATE TRIGGER trigger_initialize_inventory_for_product
    AFTER INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION initialize_inventory_for_product();

-- ============================================================================
-- 7. INITIAL DATA (OPTIONAL - SEED DATA)
-- ============================================================================

-- Insert default roles
INSERT INTO roles (id, name, description, permissions) VALUES
    (uuid_generate_v4(), 'ADMIN', 'System Administrator', '{"all": true}'::jsonb),
    (uuid_generate_v4(), 'CASHIER', 'Cashier/Operator', '{"sales": true, "inventory_view": true}'::jsonb),
    (uuid_generate_v4(), 'MANAGER', 'Store Manager', '{"sales": true, "inventory": true, "reports": true}'::jsonb);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
