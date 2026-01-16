# Database Design Document
## JSPCS POS - Production PostgreSQL Schema

---

## 1. ER Relationship Explanation

### Core Entity Relationships

#### User Management Cluster
```
roles (1) ──< (N) users (N) ──> (1) cashier_counters
```
- **One-to-Many**: One role can have many users
- **Many-to-One**: Many users can work at one counter (not simultaneously)
- **Users** support soft delete via `deleted_at`

#### Product & Inventory Cluster
```
products (1) ──< (1) inventory
products (1) ──< (N) stock_movements
```
- **One-to-One**: Each product has exactly one inventory record
- **One-to-Many**: Each product has many stock movement transactions
- **Inventory** is denormalized for performance (current_stock, reserved_stock)
- **Stock Movements** provide complete audit trail
- **Products** support soft delete via `deleted_at`

#### Sales & Billing Cluster
```
sales_invoices (1) ──< (N) invoice_items
sales_invoices (1) ──< (N) payments
sales_invoices (1) ──< (N) gst_tax_details
sales_invoices (N) ──> (1) users (cashier_id)
sales_invoices (N) ──> (1) cashier_counters
invoice_items (N) ──> (1) products
```
- **One-to-Many**: One invoice has many line items
- **One-to-Many**: One invoice can have multiple payments (multi-mode payment)
- **One-to-Many**: One invoice has multiple GST rate breakdowns
- **Many-to-One**: Many invoices created by one cashier
- **Many-to-One**: Many invoices processed at one counter
- **Many-to-One**: Many invoice items reference one product

#### Audit & System Cluster
```
users (1) ──< (N) audit_logs
users (1) ──< (N) manual_entry_logs
sales_invoices (1) ──< (N) audit_logs (via entity_id)
products (1) ──< (N) audit_logs (via entity_id)
```
- **Audit Logs**: Polymorphic relationship via `entity_type` + `entity_id`
- **Manual Entry Logs**: Tracks barcode search failures

#### System Administration
```
users (1) ──< (N) licenses (activated_by)
backup_metadata (standalone)
```
- **Licenses**: Independent entity with optional user reference
- **Backup Metadata**: Standalone tracking table

---

## 2. SQL CREATE TABLE Statements

### Key Design Decisions

#### ACID Compliance
- All financial tables use appropriate constraints
- Foreign keys with `ON DELETE RESTRICT` for critical relationships
- `ON DELETE CASCADE` for child records (invoice_items, payments)
- `ON DELETE SET NULL` for optional relationships
- Check constraints enforce business rules at database level

#### Soft Delete Strategy
- **Soft Deleted Tables**: `users`, `products`, `cashier_counters`
- **Pattern**: `deleted_at TIMESTAMP WITH TIME ZONE`
- **Indexes**: Partial indexes exclude deleted records (e.g., `WHERE deleted_at IS NULL`)
- **Benefits**: 
  - Preserves audit trail
  - Allows data recovery
  - Maintains referential integrity

#### Data Types
- **UUID**: All primary keys for distributed system compatibility
- **DECIMAL(15,2)**: Financial amounts (precision critical)
- **TIMESTAMP WITH TIME ZONE**: All timestamps (timezone-aware)
- **JSONB**: Flexible data (permissions, audit values)
- **INET**: IP addresses
- **GENERATED ALWAYS AS ... STORED**: Computed columns (total_tax_amount)

#### Constraints & Validation
- **Check Constraints**: Business rules enforced (e.g., stock >= 0, prices >= 0)
- **Unique Constraints**: Invoice numbers, SKUs, barcodes
- **Foreign Keys**: Referential integrity
- **NOT NULL**: Critical fields enforced
- **Generated Columns**: Computed values (available_stock, total_tax_amount)

---

## 3. Indexing Strategy

### Primary Indexes (Automatic)
- All tables have UUID primary keys with clustered indexes
- Provides fast lookups by ID

### Performance-Critical Indexes

#### Lookup Performance
```sql
-- Users: Fast login and user lookup
idx_users_username (username) WHERE deleted_at IS NULL

-- Products: Fast product search
idx_products_sku (sku) WHERE deleted_at IS NULL
idx_products_barcode (barcode) WHERE deleted_at IS NULL AND barcode IS NOT NULL
idx_products_name (name) WHERE deleted_at IS NULL

-- Invoices: Fast invoice lookup
idx_sales_invoices_invoice_number (invoice_number)
idx_sales_invoices_invoice_date (invoice_date DESC)
```

#### Relationship Traversals
```sql
-- Foreign key indexes for JOIN performance
idx_users_role_id (role_id)
idx_invoice_items_invoice_id (invoice_id)
idx_payments_invoice_id (invoice_id)
idx_stock_movements_product_id (product_id)
```

#### Query Pattern Indexes
```sql
-- Date range queries
idx_sales_invoices_date_range (invoice_date, invoice_time DESC)
idx_stock_movements_product_date (product_id, created_at DESC)

-- Status filtering
idx_sales_invoices_payment_status (payment_status)
idx_sales_invoices_cancelled (is_cancelled) WHERE is_cancelled = FALSE
idx_users_active (is_active) WHERE deleted_at IS NULL
```

#### Partial Indexes (Optimization)
- **Soft Deletes**: Exclude deleted records from indexes
- **Active Records**: Index only active records
- **Benefits**: Smaller indexes, faster queries, better cache utilization

#### Composite Indexes
- **Multi-column**: Optimize common query patterns
- **Order**: Most selective column first
- **Covering**: Some indexes include frequently accessed columns

### Index Maintenance
- **Auto-vacuum**: PostgreSQL handles index maintenance
- **Monitoring**: Track index usage with `pg_stat_user_indexes`
- **Rebuild**: Periodic `REINDEX` for heavily updated tables

---

## 4. Concurrency Considerations

### Optimistic Locking Strategy

#### Version Fields
```sql
products.version INTEGER DEFAULT 0
inventory.version INTEGER DEFAULT 0
```
- **Pattern**: Increment version on each update
- **Application Logic**: 
  - Read version number with record
  - Include version in UPDATE WHERE clause
  - Detect conflicts when update affects 0 rows
- **Benefits**: 
  - No database locks
  - High concurrency
  - Conflict detection

#### Example Usage:
```sql
-- Read
SELECT id, stock, version FROM inventory WHERE product_id = 'xxx';

-- Update (application checks version)
UPDATE inventory 
SET current_stock = new_stock, version = version + 1
WHERE product_id = 'xxx' AND version = read_version;

-- If 0 rows affected → conflict detected
```

### Pessimistic Locking for Critical Operations

#### Stock Deduction (Atomic)
```sql
-- Use SELECT FOR UPDATE for critical inventory operations
BEGIN;
SELECT * FROM inventory WHERE product_id = 'xxx' FOR UPDATE;
-- Application logic
UPDATE inventory SET current_stock = current_stock - quantity 
WHERE product_id = 'xxx' AND current_stock >= quantity;
COMMIT;
```

#### Database Advisory Locks
```sql
-- For exclusive operations (e.g., stock adjustment)
SELECT pg_advisory_lock(hashtext('stock_adjustment_' || product_id));
-- ... perform operation ...
SELECT pg_advisory_unlock(hashtext('stock_adjustment_' || product_id));
```

### Transaction Isolation Levels

#### Recommended Settings
```sql
-- Default: READ COMMITTED (PostgreSQL default)
-- Sufficient for most operations

-- For critical financial transactions
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ... operations ...
COMMIT;
```

#### Isolation Level Usage
- **READ COMMITTED**: Default for all operations
- **REPEATABLE READ**: Critical financial transactions (invoices, payments)
- **SERIALIZABLE**: Not recommended (too restrictive, high conflict rate)

### Concurrent Cashier Handling

#### Stock Reservation Pattern
1. **Cart Creation**: Reserve stock temporarily
   ```sql
   UPDATE inventory 
   SET reserved_stock = reserved_stock + quantity
   WHERE product_id = 'xxx' AND available_stock >= quantity;
   ```

2. **Checkout**: Convert reservation to actual sale
   ```sql
   BEGIN;
   UPDATE inventory 
   SET current_stock = current_stock - quantity,
       reserved_stock = reserved_stock - quantity
   WHERE product_id = 'xxx' AND reserved_stock >= quantity;
   -- Create invoice and stock movement
   COMMIT;
   ```

3. **Cart Abandonment**: Release reservation after timeout
   ```sql
   UPDATE inventory 
   SET reserved_stock = reserved_stock - quantity
   WHERE product_id = 'xxx';
   ```

#### Invoice Number Generation
```sql
-- Use sequence for invoice numbers (thread-safe)
CREATE SEQUENCE invoice_number_seq;
-- Application generates: 'INV-' || to_char(nextval('invoice_number_seq'), 'FM0000000')
```

#### Conflict Resolution Strategies

1. **Last Write Wins**: Non-critical data (product descriptions)
   - Use optimistic locking with version field
   - Accept latest update

2. **First Write Wins**: Critical data (inventory)
   - Use pessimistic locking (SELECT FOR UPDATE)
   - Reject conflicting updates

3. **Manual Resolution**: Financial conflicts
   - Log conflict in audit_logs
   - Require admin intervention

### Database Connection Pooling

#### Recommended Settings
- **Pool Size**: 10-20 connections per cashier counter
- **Max Connections**: Total server connections = 50-100 (depending on hardware)
- **Connection Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes

### Performance Optimization for Concurrency

#### Connection Management
```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Monitor locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### Query Optimization
- **Use indexes**: All foreign keys and lookup fields indexed
- **Batch operations**: Group multiple updates in single transaction
- **Avoid long transactions**: Keep transactions short (< 1 second)
- **Use prepared statements**: Reduce parse overhead

#### Table Partitioning (Future Consideration)
- **sales_invoices**: Partition by `invoice_date` (monthly/quarterly)
- **stock_movements**: Partition by `created_at` (monthly)
- **audit_logs**: Partition by `created_at` (monthly)

---

## 5. Data Integrity & Consistency

### Referential Integrity
- Foreign keys ensure data consistency
- Cascading deletes for child records
- RESTRICT deletes for parent records with dependencies

### Business Rule Enforcement
- Check constraints enforce business rules
- Generated columns maintain calculated values
- Triggers update related tables (inventory on stock_movement)

### Audit Trail
- **audit_logs**: Complete change history
- **stock_movements**: Complete inventory transaction history
- **soft deletes**: Preserve deleted records

---

## 6. Backup & Recovery Strategy

### Backup Metadata Table
- Tracks all backup operations
- Records backup file paths and sizes
- Tracks backup success/failure

### Recommended Backup Strategy
1. **Full Backups**: Daily (nightly)
2. **WAL Archiving**: Continuous (for point-in-time recovery)
3. **Backup Verification**: Automated restore testing

### Recovery Procedures
- **Point-in-Time Recovery**: Using WAL archives
- **Full Restore**: From full backup + WAL replay
- **Selective Restore**: Restore specific tables/date ranges

---

## 7. Monitoring & Maintenance

### Key Metrics to Monitor
- **Connection Count**: Active database connections
- **Lock Waits**: Lock contention
- **Transaction Rate**: Transactions per second
- **Query Performance**: Slow query log
- **Index Usage**: Unused indexes
- **Table Bloat**: Table and index sizes

### Maintenance Tasks
- **VACUUM**: Regular vacuuming (auto-vacuum enabled)
- **ANALYZE**: Update statistics (auto-analyze enabled)
- **REINDEX**: Periodic index rebuilds
- **Archiving**: Old audit logs and stock movements

---

## 8. Security Considerations

### Data Protection
- **Password Hashing**: Store password_hash (use bcrypt/argon2)
- **IP Address Tracking**: Audit logs track IP addresses
- **Soft Deletes**: Prevent data loss from accidental deletion

### Access Control
- **Database Users**: Separate users for application vs admin
- **Row-Level Security**: Future consideration for multi-tenant scenarios
- **Connection Encryption**: Use SSL/TLS for database connections

---

## Summary

This schema is designed for:
- ✅ **High Concurrency**: Optimistic locking + atomic operations
- ✅ **Data Integrity**: Foreign keys + constraints + triggers
- ✅ **Performance**: Strategic indexes + denormalization where appropriate
- ✅ **Auditability**: Complete audit trail + soft deletes
- ✅ **Scalability**: UUIDs + partitioning-ready structure
- ✅ **Offline Durability**: ACID compliance + WAL logging
- ✅ **Maintainability**: Clear relationships + documented design

The design balances normalization (data integrity) with denormalization (performance) where appropriate (e.g., inventory table, invoice item snapshots).

