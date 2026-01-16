# Billing Engine Summary
## JSPCS POS - Quick Reference Guide

---

## Flow Diagrams Overview

### 1. Barcode Billing
```
Client → POST /api/cashier/cart/add-item
  → CartController → CartService.addItemToCart()
  → Find product by barcode
  → Check stock availability
  → Reserve stock (pessimistic lock)
  → Add to cart
  → Return CartResponse
```

### 2. Manual Product Entry
```
Client → POST /api/cashier/cart/add-item-manual
  → CartController → CartService.addItemManual()
  → Search products (name/SKU)
  → IF multiple → return list for selection
  → IF single → add to cart
  → Log manual entry
  → Return CartResponse or ProductSearchResponse
```

### 3. Invoice Creation
```
Client → POST /api/cashier/invoices/create
  → InvoiceController → InvoiceService.createInvoice() [TRANSACTION]
  → Generate invoice number
  → Validate cart items (stock)
  → Create invoice header
  → Process cart items:
    ├─> Create invoice items (snapshot)
    ├─> Deduct stock (convert reservation)
    ├─> Create stock movements
  → Calculate totals & GST
  → Create GST tax details
  → Process payment
  → Save invoice
  → Clear cart
  → Return InvoiceResponse
```

### 4. GST Calculation
```
InvoiceCalculationService.calculateGst()
  → Determine tax type (CGST/SGST or IGST) from customer GSTIN
  → Group items by GST rate
  → FOR EACH GST rate:
    ├─> Calculate taxable amount
    ├─> IF same state: CGST = SGST = (taxable * rate / 2)
    └─> IF different state: IGST = taxable * rate
  → Create GST tax details
  → Sum all taxes
```

### 5. Discounts
```
Item-Level:
  → PUT /api/cashier/cart/items/{itemId}/discount
  → Apply discount to line item
  → Recalculate line total

Invoice-Level:
  → PUT /api/cashier/cart/discount
  → Apply discount to subtotal
  → Applied during invoice creation
```

### 6. Hold/Resume Bill
```
Hold:
  → POST /api/cashier/cart/hold
  → Mark cart as held
  → Keep stock reserved
  → Create hold record

Resume:
  → POST /api/cashier/cart/resume
  → Validate hold (24 hour expiry)
  → Reactivate cart
  → Stock remains reserved
```

### 7. Returns & Credit Notes
```
Return:
  → POST /api/cashier/returns/create
  → Validate return items
  → Calculate return amounts (proportional)
  → Create credit note (negative invoice)
  → Reverse stock (add back)
  → Create refund payment
  → Update original invoice
  → Return CreditNoteResponse
```

---

## Service-Layer Responsibilities

### CartService
- Cart management (create, update, delete)
- Add items (barcode/manual)
- Remove items, update quantities
- Apply discounts (item/invoice level)
- Hold/resume cart
- Stock reservation

### InvoiceService
- Invoice creation
- Invoice retrieval
- Invoice cancellation
- Invoice validation
- Invoice number generation
- Stock deduction

### InvoiceCalculationService
- Calculate invoice totals
- Calculate GST (CGST/SGST/IGST)
- Calculate discounts
- Calculate line totals
- Round-off calculation

### PaymentService
- Process payments (single/multi-mode)
- Payment validation
- Payment status updates
- Refund processing

### ReturnService
- Process returns
- Create credit notes
- Calculate return amounts
- Reverse stock
- Refund processing

### InventoryService
- Stock reservation
- Stock release
- Stock deduction (sale)
- Stock return (reverse)
- Stock availability checks

---

## Transaction Boundaries

### Invoice Creation
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    timeout = 30
)
```
**Scope:** Invoice + Items + Stock + Payments  
**Isolation:** REPEATABLE_READ (prevent phantom reads)

### Stock Reservation
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    propagation = Propagation.REQUIRES_NEW
)
```
**Scope:** Stock lock + Reservation update  
**Propagation:** REQUIRES_NEW (independent transaction)

### Return/Credit Note
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    timeout = 30
)
```
**Scope:** Credit Note + Items + Stock Return + Refund

### Cart Hold
```java
@Transactional(
    isolation = Isolation.READ_COMMITTED
)
```
**Scope:** Cart hold record + Status update  
**Note:** Stock remains reserved

---

## Crash Recovery Strategy

### Scenario 1: Crash During Cart Building
**State:** Cart items exist, stock reserved, no invoice  
**Recovery:**
- Scheduled job (every 5 minutes)
- Find expired carts (> 30 minutes)
- Release reserved stock
- Clear cart

### Scenario 2: Crash During Invoice Creation
**State:** Transaction mid-way  
**Recovery:**
- Database ACID: Transaction rolled back
- Stock remains reserved
- Cart intact
- User can retry

### Scenario 3: Crash After Invoice Creation
**State:** Invoice saved, stock deducted, stock movement may be missing  
**Recovery:**
- Scheduled job (daily)
- Find invoices without stock movements
- Create missing stock movements
- Verify consistency

### Scenario 4: Crash During Stock Reservation
**State:** Reservation transaction incomplete  
**Recovery:**
- Database ACID: Transaction rolled back
- No reservation
- Cart state consistent
- User can retry

### Recovery Mechanisms

#### Scheduled Jobs
```java
@Scheduled(cron = "0 */5 * * * *")  // Every 5 minutes
cleanupExpiredCarts()

@Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
cleanupExpiredHolds()

@Scheduled(cron = "0 0 3 * * *")  // 3 AM daily
recoverMissingData()
```

#### Database Integrity
- Foreign key constraints
- Check constraints
- Unique constraints
- PostgreSQL WAL (Write-Ahead Logging)

#### Audit Trail
- Audit logs (all operations)
- Stock movements (complete history)
- Transaction logs (PostgreSQL WAL)

---

## Key Design Decisions

### Stock Management
- **Reservation:** Pessimistic lock (SELECT FOR UPDATE)
- **Deduction:** During invoice creation (convert reservation)
- **Return:** Add back to inventory
- **Concurrency:** Optimistic locking (version field)

### Invoice Number Generation
- **Pattern:** "INV-YYYYMMDD-0000001"
- **Method:** Database sequence (thread-safe)
- **Format:** Year + Month + Day + Sequential number

### GST Calculation
- **CGST/SGST:** Same state (split GST rate / 2)
- **IGST:** Different state (full GST rate)
- **Grouping:** By GST rate for reporting
- **Storage:** gst_tax_details table (per rate group)

### Discounts
- **Item-Level:** Applied to line item
- **Invoice-Level:** Applied to subtotal
- **Calculation:** Percentage or fixed amount
- **Validation:** Discount <= line_total/subtotal

### Credit Notes
- **Pattern:** Negative invoice
- **Numbering:** "CN-YYYYMMDD-0000001"
- **Amounts:** Negative values
- **Link:** original_invoice_id

---

## API Endpoints Summary

### Cart Management
```
POST   /api/cashier/cart                    - Create cart
POST   /api/cashier/cart/add-item           - Add item (barcode)
POST   /api/cashier/cart/add-item-manual    - Add item (manual)
PUT    /api/cashier/cart/items/{itemId}     - Update quantity
DELETE /api/cashier/cart/items/{itemId}     - Remove item
PUT    /api/cashier/cart/items/{itemId}/discount - Apply item discount
PUT    /api/cashier/cart/discount           - Apply invoice discount
POST   /api/cashier/cart/hold               - Hold cart
POST   /api/cashier/cart/resume             - Resume cart
GET    /api/cashier/cart                    - Get cart
```

### Invoice Management
```
POST   /api/cashier/invoices                - Create invoice
GET    /api/cashier/invoices/{id}           - Get invoice
GET    /api/cashier/invoices/number/{number} - Get by number
POST   /api/cashier/invoices/{id}/cancel    - Cancel invoice
GET    /api/cashier/invoices                - List invoices
```

### Payment Management
```
POST   /api/cashier/payments                - Process payment
POST   /api/cashier/payments/multi-mode     - Multi-mode payment
GET    /api/cashier/payments/invoice/{id}   - Get invoice payments
```

### Returns
```
POST   /api/cashier/returns                 - Create return
GET    /api/cashier/returns/{id}            - Get credit note
GET    /api/cashier/returns                 - List returns
```

---

## Data Flow Summary

### Invoice Creation Flow
```
1. Client → Cart → Invoice Request
2. Validate cart (not empty, stock available)
3. Generate invoice number
4. Create invoice header
5. FOR EACH cart item:
   ├─> Create invoice item (snapshot)
   ├─> Deduct stock
   └─> Create stock movement
6. Calculate totals & GST
7. Create GST tax details
8. Process payment
9. Save invoice (cascade: items, taxes, payments)
10. Clear cart
11. Return invoice response
```

### Stock Flow
```
Cart Building:
  Reserve Stock → inventory.reserved_stock++

Invoice Creation:
  Sell Stock → inventory.current_stock--, reserved_stock--
  Create StockMovement (OUT)

Return:
  Return Stock → inventory.current_stock++
  Create StockMovement (RETURN)
```

### Payment Flow
```
Single Payment:
  Create Payment → Update invoice.payment_status

Multi-Mode Payment:
  Create Multiple Payments → Sum amounts → Update status
```

---

## Error Handling

### Common Exceptions
- `EmptyCartException` - Cart is empty
- `ProductNotFoundException` - Product not found
- `InsufficientStockException` - Stock not available
- `InvalidDiscountException` - Discount exceeds amount
- `CartHoldExpiredException` - Hold expired (> 24 hours)
- `InvalidInvoiceException` - Invoice invalid for operation
- `InvalidQuantityException` - Return quantity exceeds sold

### Exception Handling Strategy
- Service layer throws business exceptions
- Controller layer doesn't catch (propagate to GlobalExceptionHandler)
- Global handler formats error responses
- HTTP status codes:
  - 400: Validation errors
  - 404: Not found
  - 409: Concurrency conflicts
  - 422: Business rule violations

---

## Performance Considerations

### Optimization Strategies
- **Stock Reservation:** Pessimistic lock (minimize lock time)
- **Invoice Creation:** Single transaction (ensure atomicity)
- **GST Calculation:** Group by rate (reduce iterations)
- **Cart Storage:** In-memory with periodic persistence (optional)

### Caching
- Product catalog (cache active products)
- GST rates (cache for calculations)
- Counter information (cache for invoice creation)

### Database Optimization
- Indexes on foreign keys
- Indexes on invoice_number, invoice_date
- Partitioning (future: by date for large volumes)

---

## Security Considerations

### Authorization
- **Cart Operations:** CASHIER or ADMIN
- **Invoice Creation:** CASHIER or ADMIN
- **Returns:** CASHIER or ADMIN
- **Reports:** ADMIN only

### Audit Trail
- All invoice operations logged
- Stock movements tracked
- Payment transactions logged
- Return operations logged

### Data Integrity
- Foreign key constraints
- Check constraints (amounts >= 0)
- Unique constraints (invoice numbers)
- Transaction boundaries (ACID compliance)

---

## Testing Strategy

### Unit Tests
- InvoiceCalculationService (GST calculations)
- DiscountService (discount calculations)
- CartService (cart operations)

### Integration Tests
- Invoice creation end-to-end
- Stock reservation and deduction
- Return processing
- Payment processing

### Test Scenarios
- Normal invoice creation
- Insufficient stock scenarios
- Multi-mode payment
- Partial returns
- Concurrent cart operations
- Crash recovery scenarios

---

## Summary

This billing engine provides:

✅ **Complete Billing Flow:** Barcode and manual entry  
✅ **Invoice Management:** Creation, validation, cancellation  
✅ **GST Calculation:** CGST/SGST/IGST support  
✅ **Discounts:** Item and invoice level  
✅ **Hold/Resume:** Cart hold with stock reservation  
✅ **Returns:** Complete return and credit note processing  
✅ **Transaction Management:** Appropriate boundaries and isolation  
✅ **Crash Recovery:** Comprehensive recovery strategies  
✅ **Performance:** Optimized for concurrent operations  
✅ **Security:** Authorization and audit trail  

**Status:** ✅ Billing engine design complete - Ready for implementation

