-- ============================================================================
-- REFUNDS TABLE ADDITION
-- ============================================================================

-- Refunds: Track all refund/return transactions
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    refund_number VARCHAR(50) NOT NULL UNIQUE,
    refund_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    refund_amount DECIMAL(15, 2) NOT NULL CHECK (refund_amount >= 0),
    tax_refunded DECIMAL(15, 2) NOT NULL CHECK (tax_refunded >= 0),
    refund_reason TEXT,
    refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('FULL_RETURN', 'PARTIAL_RETURN', 'EXCHANGE', 'DAMAGED_RETURN', 'EXPIRED_RETURN')),
    refund_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (refund_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'CANCELLED')),
    processed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT refunds_refund_amount_check CHECK (refund_amount = quantity_returned * unit_price),
    CONSTRAINT refunds_refund_number_check CHECK (refund_number ~ '^[A-Z]{3}-[0-9]{8}-[0-9]{4}$')
);

-- Indexes for Refunds
CREATE UNIQUE INDEX idx_refunds_refund_number ON refunds(refund_number);
CREATE INDEX idx_refunds_original_invoice_id ON refunds(original_invoice_id);
CREATE INDEX idx_refunds_product_id ON refunds(product_id);
CREATE INDEX idx_refunds_processed_by ON refunds(processed_by);
CREATE INDEX idx_refunds_refund_status ON refunds(refund_status);
CREATE INDEX idx_refunds_refund_date ON refunds(refund_date DESC);
CREATE INDEX idx_refunds_status_date ON refunds(refund_status, refund_date DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
