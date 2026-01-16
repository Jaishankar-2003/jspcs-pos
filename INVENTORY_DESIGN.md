# Inventory & Stock Control Engine Design
## JSPCS POS - Stock Management System

---

## 1. Architecture Overview

### 1.1 Central Stock Ledger

The inventory system uses a **central stock ledger** approach:

```
┌─────────────────────────────────────────────────────────────┐
│              CENTRAL STOCK LEDGER                            │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │   inventory      │      │ stock_movements  │            │
│  │   (Current State)│◄─────┤  (Complete History)           │
│  └──────────────────┘      └──────────────────┘            │
│         │                           │                       │
│         │                           │                       │
│         └───────────┬───────────────┘                       │
│                     │                                       │
│                     ▼                                       │
│         ┌──────────────────────┐                           │
│         │   Single Source of   │                           │
│         │      Truth           │                           │
│         └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- **Single Source of Truth**: `inventory` table holds current stock state
- **Complete Audit Trail**: `stock_movements` table records all changes
- **Atomic Operations**: All stock changes are transactional
- **Real-time Updates**: WebSocket notifications for instant updates

### 1.2 Stock State Model

```
inventory Table (Current State):
├─ product_id (PK)
├─ current_stock (physical stock)
├─ reserved_stock (reserved for carts)
├─ available_stock (computed: current_stock - reserved_stock)
├─ last_movement_at
├─ last_updated_by
└─ version (optimistic locking)

stock_movements Table (Complete History):
├─ id (PK)
├─ product_id
├─ movement_type (IN/OUT/ADJUSTMENT/RETURN/DAMAGE/EXPIRED)
├─ quantity (positive for IN, negative for OUT)
├─ previous_stock (before change)
├─ new_stock (after change)
├─ reference_type (SALE/PURCHASE/MANUAL/etc.)
├─ reference_id (invoice_id, purchase_id, etc.)
├─ reason
└─ created_by, created_at
```

---

## 2. Stock Operations Flow

### 2.1 Stock Reservation (Cart Building)

```
┌─────────────────────────────────────────────────────────────┐
│              STOCK RESERVATION FLOW                          │
└─────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/cart/add-item
    │
    ├─> Request: { productId, quantity: 2 }
    │
    ▼
[CartService] → addItemToCart()
    │
    ├─> 1. Check stock availability
    │   └─> InventoryService.checkAvailability(productId, quantity)
    │       ├─> SELECT available_stock FROM inventory WHERE product_id = ?
    │       └─> IF available_stock < quantity → throw InsufficientStockException
    │
    ├─> 2. Reserve stock (ATOMIC OPERATION)
    │   └─> InventoryService.reserveStock(productId, quantity, cartId)
    │       │
    │       ├─> BEGIN TRANSACTION (REQUIRES_NEW)
    │       │
    │       ├─> SELECT * FROM inventory 
    │       │   WHERE product_id = ? 
    │       │   FOR UPDATE  (PESSIMISTIC LOCK)
    │       │
    │       ├─> Re-check availability (double-check)
    │       │   └─> available_stock = current_stock - reserved_stock
    │       │   └─> IF available_stock < quantity → ROLLBACK, throw exception
    │       │
    │       ├─> UPDATE inventory
    │       │   SET reserved_stock = reserved_stock + quantity,
    │       │       version = version + 1,
    │       │       updated_at = CURRENT_TIMESTAMP
    │       │   WHERE product_id = ?
    │       │     AND current_stock >= reserved_stock + quantity  (CONSTRAINT CHECK)
    │       │
    │       ├─> IF 0 rows updated → ROLLBACK, throw InsufficientStockException
    │       │
    │       └─> COMMIT TRANSACTION
    │
    ├─> 3. Add item to cart
    │   └─> CartService.addItem(product, quantity)
    │
    ├─> 4. Broadcast stock update (WebSocket)
    │   └─> WebSocketNotificationService.broadcastStockUpdate(productId, newStock)
    │
    └─> RETURN CartResponse
```

**Key Features:**
- **Pessimistic Locking**: `SELECT FOR UPDATE` prevents concurrent modifications
- **Double-Check**: Availability checked before and after lock acquisition
- **Constraint Check**: `current_stock >= reserved_stock + quantity` prevents negative available stock
- **Atomic Operation**: Single transaction ensures consistency

### 2.2 Stock Deduction (Sale/Invoice Creation)

```
┌─────────────────────────────────────────────────────────────┐
│              STOCK DEDUCTION FLOW (SALE)                     │
└─────────────────────────────────────────────────────────────┘

[InvoiceService] → createInvoice() [TRANSACTION BOUNDARY]
    │
    ├─> BEGIN TRANSACTION (REPEATABLE_READ isolation)
    │
    ├─> FOR EACH cart item:
    │   │
    │   └─> InventoryService.sellStock(productId, quantity, invoiceId, userId)
    │       │
    │       ├─> BEGIN TRANSACTION (REQUIRES_NEW) - Optional nested transaction
    │       │
    │       ├─> 1. Lock inventory row
    │       │   └─> SELECT * FROM inventory 
    │       │       WHERE product_id = ? 
    │       │       FOR UPDATE
    │       │
    │       ├─> 2. Read current state
    │       │   └─> current_stock, reserved_stock = SELECT FROM inventory
    │       │
    │       ├─> 3. Validate reserved stock
    │       │   └─> IF reserved_stock < quantity → throw InsufficientStockException
    │       │
    │       ├─> 4. Calculate new stock
    │       │   └─> new_current_stock = current_stock - quantity
    │       │   └─> new_reserved_stock = reserved_stock - quantity
    │       │
    │       ├─> 5. Atomic stock update
    │       │   └─> UPDATE inventory
    │       │       SET current_stock = new_current_stock,
    │       │           reserved_stock = new_reserved_stock,
    │       │           version = version + 1,
    │       │           last_movement_at = CURRENT_TIMESTAMP,
    │       │           last_updated_by = ?,
    │       │           updated_at = CURRENT_TIMESTAMP
    │       │       WHERE product_id = ?
    │       │         AND current_stock >= quantity  (PREVENT NEGATIVE STOCK)
    │       │         AND reserved_stock >= quantity  (PREVENT OVER-RESERVATION)
    │       │
    │       ├─> 6. IF 0 rows updated → ROLLBACK, throw exception
    │       │
    │       ├─> 7. Create stock movement record
    │       │   └─> INSERT INTO stock_movements
    │       │       (product_id, movement_type, quantity,
    │       │        previous_stock, new_stock,
    │       │        reference_type, reference_id,
    │       │        created_by, created_at)
    │       │       VALUES (?, 'OUT', quantity,
    │       │              old_current_stock, new_current_stock,
    │       │              'SALE', invoiceId,
    │       │              userId, CURRENT_TIMESTAMP)
    │       │
    │       └─> COMMIT TRANSACTION
    │
    ├─> 8. Create invoice (with items, payments, etc.)
    │
    ├─> 9. Broadcast stock updates (WebSocket)
    │   └─> FOR EACH product:
    │       └─> WebSocketNotificationService.broadcastStockUpdate(productId, newStock)
    │
    └─> COMMIT TRANSACTION (invoice creation)
```

**Key Features:**
- **Atomic Deduction**: Both current_stock and reserved_stock updated in single operation
- **Negative Stock Prevention**: `WHERE current_stock >= quantity` constraint
- **Complete Audit Trail**: Stock movement record created for every change
- **Pessimistic Locking**: Prevents race conditions

### 2.3 Stock Return (Credit Note)

```
┌─────────────────────────────────────────────────────────────┐
│              STOCK RETURN FLOW                               │
└─────────────────────────────────────────────────────────────┘

[ReturnService] → createReturn()
    │
    ├─> FOR EACH return item:
    │   │
    │   └─> InventoryService.returnStock(productId, quantity, creditNoteId, userId)
    │       │
    │       ├─> BEGIN TRANSACTION (REQUIRES_NEW)
    │       │
    │       ├─> 1. Lock inventory row
    │       │   └─> SELECT * FROM inventory WHERE product_id = ? FOR UPDATE
    │       │
    │       ├─> 2. Read current state
    │       │   └─> current_stock = SELECT FROM inventory
    │       │
    │       ├─> 3. Calculate new stock
    │       │   └─> new_current_stock = current_stock + quantity
    │       │
    │       ├─> 4. Update stock
    │       │   └─> UPDATE inventory
    │       │       SET current_stock = current_stock + quantity,
    │       │           version = version + 1,
    │       │           last_movement_at = CURRENT_TIMESTAMP,
    │       │           last_updated_by = ?,
    │       │           updated_at = CURRENT_TIMESTAMP
    │       │       WHERE product_id = ?
    │       │
    │       ├─> 5. Create stock movement
    │       │   └─> INSERT INTO stock_movements
    │       │       (movement_type, quantity, ...)
    │       │       VALUES ('RETURN', quantity, ...)
    │       │
    │       └─> COMMIT TRANSACTION
    │
    └─> Broadcast stock update (WebSocket)
```

### 2.4 Manual Stock Adjustment (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│              MANUAL STOCK ADJUSTMENT FLOW                    │
└─────────────────────────────────────────────────────────────┘

[Admin] → POST /api/admin/inventory/adjust
    │
    ├─> Request: { productId, quantity, type: "ADJUSTMENT", reason }
    │   ├─> quantity > 0: Increase stock (IN)
    │   └─> quantity < 0: Decrease stock (OUT)
    │
    ▼
[InventoryService] → adjustStock() [TRANSACTION]
    │
    ├─> BEGIN TRANSACTION (REPEATABLE_READ)
    │
    ├─> 1. Validate admin permissions
    │   └─> Security: @PreAuthorize("hasRole('ADMIN')")
    │
    ├─> 2. Lock inventory row
    │   └─> SELECT * FROM inventory WHERE product_id = ? FOR UPDATE
    │
    ├─> 3. Read current state
    │   └─> current_stock = SELECT FROM inventory
    │
    ├─> 4. Calculate new stock
    │   └─> IF type = 'ADJUSTMENT' (quantity can be +ve or -ve):
    │       ├─> new_stock = current_stock + quantity
    │       └─> IF new_stock < 0 → throw NegativeStockException
    │   └─> IF type = 'DAMAGE' or 'EXPIRED':
    │       ├─> new_stock = current_stock - quantity (quantity is +ve)
    │       └─> IF new_stock < 0 → throw NegativeStockException
    │
    ├─> 5. Update stock (with negative stock check)
    │   └─> UPDATE inventory
    │       SET current_stock = ?,
    │           version = version + 1,
    │           last_movement_at = CURRENT_TIMESTAMP,
    │           last_updated_by = ?,
    │           updated_at = CURRENT_TIMESTAMP
    │       WHERE product_id = ?
    │         AND (current_stock + ?) >= 0  (PREVENT NEGATIVE)
    │
    ├─> 6. IF 0 rows updated → ROLLBACK, throw NegativeStockException
    │
    ├─> 7. Create stock movement
    │   └─> INSERT INTO stock_movements
    │       (movement_type, quantity, previous_stock, new_stock,
    │        reference_type, reason, created_by)
    │       VALUES (type, ABS(quantity), old_stock, new_stock,
    │              'MANUAL', reason, userId)
    │
    ├─> 8. Create audit log
    │   └─> AuditLogService.log('STOCK_ADJUSTMENT', productId, userId)
    │
    ├─> 9. Broadcast stock update (WebSocket)
    │   └─> WebSocketNotificationService.broadcastStockUpdate(productId, newStock)
    │
    └─> COMMIT TRANSACTION
```

---

## 3. Race Condition Prevention

### 3.1 Pessimistic Locking Strategy

**Problem:**
- Multiple cashiers trying to reserve/deduct stock simultaneously
- Race condition: Both read available stock, both proceed, stock goes negative

**Solution:**
```sql
-- Lock row before read-modify-write
BEGIN TRANSACTION;

SELECT * FROM inventory 
WHERE product_id = ? 
FOR UPDATE;  -- EXCLUSIVE LOCK

-- Now we have exclusive lock, no other transaction can modify this row
-- Read current values
-- Calculate new values
-- Update

UPDATE inventory SET ... WHERE product_id = ?;

COMMIT;  -- Lock released
```

**Key Points:**
- `SELECT FOR UPDATE` acquires exclusive row lock
- Other transactions wait until lock is released
- Ensures sequential execution of stock operations
- Prevents concurrent modifications

### 3.2 Database Constraints

**Check Constraints:**
```sql
-- Prevents negative stock at database level
ALTER TABLE inventory 
ADD CONSTRAINT inventory_stock_check 
CHECK (current_stock >= 0);

-- Prevents reserved_stock > current_stock
ALTER TABLE inventory 
ADD CONSTRAINT inventory_reserved_check 
CHECK (current_stock >= reserved_stock);
```

**Update Constraints:**
```sql
-- Update only if sufficient stock
UPDATE inventory 
SET current_stock = current_stock - quantity
WHERE product_id = ?
  AND current_stock >= quantity;  -- PREVENTS NEGATIVE STOCK

-- Update only if sufficient reserved stock
UPDATE inventory 
SET reserved_stock = reserved_stock - quantity
WHERE product_id = ?
  AND reserved_stock >= quantity;  -- PREVENTS OVER-RESERVATION
```

**Result:**
- If insufficient stock, UPDATE affects 0 rows
- Application can detect failure and throw exception
- Database enforces business rules

### 3.3 Optimistic Locking (Version Field)

**Additional Protection:**
```sql
-- Version field for optimistic locking
UPDATE inventory 
SET current_stock = ?,
    version = version + 1
WHERE product_id = ?
  AND version = ?;  -- Check version hasn't changed

-- If version changed, UPDATE affects 0 rows
-- Indicates concurrent modification
```

**Use Cases:**
- Non-critical updates (product price, description)
- Stock queries (read-only operations)
- Secondary validation layer

### 3.4 Transaction Isolation Levels

**Stock Operations:**
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,  // Prevent phantom reads
    propagation = Propagation.REQUIRES_NEW   // Independent transaction
)
public void reserveStock(UUID productId, Integer quantity, UUID reservationId) {
    // Pessimistic lock + constraint check
}
```

**Isolation Levels:**
- **REPEATABLE_READ**: Prevents phantom reads, ensures consistency
- **REQUIRES_NEW**: Independent transaction, can rollback without affecting parent
- **READ_COMMITTED**: Default for non-critical operations

### 3.5 Atomic Operations Pattern

**Pattern:**
```java
// 1. Lock row
SELECT ... FOR UPDATE

// 2. Read current state (while locked)
current_stock, reserved_stock = SELECT ...

// 3. Calculate new state
new_stock = current_stock - quantity

// 4. Validate (before update)
IF new_stock < 0 THEN throw exception

// 5. Update atomically (with constraint)
UPDATE ... WHERE current_stock >= quantity

// 6. Check result
IF rows_affected == 0 THEN throw exception

// 7. Create audit record
INSERT INTO stock_movements ...

// 8. Commit (release lock)
COMMIT
```

**Benefits:**
- Atomic read-modify-write operation
- Lock held for minimal time
- Constraint check prevents negative stock
- Complete audit trail

---

## 4. Negative Stock Prevention

### 4.1 Multi-Layer Defense

```
┌─────────────────────────────────────────────────────────────┐
│         NEGATIVE STOCK PREVENTION - DEFENSE LAYERS          │
└─────────────────────────────────────────────────────────────┘

Layer 1: Application-Level Validation
  ├─> Check availability before operation
  ├─> Validate quantity > 0
  └─> Business rule validation

Layer 2: Pessimistic Locking
  ├─> SELECT FOR UPDATE (exclusive lock)
  ├─> Double-check after lock acquisition
  └─> Sequential execution guarantee

Layer 3: Database Constraints (Check Constraints)
  ├─> CHECK (current_stock >= 0)
  ├─> CHECK (current_stock >= reserved_stock)
  └─> Database-level enforcement

Layer 4: Update Constraints (WHERE Clause)
  ├─> WHERE current_stock >= quantity
  ├─> WHERE reserved_stock >= quantity
  └─> Conditional update (0 rows if constraint fails)

Layer 5: Stock Movement Validation
  ├─> Validate previous_stock + quantity = new_stock
  ├─> Validate new_stock >= 0
  └─> Audit trail validation
```

### 4.2 Implementation Examples

#### Example 1: Stock Deduction (Sale)
```sql
-- Step 1: Lock row
BEGIN TRANSACTION;
SELECT * FROM inventory WHERE product_id = ? FOR UPDATE;

-- Step 2: Read current state
current_stock = 10, reserved_stock = 2

-- Step 3: Calculate new state
quantity = 3
new_current_stock = 10 - 3 = 7
new_reserved_stock = 2 - 3 = -1  ❌ INVALID!

-- Step 4: Validate (application level)
IF reserved_stock < quantity THEN throw exception

-- Step 5: Update (database constraint)
UPDATE inventory 
SET current_stock = current_stock - quantity,
    reserved_stock = reserved_stock - quantity
WHERE product_id = ?
  AND current_stock >= quantity  -- Prevents negative current_stock
  AND reserved_stock >= quantity;  -- Prevents negative reserved_stock

-- Result: 0 rows updated (constraint failed)
-- Exception thrown, transaction rolled back
```

#### Example 2: Stock Adjustment (Admin)
```sql
-- Step 1: Lock row
BEGIN TRANSACTION;
SELECT * FROM inventory WHERE product_id = ? FOR UPDATE;

-- Step 2: Read current state
current_stock = 5

-- Step 3: Calculate new state
quantity = -10 (decrease by 10)
new_stock = 5 + (-10) = -5  ❌ INVALID!

-- Step 4: Validate (application level)
IF (current_stock + quantity) < 0 THEN throw exception

-- Step 5: Update (database constraint)
UPDATE inventory 
SET current_stock = current_stock + ?
WHERE product_id = ?
  AND (current_stock + ?) >= 0;  -- Prevents negative stock

-- Result: 0 rows updated (constraint failed)
-- Exception thrown, transaction rolled back
```

### 4.3 Database Schema Constraints

```sql
-- Check constraint: Prevent negative stock
ALTER TABLE inventory 
ADD CONSTRAINT inventory_stock_check 
CHECK (current_stock >= 0);

-- Check constraint: Prevent reserved_stock > current_stock
ALTER TABLE inventory 
ADD CONSTRAINT inventory_reserved_check 
CHECK (current_stock >= reserved_stock);

-- Check constraint: Prevent negative available_stock (computed column already handles this)
-- available_stock = current_stock - reserved_stock (always >= 0 if constraints satisfied)
```

### 4.4 Application-Level Validation

```java
public void sellStock(UUID productId, Integer quantity, UUID invoiceId, UUID userId) {
    // Lock row
    Inventory inventory = inventoryRepository.findByIdForUpdate(productId)
        .orElseThrow(...);
    
    // Application-level validation
    if (inventory.getCurrentStock() < quantity) {
        throw new InsufficientStockException(
            "Insufficient stock. Available: " + inventory.getCurrentStock() + 
            ", Required: " + quantity
        );
    }
    
    if (inventory.getReservedStock() < quantity) {
        throw new InsufficientStockException(
            "Insufficient reserved stock. Reserved: " + inventory.getReservedStock() + 
            ", Required: " + quantity
        );
    }
    
    // Calculate new stock
    int newCurrentStock = inventory.getCurrentStock() - quantity;
    int newReservedStock = inventory.getReservedStock() - quantity;
    
    // Application-level validation
    if (newCurrentStock < 0) {
        throw new NegativeStockException("Stock cannot be negative");
    }
    
    if (newReservedStock < 0) {
        throw new NegativeStockException("Reserved stock cannot be negative");
    }
    
    // Database-level update (with constraint)
    int rowsUpdated = inventoryRepository.updateStock(
        productId, 
        -quantity,  // negative for deduction
        -quantity,  // negative for reserved deduction
        inventory.getVersion()
    );
    
    if (rowsUpdated == 0) {
        throw new ConcurrentModificationException("Stock was modified concurrently");
    }
    
    // Create stock movement
    createStockMovement(productId, quantity, 'OUT', invoiceId, userId);
}
```

---

## 5. Instant Updates on Cashier Terminals (WebSocket)

### 5.1 Real-Time Update Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME UPDATE FLOW                           │
└─────────────────────────────────────────────────────────────┘

[Stock Operation] → InventoryService
    │
    ├─> 1. Perform stock operation (reserve, deduct, adjust, etc.)
    │   └─> UPDATE inventory table
    │
    ├─> 2. After successful operation
    │   └─> WebSocketNotificationService.broadcastStockUpdate(productId, newStock)
    │       │
    │       ├─> Load updated inventory state
    │       │   └─> Inventory inventory = inventoryRepository.findById(productId)
    │       │
    │       ├─> Create StockUpdateMessage
    │       │   └─> {
    │       │       "type": "STOCK_UPDATE",
    │       │       "productId": "...",
    │       │       "currentStock": 10,
    │       │       "reservedStock": 2,
    │       │       "availableStock": 8,
    │       │       "timestamp": "2024-01-01T10:00:00Z"
    │       │     }
    │       │
    │       └─> Broadcast to all connected clients
    │           └─> webSocketTemplate.convertAndSend("/topic/stock-updates", message)
    │
    └─> 3. All cashier terminals receive update
        └─> Frontend updates UI (real-time)
```

### 5.2 WebSocket Configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for topics
        config.enableSimpleBroker("/topic");
        // Prefix for client destinations
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Configure for LAN in production
                .withSockJS();  // Fallback for browsers that don't support WebSocket
    }
}
```

### 5.3 Stock Update Service

```java
@Service
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final InventoryRepository inventoryRepository;

    /**
     * Broadcast stock update to all connected clients
     */
    public void broadcastStockUpdate(UUID productId, Integer newStock) {
        // Load current inventory state
        Inventory inventory = inventoryRepository.findById(productId)
            .orElse(null);
        
        if (inventory == null) {
            return;
        }
        
        // Create stock update message
        StockUpdateMessage message = StockUpdateMessage.builder()
            .type("STOCK_UPDATE")
            .productId(productId)
            .currentStock(inventory.getCurrentStock())
            .reservedStock(inventory.getReservedStock())
            .availableStock(inventory.getAvailableStock())
            .timestamp(Instant.now())
            .build();
        
        // Broadcast to all clients subscribed to /topic/stock-updates
        messagingTemplate.convertAndSend("/topic/stock-updates", message);
        
        // Also send product-specific update
        messagingTemplate.convertAndSend("/topic/stock-updates/" + productId, message);
    }

    /**
     * Broadcast low stock alert
     */
    public void broadcastLowStockAlert(UUID productId, Integer currentStock, Integer threshold) {
        LowStockAlert alert = LowStockAlert.builder()
            .type("LOW_STOCK_ALERT")
            .productId(productId)
            .currentStock(currentStock)
            .threshold(threshold)
            .timestamp(Instant.now())
            .build();
        
        // Broadcast to admin clients only
        messagingTemplate.convertAndSend("/topic/admin/low-stock-alerts", alert);
    }
}
```

### 5.4 Frontend Integration (React Example)

```javascript
// WebSocket connection setup
const ws = new SockJS('http://server-ip:8080/ws');
const stompClient = Stomp.over(ws);

// Connect
stompClient.connect({}, () => {
    // Subscribe to stock updates
    stompClient.subscribe('/topic/stock-updates', (message) => {
        const stockUpdate = JSON.parse(message.body);
        updateProductStock(stockUpdate.productId, stockUpdate);
    });
    
    // Subscribe to product-specific updates
    stompClient.subscribe(`/topic/stock-updates/${productId}`, (message) => {
        const stockUpdate = JSON.parse(message.body);
        updateProductStock(productId, stockUpdate);
    });
});

// Update UI
function updateProductStock(productId, stockUpdate) {
    setProducts(prevProducts => 
        prevProducts.map(product => 
            product.id === productId
                ? {
                    ...product,
                    currentStock: stockUpdate.currentStock,
                    reservedStock: stockUpdate.reservedStock,
                    availableStock: stockUpdate.availableStock,
                    lastUpdated: stockUpdate.timestamp
                }
                : product
        )
    );
}
```

### 5.5 Update Triggers

**Stock updates are broadcast when:**
1. Stock reserved (cart item added)
2. Stock deducted (invoice created)
3. Stock returned (credit note created)
4. Stock adjusted (admin adjustment)
5. Stock damaged/expired (admin operation)

**Update Message Format:**
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

---

## 6. Batch / Serial Tracking (Optional)

### 6.1 Design Overview

**Optional Feature:** Track individual units by batch number or serial number

**Tables:**
```sql
-- Batch tracking (optional)
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expiry_date DATE,
    mfg_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_batches_unique UNIQUE (product_id, batch_number)
);

-- Serial number tracking (optional)
CREATE TABLE product_serials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RETURNED')),
    sold_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    returned_credit_note_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_serials_unique UNIQUE (product_id, serial_number)
);
```

### 6.2 Batch Tracking Flow

```java
@Service
public class BatchTrackingService {

    /**
     * Allocate stock by batch (FIFO - First In First Out)
     */
    public List<BatchAllocation> allocateStockByBatch(
            UUID productId, 
            Integer quantity) {
        
        // Get batches ordered by expiry date (FIFO)
        List<ProductBatch> batches = batchRepository
            .findByProductIdOrderByExpiryDateAsc(productId);
        
        List<BatchAllocation> allocations = new ArrayList<>();
        int remainingQuantity = quantity;
        
        for (ProductBatch batch : batches) {
            if (remainingQuantity <= 0) break;
            
            int allocated = Math.min(remainingQuantity, batch.getQuantity());
            allocations.add(new BatchAllocation(batch.getId(), allocated));
            remainingQuantity -= allocated;
        }
        
        if (remainingQuantity > 0) {
            throw new InsufficientStockException("Insufficient stock in batches");
        }
        
        return allocations;
    }
}
```

### 6.3 Serial Number Tracking Flow

```java
@Service
public class SerialTrackingService {

    /**
     * Allocate stock by serial numbers
     */
    public List<String> allocateSerialNumbers(
            UUID productId, 
            List<String> serialNumbers) {
        
        // Validate serial numbers exist and are available
        List<ProductSerial> serials = serialRepository
            .findByProductIdAndSerialNumberIn(productId, serialNumbers);
        
        if (serials.size() != serialNumbers.size()) {
            throw new InvalidSerialNumberException("Some serial numbers not found");
        }
        
        for (ProductSerial serial : serials) {
            if (serial.getStatus() != SerialStatus.AVAILABLE) {
                throw new SerialNumberNotAvailableException(
                    "Serial number " + serial.getSerialNumber() + " is not available"
                );
            }
        }
        
        // Mark serials as sold
        serials.forEach(serial -> {
            serial.setStatus(SerialStatus.SOLD);
            serial.setSoldInvoiceId(invoiceId);
        });
        
        serialRepository.saveAll(serials);
        
        return serials.stream()
            .map(ProductSerial::getSerialNumber)
            .collect(Collectors.toList());
    }
}
```

---

## 7. Low Stock Alerts

### 7.1 Alert Configuration

**Product-Level Threshold:**
```sql
-- Products table has low_stock_threshold field
ALTER TABLE products 
ADD COLUMN low_stock_threshold INTEGER DEFAULT 10 
CHECK (low_stock_threshold >= 0);
```

### 7.2 Alert Detection

```java
@Service
public class LowStockAlertService {

    /**
     * Check and alert low stock products
     */
    public void checkLowStockAlerts() {
        // Find products with stock below threshold
        List<Product> lowStockProducts = productRepository
            .findLowStockProducts();
        
        for (Product product : lowStockProducts) {
            Inventory inventory = inventoryRepository
                .findById(product.getId())
                .orElse(null);
            
            if (inventory != null && 
                inventory.getAvailableStock() <= product.getLowStockThreshold()) {
                
                // Send alert
                webSocketNotificationService.broadcastLowStockAlert(
                    product.getId(),
                    inventory.getAvailableStock(),
                    product.getLowStockThreshold()
                );
                
                // Optional: Send email/notification to admin
                notificationService.sendLowStockEmail(product, inventory);
            }
        }
    }

    /**
     * Scheduled job: Check low stock every hour
     */
    @Scheduled(cron = "0 0 * * * *")  // Every hour
    public void scheduledLowStockCheck() {
        checkLowStockAlerts();
    }
}
```

### 7.3 Real-Time Alert on Stock Update

```java
@Service
public class InventoryService {

    public void sellStock(...) {
        // ... stock deduction logic ...
        
        // Check if stock went below threshold
        if (inventory.getAvailableStock() <= product.getLowStockThreshold()) {
            webSocketNotificationService.broadcastLowStockAlert(
                productId,
                inventory.getAvailableStock(),
                product.getLowStockThreshold()
            );
        }
    }
}
```

---

## 8. Admin Stock Adjustment Logic

### 8.1 Adjustment Types

**Movement Types:**
- `ADJUSTMENT`: Manual correction (increase/decrease)
- `DAMAGE`: Damage write-off (decrease only)
- `EXPIRED`: Expiry write-off (decrease only)
- `PURCHASE`: Stock purchase (increase)
- `RETURN`: Customer return (increase)

### 8.2 Adjustment Flow

```java
@Service
@PreAuthorize("hasRole('ADMIN')")  // Admin only
public class InventoryAdjustmentService {

    /**
     * Manual stock adjustment
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public AdjustmentResponse adjustStock(AdjustmentRequest request) {
        
        // 1. Validate admin permissions (handled by @PreAuthorize)
        
        // 2. Lock inventory row
        Inventory inventory = inventoryRepository
            .findByIdForUpdate(request.getProductId())
            .orElseThrow(() -> new EntityNotFoundException("Product", request.getProductId()));
        
        // 3. Calculate new stock
        int currentStock = inventory.getCurrentStock();
        int adjustmentQuantity = request.getQuantity();
        int newStock;
        
        switch (request.getAdjustmentType()) {
            case ADJUSTMENT:
                // Can be positive or negative
                newStock = currentStock + adjustmentQuantity;
                break;
            case DAMAGE:
            case EXPIRED:
                // Only decrease (quantity is positive)
                newStock = currentStock - Math.abs(adjustmentQuantity);
                break;
            case PURCHASE:
                // Only increase
                newStock = currentStock + Math.abs(adjustmentQuantity);
                break;
            default:
                throw new IllegalArgumentException("Invalid adjustment type");
        }
        
        // 4. Validate new stock
        if (newStock < 0) {
            throw new NegativeStockException(
                "Adjustment would result in negative stock. Current: " + currentStock + 
                ", Adjustment: " + adjustmentQuantity
            );
        }
        
        // 5. Update stock (with constraint check)
        int rowsUpdated = inventoryRepository.updateStock(
            request.getProductId(),
            adjustmentQuantity,
            inventory.getVersion()
        );
        
        if (rowsUpdated == 0) {
            throw new ConcurrentModificationException("Stock was modified concurrently");
        }
        
        // 6. Create stock movement
        StockMovement movement = new StockMovement();
        movement.setProductId(request.getProductId());
        movement.setMovementType(request.getAdjustmentType());
        movement.setQuantity(Math.abs(adjustmentQuantity));
        movement.setPreviousStock(currentStock);
        movement.setNewStock(newStock);
        movement.setReferenceType("MANUAL");
        movement.setReason(request.getReason());
        movement.setCreatedBy(getCurrentUserId());
        stockMovementRepository.save(movement);
        
        // 7. Create audit log
        auditLogService.log(
            "STOCK_ADJUSTMENT",
            request.getProductId(),
            getCurrentUserId(),
            Map.of(
                "type", request.getAdjustmentType(),
                "quantity", adjustmentQuantity,
                "reason", request.getReason()
            )
        );
        
        // 8. Broadcast update
        webSocketNotificationService.broadcastStockUpdate(
            request.getProductId(),
            newStock
        );
        
        // 9. Check low stock alert
        Product product = productRepository.findById(request.getProductId())
            .orElse(null);
        if (product != null && newStock <= product.getLowStockThreshold()) {
            webSocketNotificationService.broadcastLowStockAlert(
                request.getProductId(),
                newStock,
                product.getLowStockThreshold()
            );
        }
        
        return AdjustmentResponse.builder()
            .productId(request.getProductId())
            .previousStock(currentStock)
            .newStock(newStock)
            .adjustmentQuantity(adjustmentQuantity)
            .adjustmentType(request.getAdjustmentType())
            .build();
    }
}
```

---

## Summary

This inventory and stock control engine provides:

✅ **Central Stock Ledger**: Single source of truth with complete audit trail  
✅ **Atomic Operations**: Pessimistic locking and database constraints  
✅ **Race Condition Prevention**: SELECT FOR UPDATE, constraints, optimistic locking  
✅ **Negative Stock Prevention**: Multi-layer defense (application, database, constraints)  
✅ **Instant Updates**: WebSocket real-time notifications  
✅ **Batch/Serial Tracking**: Optional tracking support  
✅ **Low Stock Alerts**: Real-time and scheduled alerts  
✅ **Admin Adjustments**: Secure adjustment operations with audit trail  

**Status:** ✅ Inventory engine design complete - Ready for implementation

