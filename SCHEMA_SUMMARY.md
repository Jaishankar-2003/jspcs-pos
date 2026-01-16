# Database Schema Summary
## JSPCS POS - PostgreSQL Schema Overview

---

## Tables Created (14 Total)

### 1. Core Reference Tables

#### `roles`
- **Purpose**: User role definitions (Admin, Cashier, Manager)
- **Key Fields**: name, permissions (JSONB)
- **Soft Delete**: No
- **Relationships**: Referenced by users (1:N)

#### `users`
- **Purpose**: System users (Admin, Cashiers, Managers)
- **Key Fields**: username, password_hash, full_name, role_id, cashier_counter_id
- **Soft Delete**: Yes (deleted_at)
- **Relationships**: 
  - References roles (N:1)
  - References cashier_counters (N:1, optional)
  - Referenced by multiple tables

#### `cashier_counters`
- **Purpose**: Physical workstation/counter information
- **Key Fields**: counter_number, name, location, ip_address
- **Soft Delete**: Yes (deleted_at)
- **Relationships**: Referenced by users (1:N)

---

### 2. Product & Inventory Tables

#### `products`
- **Purpose**: Master product catalog
- **Key Fields**: sku, barcode, name, selling_price, cost_price, gst_rate, hsn_code
- **Soft Delete**: Yes (deleted_at)
- **Optimistic Locking**: version field
- **Relationships**: 
  - One-to-one with inventory
  - One-to-many with stock_movements
  - Referenced by invoice_items

#### `inventory`
- **Purpose**: Current stock levels (denormalized for performance)
- **Key Fields**: current_stock, reserved_stock, available_stock (computed)
- **Optimistic Locking**: version field
- **Relationships**: One-to-one with products
- **Triggers**: Auto-updated by stock_movements

#### `stock_movements`
- **Purpose**: Complete audit trail of all stock changes
- **Key Fields**: movement_type (IN/OUT/ADJUSTMENT/etc.), quantity, previous_stock, new_stock
- **Relationships**: References products (N:1)
- **Audit Trail**: Complete history of inventory changes

---

### 3. Sales & Billing Tables

#### `sales_invoices`
- **Purpose**: Invoice headers
- **Key Fields**: invoice_number, invoice_date, cashier_id, counter_id, subtotal, tax amounts, grand_total
- **Soft Delete**: No (use is_cancelled flag)
- **Relationships**: 
  - One-to-many with invoice_items
  - One-to-many with payments
  - One-to-many with gst_tax_details
  - References users (cashier) (N:1)
  - References cashier_counters (N:1)

#### `invoice_items`
- **Purpose**: Line items for each invoice
- **Key Fields**: line_number, quantity, unit_price, discount_amount, tax amounts, final_amount
- **Product Snapshot**: Stores product details at time of sale
- **Relationships**: 
  - References sales_invoices (N:1)
  - References products (N:1)

#### `payments`
- **Purpose**: Payment records (supports multiple payment modes per invoice)
- **Key Fields**: payment_mode (CASH/CARD/UPI/etc.), amount, payment_reference
- **Multi-mode Support**: Multiple payments per invoice
- **Relationships**: References sales_invoices (N:1)

#### `gst_tax_details`
- **Purpose**: Detailed GST breakdown by tax rate for invoices
- **Key Fields**: gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount
- **Relationships**: References sales_invoices (N:1)
- **Aggregation**: Groups items by GST rate for reporting

---

### 4. System & Audit Tables

#### `manual_entry_logs`
- **Purpose**: Track manual product entries (when barcode not found)
- **Key Fields**: searched_value, matched_product_id, action
- **Relationships**: References users (cashier) (N:1), cashier_counters (N:1)

#### `audit_logs`
- **Purpose**: Comprehensive system audit trail
- **Key Fields**: action, entity_type, entity_id, old_values, new_values (JSONB)
- **Polymorphic**: Tracks changes to any entity via entity_type + entity_id
- **Relationships**: References users (N:1, optional)

#### `licenses`
- **Purpose**: Software license management
- **Key Fields**: license_key, license_type, max_counters, max_users, valid_from, valid_until
- **Relationships**: References users (activated_by) (N:1, optional)

#### `backup_metadata`
- **Purpose**: Track database backup operations
- **Key Fields**: backup_type, backup_file_path, backup_file_size, backup_status
- **Relationships**: References users (created_by) (N:1, optional)

---

## Key Features

### ACID Compliance
- ✅ All transactions are ACID compliant
- ✅ Foreign keys ensure referential integrity
- ✅ Check constraints enforce business rules
- ✅ Cascade deletes for child records

### Concurrency Support
- ✅ Optimistic locking (version fields on products, inventory)
- ✅ Atomic stock operations (UPDATE ... WHERE stock >= quantity)
- ✅ Transaction isolation levels
- ✅ Advisory locks for exclusive operations

### Data Integrity
- ✅ Foreign key constraints
- ✅ Check constraints (prices >= 0, stock >= 0, etc.)
- ✅ Unique constraints (invoice_number, sku, barcode)
- ✅ NOT NULL constraints on critical fields
- ✅ Generated columns for computed values

### Performance
- ✅ Strategic indexes on all lookup fields
- ✅ Partial indexes for soft-deleted records
- ✅ Composite indexes for common query patterns
- ✅ Denormalized inventory table for fast stock queries

### Audit Trail
- ✅ Complete stock movement history
- ✅ Comprehensive audit logs (polymorphic)
- ✅ Soft deletes preserve deleted records
- ✅ Timestamps on all tables

### Offline Durability
- ✅ WAL (Write-Ahead Logging) compatible
- ✅ Transaction logging
- ✅ Backup metadata tracking
- ✅ Point-in-time recovery support

---

## Index Summary

### Performance-Critical Indexes
- **Lookup**: username, sku, barcode, invoice_number
- **Date Range**: invoice_date, created_at (DESC)
- **Relationships**: All foreign keys indexed
- **Status**: payment_status, is_active, is_cancelled
- **Partial**: Exclude deleted records from indexes

### Total Indexes: ~35 indexes across all tables

---

## Triggers & Functions

### Auto-Update Triggers
- `update_updated_at_column()`: Updates updated_at timestamp
- Applied to: users, products, cashier_counters, licenses, inventory

### Inventory Management Triggers
- `update_inventory_on_stock_movement()`: Auto-updates inventory on stock movement
- `initialize_inventory_for_product()`: Creates inventory record for new products

---

## Seed Data

### Default Roles
- **ADMIN**: System Administrator (all permissions)
- **CASHIER**: Cashier/Operator (sales, inventory_view)
- **MANAGER**: Store Manager (sales, inventory, reports)

---

## Next Steps

1. **Review Schema**: Review `schema.sql` for any customizations needed
2. **Test Deployment**: Test schema creation on PostgreSQL database
3. **Create Admin User**: Insert initial admin user with hashed password
4. **Configure Backup**: Set up automated backup procedures
5. **Performance Tuning**: Configure PostgreSQL settings (shared_buffers, etc.)
6. **Connection Pooling**: Configure application connection pool
7. **Monitoring**: Set up database monitoring (pg_stat_statements, etc.)

---

## File Structure

- `schema.sql` - Complete PostgreSQL schema (CREATE TABLE statements, indexes, triggers)
- `DATABASE_DESIGN.md` - Detailed design document (ER relationships, indexing strategy, concurrency)
- `SCHEMA_SUMMARY.md` - This file (quick reference)

---

**Status**: ✅ Schema design complete and ready for review

