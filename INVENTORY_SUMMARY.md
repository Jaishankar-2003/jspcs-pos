# Inventory & Stock Control Summary
## JSPCS POS - Quick Reference Guide

---

## Architecture Overview

### Central Stock Ledger
```
inventory (Current State) ←→ stock_movements (Complete History)
     │                              │
     └────────── Single Source of Truth ──────────┘
```

**Key Components:**
- `inventory` table: Current stock state (denormalized)
- `stock_movements` table: Complete audit trail
- Real-time updates via WebSocket

---

## Stock Operations

### 1. Stock Reservation (Cart Building)
```
Client → addItemToCart() 
  → Check availability
  → Reserve stock (SELECT FOR UPDATE + UPDATE)
  → Add to cart
  → Broadcast update (WebSocket)
```

**Key Features:**
- Pessimistic locking (SELECT FOR UPDATE)
- Double-check availability
- Atomic update with constraint check
- Broadcast real-time update

### 2. Stock Deduction (Sale/Invoice)
```
InvoiceService.createInvoice()
  → FOR EACH cart item:
    ├─> Lock inventory row
    ├─> Validate reserved stock
    ├─> Atomic update (current_stock--, reserved_stock--)
    ├─> Create stock movement
    └─> Broadcast update
```

**Key Features:**
- Atomic deduction (both fields updated)
- Negative stock prevention (WHERE clause)
- Complete audit trail
- Real-time update broadcast

### 3. Stock Return (Credit Note)
```
ReturnService.createReturn()
  → FOR EACH return item:
    ├─> Lock inventory row
    ├─> Update stock (current_stock++)
    ├─> Create stock movement (RETURN)
    └─> Broadcast update
```

### 4. Manual Stock Adjustment (Admin)
```
Admin → adjustStock()
  → Lock inventory row
  → Validate new stock >= 0
  → Update stock (with constraint check)
  → Create stock movement
  → Create audit log
  → Broadcast update
```

**Adjustment Types:**
- `ADJUSTMENT`: Manual correction (+ve or -ve)
- `DAMAGE`: Damage write-off (-ve only)
- `EXPIRED`: Expiry write-off (-ve only)
- `PURCHASE`: Stock purchase (+ve)
- `RETURN`: Customer return (+ve)

---

## Race Condition Prevention

### Multi-Layer Defense

```
Layer 1: Pessimistic Locking
  └─> SELECT ... FOR UPDATE (exclusive row lock)

Layer 2: Database Constraints
  └─> CHECK (current_stock >= 0)
  └─> CHECK (current_stock >= reserved_stock)

Layer 3: Update Constraints
  └─> WHERE current_stock >= quantity
  └─> WHERE reserved_stock >= quantity

Layer 4: Optimistic Locking (version field)
  └─> Version check for concurrent modification detection
```

### Pessimistic Locking Pattern
```sql
BEGIN TRANSACTION;
SELECT * FROM inventory WHERE product_id = ? FOR UPDATE;  -- Lock
-- Read current state
-- Calculate new state
UPDATE inventory SET ... WHERE product_id = ?;  -- Update
COMMIT;  -- Release lock
```

**Benefits:**
- Exclusive row lock prevents concurrent modifications
- Sequential execution of stock operations
- No race conditions possible

---

## Negative Stock Prevention

### Defense Layers

1. **Application-Level Validation**
   - Check availability before operation
   - Validate quantity > 0
   - Business rule validation

2. **Pessimistic Locking**
   - SELECT FOR UPDATE (exclusive lock)
   - Double-check after lock acquisition
   - Sequential execution guarantee

3. **Database Constraints (Check)**
   - `CHECK (current_stock >= 0)`
   - `CHECK (current_stock >= reserved_stock)`
   - Database-level enforcement

4. **Update Constraints (WHERE Clause)**
   - `WHERE current_stock >= quantity`
   - `WHERE reserved_stock >= quantity`
   - Conditional update (0 rows if constraint fails)

5. **Stock Movement Validation**
   - Validate previous_stock + quantity = new_stock
   - Validate new_stock >= 0
   - Audit trail validation

### Update Pattern
```sql
UPDATE inventory 
SET current_stock = current_stock - quantity
WHERE product_id = ?
  AND current_stock >= quantity;  -- PREVENTS NEGATIVE STOCK

-- If 0 rows updated → constraint failed → exception thrown
```

---

## Instant Updates on Cashier Terminals

### WebSocket Real-Time Architecture

```
Stock Operation → InventoryService
  → Update inventory table
  → WebSocketNotificationService.broadcastStockUpdate()
  → All connected clients receive update
  → Frontend updates UI (real-time)
```

### WebSocket Configuration
- **Endpoint**: `/ws`
- **Topics**: `/topic/stock-updates` (broadcast)
- **Topics**: `/topic/stock-updates/{productId}` (product-specific)
- **Topics**: `/topic/admin/low-stock-alerts` (admin alerts)

### Update Message Format
```json
{
  "type": "STOCK_UPDATE",
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "currentStock": 10,
  "reservedStock": 2,
  "availableStock": 8,
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Update Triggers
Stock updates are broadcast when:
1. Stock reserved (cart item added)
2. Stock deducted (invoice created)
3. Stock returned (credit note created)
4. Stock adjusted (admin adjustment)
5. Stock damaged/expired (admin operation)

### Frontend Integration (React)
```javascript
// Subscribe to stock updates
stompClient.subscribe('/topic/stock-updates', (message) => {
    const stockUpdate = JSON.parse(message.body);
    updateProductStock(stockUpdate.productId, stockUpdate);
});
```

---

## Batch / Serial Tracking (Optional)

### Tables (Optional Feature)
```sql
-- Batch tracking
product_batches (
    product_id, batch_number, quantity, expiry_date, mfg_date
)

-- Serial number tracking
product_serials (
    product_id, serial_number, batch_id, status, sold_invoice_id
)
```

### Tracking Flow
- **Batch Tracking**: FIFO allocation (First In First Out)
- **Serial Tracking**: Individual unit tracking
- **Status**: AVAILABLE, SOLD, RETURNED

---

## Low Stock Alerts

### Configuration
- **Product-Level Threshold**: `products.low_stock_threshold` (default: 10)
- **Alert Trigger**: `available_stock <= threshold`
- **Alert Types**: Real-time (on stock update) + Scheduled (hourly)

### Alert Flow
```
Stock Update → Check threshold
  → IF available_stock <= threshold
    → Broadcast low stock alert (WebSocket)
    → Send email/notification (optional)
```

### Scheduled Check
```java
@Scheduled(cron = "0 0 * * * *")  // Every hour
checkLowStockAlerts()
```

---

## Admin Stock Adjustment

### Adjustment Flow
```
Admin → POST /api/admin/inventory/adjust
  → Validate admin permissions
  → Lock inventory row (SELECT FOR UPDATE)
  → Calculate new stock
  → Validate new stock >= 0
  → Update stock (with constraint check)
  → Create stock movement
  → Create audit log
  → Broadcast update
  → Check low stock alert
```

### Adjustment Types
- **ADJUSTMENT**: Manual correction (can be +ve or -ve)
- **DAMAGE**: Damage write-off (decrease only)
- **EXPIRED**: Expiry write-off (decrease only)
- **PURCHASE**: Stock purchase (increase)
- **RETURN**: Customer return (increase)

---

## Transaction Boundaries

### Stock Reservation
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    propagation = Propagation.REQUIRES_NEW  // Independent transaction
)
public void reserveStock(UUID productId, Integer quantity, UUID reservationId) {
    // Pessimistic lock + atomic update
}
```

### Stock Deduction
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    propagation = Propagation.REQUIRES_NEW  // Independent transaction
)
public void sellStock(UUID productId, Integer quantity, UUID invoiceId, UUID userId) {
    // Pessimistic lock + atomic update + stock movement
}
```

### Stock Adjustment
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ
)
@PreAuthorize("hasRole('ADMIN')")
public AdjustmentResponse adjustStock(AdjustmentRequest request) {
    // Pessimistic lock + atomic update + audit log
}
```

---

## Key Design Patterns

### 1. Pessimistic Locking
```sql
SELECT ... FOR UPDATE  -- Exclusive row lock
UPDATE ... WHERE ...   -- Atomic update
COMMIT                 -- Release lock
```

### 2. Atomic Operations
```java
// Lock → Read → Calculate → Update → Commit
```

### 3. Constraint Checking
```sql
WHERE current_stock >= quantity  -- Prevent negative stock
```

### 4. Real-Time Updates
```java
Update → Broadcast (WebSocket) → All clients receive → UI update
```

---

## Database Constraints

### Check Constraints
```sql
-- Prevent negative stock
CHECK (current_stock >= 0)

-- Prevent reserved_stock > current_stock
CHECK (current_stock >= reserved_stock)

-- Prevent negative available_stock (computed column)
available_stock = current_stock - reserved_stock (always >= 0)
```

### Update Constraints
```sql
WHERE current_stock >= quantity  -- Prevent negative stock
WHERE reserved_stock >= quantity  -- Prevent over-reservation
```

---

## Service Responsibilities

### InventoryService
- Stock reservation (cart building)
- Stock release (cart cleared)
- Stock deduction (sale)
- Stock return (credit note)
- Stock adjustment (admin)
- Stock availability checks

### WebSocketNotificationService
- Broadcast stock updates
- Broadcast low stock alerts
- Real-time notification to all clients

### LowStockAlertService
- Check low stock products
- Send alerts (real-time + scheduled)
- Notify admin users

---

## Summary

This inventory engine provides:

✅ **Central Stock Ledger**: Single source of truth with complete audit trail  
✅ **Atomic Operations**: Pessimistic locking and database constraints  
✅ **Race Condition Prevention**: SELECT FOR UPDATE, constraints, version field  
✅ **Negative Stock Prevention**: Multi-layer defense (application, database, constraints)  
✅ **Instant Updates**: WebSocket real-time notifications  
✅ **Batch/Serial Tracking**: Optional tracking support  
✅ **Low Stock Alerts**: Real-time and scheduled alerts  
✅ **Admin Adjustments**: Secure adjustment operations with audit trail  
✅ **Complete Audit Trail**: Stock movements record all changes  
✅ **Concurrent Safety**: Handles multiple cashiers safely  

**Status:** ✅ Inventory engine design complete - Ready for implementation

