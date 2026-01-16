# Billing Engine Design
## JSPCS POS - Sales & Invoice Processing System

---

## 1. Text-Based Flow Diagrams

### 1.1 Barcode Billing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BARCODE BILLING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/cart/add-item
    │
    ├─> Request: { barcode: "1234567890123", quantity: 2 }
    │
    ▼
[CartController] → validateRequest()
    │
    ├─> Validate: barcode not empty, quantity > 0
    │
    ▼
[CartService] → addItemToCart()
    │
    ├─> 1. Find product by barcode
    │   └─> ProductRepository.findByBarcode(barcode)
    │       ├─> IF NOT FOUND → throw ProductNotFoundException
    │       └─> IF FOUND → continue
    │
    ├─> 2. Check product is active
    │   └─> IF product.deleted_at IS NOT NULL → throw ProductNotAvailableException
    │   └─> IF product.is_active = FALSE → throw ProductNotAvailableException
    │
    ├─> 3. Check stock availability
    │   └─> InventoryRepository.findByProductId(product.id)
    │       └─> IF available_stock < quantity → throw InsufficientStockException
    │
    ├─> 4. Reserve stock (if not already reserved)
    │   └─> InventoryService.reserveStock(productId, quantity, cartId)
    │       ├─> BEGIN TRANSACTION
    │       ├─> SELECT FOR UPDATE (pessimistic lock)
    │       ├─> UPDATE inventory SET reserved_stock = reserved_stock + quantity
    │       │   WHERE available_stock >= quantity
    │       ├─> IF 0 rows updated → throw InsufficientStockException
    │       └─> COMMIT
    │
    ├─> 5. Add item to cart (in-memory or database)
    │   └─> CartService.addItem(product, quantity)
    │       ├─> IF item exists in cart → increment quantity
    │       └─> ELSE → add new item
    │
    ├─> 6. Calculate line totals
    │   └─> calculateLineTotals(cartItem)
    │
    ├─> 7. Broadcast cart update (WebSocket)
    │   └─> WebSocketNotificationService.broadcastCartUpdate(counterId, cart)
    │
    └─> RETURN CartResponse (updated cart with all items)
```

### 1.2 Manual Product Entry Flow (No Barcode)

```
┌─────────────────────────────────────────────────────────────────┐
│              MANUAL PRODUCT ENTRY FLOW                          │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/cart/add-item-manual
    │
    ├─> Request: { searchTerm: "Coca Cola 500ml", quantity: 1 }
    │
    ▼
[CartController] → addItemManual()
    │
    ├─> Validate: searchTerm not empty, quantity > 0
    │
    ▼
[CartService] → addItemManual()
    │
    ├─> 1. Search products by name/SKU
    │   └─> ProductRepository.searchProducts(searchTerm)
    │       ├─> Search by: name ILIKE '%searchTerm%'
    │       ├─> Search by: sku ILIKE '%searchTerm%'
    │       └─> Return: List<Product> (max 20 results)
    │
    ├─> 2. IF multiple results → return product list
    │   └─> RETURN ProductSearchResponse (list of matching products)
    │   └─> Client selects product → proceed to step 3
    │
    ├─> 3. IF single result → add to cart
    │   └─> Product selected → proceed to addItemToCart()
    │
    ├─> 4. Log manual entry
    │   └─> ManualEntryLogService.log(searchTerm, productId, action)
    │       ├─> IF action = 'SEARCH' → log search
    │       ├─> IF action = 'SELECT' → log selection
    │       └─> Save to manual_entry_logs table
    │
    ├─> 5. Continue with barcode flow (from step 3)
    │   └─> Call addItemToCart(productId, quantity)
    │
    └─> RETURN CartResponse or ProductSearchResponse
```

### 1.3 Invoice Creation Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│              INVOICE CREATION LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/invoices/create
    │
    ├─> Request: { cartId, customerInfo?, paymentMode, discount? }
    │
    ▼
[InvoiceController] → createInvoice()
    │
    ├─> Validate: cartId, paymentMode
    │
    ▼
[InvoiceService] → createInvoice() [TRANSACTION BOUNDARY]
    │
    ├─> BEGIN TRANSACTION (REPEATABLE_READ isolation)
    │
    ├─> 1. Load cart
    │   └─> CartService.getCart(cartId)
    │       └─> IF cart is empty → throw EmptyCartException
    │
    ├─> 2. Generate invoice number
    │   └─> InvoiceNumberGenerator.generateNext()
    │       ├─> Use sequence: invoice_number_seq
    │       └─> Format: "INV-YYYYMMDD-0000001"
    │
    ├─> 3. Validate all cart items (stock still available)
    │   └─> FOR EACH cartItem:
    │       ├─> Check stock availability
    │       ├─> IF insufficient → throw InsufficientStockException
    │       └─> Continue validation
    │
    ├─> 4. Create invoice header
    │   └─> SalesInvoice invoice = new SalesInvoice()
    │       ├─> invoice_number = generated number
    │       ├─> invoice_date = CURRENT_DATE
    │       ├─> invoice_time = CURRENT_TIME
    │       ├─> cashier_id = currentUser.id
    │       ├─> counter_id = currentCounter.id
    │       ├─> customer_name, phone, email, gstin (if provided)
    │       ├─> payment_status = 'PENDING'
    │       └─> is_cancelled = FALSE
    │
    ├─> 5. Process cart items
    │   └─> FOR EACH cartItem:
    │       ├─> Create InvoiceItem
    │       │   ├─> product_id = cartItem.productId
    │       │   ├─> quantity = cartItem.quantity
    │       │   ├─> unit_price = product.selling_price (snapshot)
    │       │   ├─> product_name = product.name (snapshot)
    │       │   ├─> product_sku = product.sku (snapshot)
    │       │   ├─> product_barcode = product.barcode (snapshot)
    │       │   ├─> discount_percent = cartItem.discountPercent
    │       │   ├─> discount_amount = calculated
    │       │   ├─> line_total = (unit_price * quantity) - discount_amount
    │       │   ├─> gst_rate = product.gst_rate (snapshot)
    │       │   └─> Calculate taxes (CGST/SGST/IGST)
    │       │
    │       ├─> Deduct stock (convert reservation to sale)
    │       │   └─> InventoryService.sellStock(productId, quantity)
    │       │       ├─> UPDATE inventory
    │       │       │   SET current_stock = current_stock - quantity,
    │       │       │       reserved_stock = reserved_stock - quantity
    │       │       │   WHERE product_id = ? AND reserved_stock >= quantity
    │       │       │
    │       │       └─> Create StockMovement
    │       │           ├─> movement_type = 'OUT'
    │       │           ├─> quantity = quantity
    │       │           ├─> reference_type = 'SALE'
    │       │           ├─> reference_id = invoice.id
    │       │           └─> created_by = currentUser.id
    │       │
    │       └─> Add invoice item to invoice
    │
    ├─> 6. Calculate invoice totals
    │   └─> InvoiceCalculationService.calculateTotals(invoice)
    │       ├─> subtotal = SUM(line_total) of all items
    │       ├─> discount_amount = invoice-level discount (if any)
    │       ├─> taxable_amount = subtotal - discount_amount
    │       ├─> Group items by GST rate
    │       ├─> FOR EACH GST rate:
    │       │   ├─> taxable_amount = SUM(line_total) for this rate
    │       │   ├─> Calculate CGST (if same state) = taxable_amount * (gst_rate / 2)
    │       │   ├─> Calculate SGST (if same state) = taxable_amount * (gst_rate / 2)
    │       │   └─> Calculate IGST (if different state) = taxable_amount * gst_rate
    │       ├─> total_tax_amount = SUM(all taxes)
    │       ├─> grand_total = taxable_amount + total_tax_amount
    │       └─> round_off = round(grand_total) - grand_total
    │
    ├─> 7. Create GST tax details
    │   └─> FOR EACH GST rate group:
    │       └─> Create GstTaxDetail
    │           ├─> gst_rate
    │           ├─> taxable_amount
    │           ├─> cgst_amount
    │           ├─> sgst_amount
    │           ├─> igst_amount
    │           └─> total_tax_amount
    │
    ├─> 8. Process payment
    │   └─> PaymentService.processPayment(invoice, paymentMode, amount)
    │       ├─> Create Payment record
    │       │   ├─> payment_mode = paymentMode (CASH/CARD/UPI/etc.)
    │       │   ├─> amount = grand_total (or partial amount)
    │       │   ├─> payment_date = CURRENT_DATE
    │       │   ├─> payment_time = CURRENT_TIME
    │       │   └─> received_by = currentUser.id
    │       │
    │       ├─> Update invoice payment_status
    │       │   ├─> IF amount = grand_total → payment_status = 'PAID'
    │       │   └─> ELSE → payment_status = 'PARTIAL'
    │       │
    │       └─> Return Payment record
    │
    ├─> 9. Save invoice
    │   └─> InvoiceRepository.save(invoice)
    │       └─> Cascade saves: invoice_items, gst_tax_details, payments
    │
    ├─> 10. Clear cart
    │   └─> CartService.clearCart(cartId)
    │       └─> Remove all cart items, release stock reservations
    │
    ├─> 11. Create audit log
    │   └─> AuditLogService.log('INVOICE_CREATE', invoice.id, currentUser.id)
    │
    ├─> 12. Broadcast invoice creation (WebSocket)
    │   └─> WebSocketNotificationService.broadcastInvoiceCreated(invoice)
    │
    ├─> COMMIT TRANSACTION
    │
    └─> RETURN InvoiceResponse (complete invoice with items, payments, taxes)
```

### 1.4 GST Calculation Flow (CGST/SGST/IGST)

```
┌─────────────────────────────────────────────────────────────────┐
│              GST CALCULATION FLOW                               │
└─────────────────────────────────────────────────────────────────┘

[InvoiceCalculationService] → calculateGst()
    │
    ├─> Input: Invoice with items
    │
    ├─> 1. Determine tax type (CGST/SGST or IGST)
    │   └─> IF customer_gstin IS NULL or empty → Use business state (same state)
    │   └─> IF customer_gstin IS NOT NULL:
    │       ├─> Extract state code from customer GSTIN
    │       ├─> Compare with business state code
    │       ├─> IF same state → CGST + SGST
    │       └─> IF different state → IGST
    │
    ├─> 2. Group invoice items by GST rate
    │   └─> Map<GstRate, List<InvoiceItem>> groupedItems
    │       └─> Group by item.gst_rate
    │
    ├─> 3. Calculate taxes for each GST rate group
    │   └─> FOR EACH GST rate group:
    │       ├─> taxable_amount = SUM(item.final_amount) for this rate
    │       │   └─> final_amount = line_total - discount_amount
    │       │
    │       ├─> IF same state (CGST + SGST):
    │       │   ├─> cgst_amount = taxable_amount * (gst_rate / 2)
    │       │   ├─> sgst_amount = taxable_amount * (gst_rate / 2)
    │       │   └─> igst_amount = 0
    │       │
    │       └─> IF different state (IGST):
    │           ├─> cgst_amount = 0
    │           ├─> sgst_amount = 0
    │           └─> igst_amount = taxable_amount * gst_rate
    │
    ├─> 4. Create GST tax details records
    │   └─> FOR EACH GST rate group:
    │       └─> GstTaxDetail detail = new GstTaxDetail()
    │           ├─> gst_rate = group rate
    │           ├─> taxable_amount = calculated
    │           ├─> cgst_amount = calculated
    │           ├─> sgst_amount = calculated
    │           ├─> igst_amount = calculated
    │           └─> total_tax_amount = cgst + sgst + igst
    │
    ├─> 5. Sum all taxes
    │   └─> invoice.total_tax_amount = SUM(all gst_tax_details.total_tax_amount)
    │   └─> invoice.cgst_amount = SUM(all gst_tax_details.cgst_amount)
    │   └─> invoice.sgst_amount = SUM(all gst_tax_details.sgst_amount)
    │   └─> invoice.igst_amount = SUM(all gst_tax_details.igst_amount)
    │
    └─> RETURN Invoice with calculated taxes

Example Calculation:
────────────────────
Item 1: Product A, quantity 2, price 100, GST 18%
  - Line total = 200
  - Taxable amount = 200
  - CGST (9%) = 18
  - SGST (9%) = 18
  - IGST = 0 (same state)

Item 2: Product B, quantity 1, price 50, GST 12%
  - Line total = 50
  - Taxable amount = 50
  - CGST (6%) = 3
  - SGST (6%) = 3
  - IGST = 0 (same state)

Total:
  - Subtotal = 250
  - CGST = 21
  - SGST = 21
  - IGST = 0
  - Total Tax = 42
  - Grand Total = 292
```

### 1.5 Discount Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISCOUNT FLOW                                │
└─────────────────────────────────────────────────────────────────┘

Discount Types:
1. Item-level discount (per line item)
2. Invoice-level discount (on total)

┌─────────────────────────────────────────────────────────────────┐
│              ITEM-LEVEL DISCOUNT                                │
└─────────────────────────────────────────────────────────────────┘

[Client] → PUT /api/cashier/cart/items/{itemId}/discount
    │
    ├─> Request: { discountPercent: 10 } or { discountAmount: 5 }
    │
    ▼
[CartService] → applyItemDiscount()
    │
    ├─> 1. Find cart item
    │   └─> CartItem item = findItemById(itemId)
    │
    ├─> 2. Apply discount
    │   └─> IF discountPercent provided:
    │       ├─> discount_amount = (unit_price * quantity) * (discountPercent / 100)
    │       └─> discount_percent = discountPercent
    │   └─> IF discountAmount provided:
    │       ├─> discount_amount = discountAmount
    │       └─> discount_percent = (discountAmount / line_total) * 100
    │
    ├─> 3. Validate discount
    │   └─> IF discount_amount > line_total → throw InvalidDiscountException
    │   └─> IF discount_percent > 100 → throw InvalidDiscountException
    │
    ├─> 4. Recalculate line total
    │   └─> line_total = (unit_price * quantity) - discount_amount
    │
    ├─> 5. Update cart item
    │   └─> Save updated cart item
    │
    └─> RETURN CartResponse (updated cart)

┌─────────────────────────────────────────────────────────────────┐
│            INVOICE-LEVEL DISCOUNT                               │
└─────────────────────────────────────────────────────────────────┘

[Client] → PUT /api/cashier/cart/discount
    │
    ├─> Request: { discountPercent: 5 } or { discountAmount: 10 }
    │
    ▼
[CartService] → applyInvoiceDiscount()
    │
    ├─> 1. Calculate cart subtotal
    │   └─> subtotal = SUM(all item line_totals)
    │
    ├─> 2. Apply discount
    │   └─> IF discountPercent provided:
    │       ├─> discount_amount = subtotal * (discountPercent / 100)
    │       └─> discount_percent = discountPercent
    │   └─> IF discountAmount provided:
    │       ├─> discount_amount = discountAmount
    │       └─> discount_percent = (discountAmount / subtotal) * 100
    │
    ├─> 3. Validate discount
    │   └─> IF discount_amount > subtotal → throw InvalidDiscountException
    │   └─> IF discount_percent > 100 → throw InvalidDiscountException
    │
    ├─> 4. Store discount in cart
    │   └─> cart.discount_amount = discount_amount
    │   └─> cart.discount_percent = discount_percent
    │
    ├─> 5. Recalculate invoice totals (will be done during invoice creation)
    │
    └─> RETURN CartResponse (updated cart)

During Invoice Creation:
────────────────────────
- Item discounts: Applied to each InvoiceItem
- Invoice discount: Applied to invoice.subtotal
- Taxable amount = subtotal - invoice_discount
- Taxes calculated on taxable_amount
```

### 1.6 Hold / Resume Bill Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              HOLD / RESUME BILL FLOW                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        HOLD BILL                                │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/cart/hold
    │
    ├─> Request: { cartId, notes?: "Customer will return" }
    │
    ▼
[CartService] → holdCart() [TRANSACTION]
    │
    ├─> BEGIN TRANSACTION
    │
    ├─> 1. Load cart
    │   └─> Cart cart = getCart(cartId)
    │       └─> IF cart is empty → throw EmptyCartException
    │
    ├─> 2. Create hold record (optional - if storing in DB)
    │   └─> CartHold hold = new CartHold()
    │       ├─> cart_id = cartId
    │       ├─> held_by = currentUser.id
    │       ├─> counter_id = currentCounter.id
    │       ├─> held_at = CURRENT_TIMESTAMP
    │       ├─> notes = notes
    │       └─> status = 'HELD'
    │
    ├─> 3. Mark cart as held
    │   └─> cart.status = 'HELD'
    │   └─> cart.held_at = CURRENT_TIMESTAMP
    │
    ├─> 4. Keep stock reserved (do NOT release)
    │   └─> Stock remains reserved in inventory
    │
    ├─> 5. Create audit log
    │   └─> AuditLogService.log('CART_HOLD', cartId, currentUser.id)
    │
    ├─> COMMIT TRANSACTION
    │
    └─> RETURN CartHoldResponse (hold reference number, resume code)

┌─────────────────────────────────────────────────────────────────┐
│                       RESUME BILL                               │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/cart/resume
    │
    ├─> Request: { holdId or resumeCode }
    │
    ▼
[CartService] → resumeCart() [TRANSACTION]
    │
    ├─> BEGIN TRANSACTION
    │
    ├─> 1. Find held cart
    │   └─> CartHold hold = findHold(holdId or resumeCode)
    │       └─> IF NOT FOUND → throw CartHoldNotFoundException
    │
    ├─> 2. Validate hold is still valid
    │   └─> IF hold.status != 'HELD' → throw CartHoldExpiredException
    │   └─> IF hold.held_at > 24 hours ago → throw CartHoldExpiredException
    │       └─> (Optional: Auto-expire after 24 hours)
    │
    ├─> 3. Validate stock still available
    │   └─> FOR EACH cart item:
    │       └─> Check stock availability
    │           └─> IF insufficient → throw InsufficientStockException
    │
    ├─> 4. Load cart
    │   └─> Cart cart = loadCart(hold.cart_id)
    │
    ├─> 5. Reactivate cart
    │   └─> cart.status = 'ACTIVE'
    │   └─> cart.held_at = NULL
    │
    ├─> 6. Mark hold as resumed
    │   └─> hold.status = 'RESUMED'
    │   └─> hold.resumed_at = CURRENT_TIMESTAMP
    │   └─> hold.resumed_by = currentUser.id
    │
    ├─> 7. Stock remains reserved (no action needed)
    │
    ├─> 8. Create audit log
    │   └─> AuditLogService.log('CART_RESUME', cartId, currentUser.id)
    │
    ├─> COMMIT TRANSACTION
    │
    └─> RETURN CartResponse (full cart with all items)

┌─────────────────────────────────────────────────────────────────┐
│                  EXPIRED HOLD CLEANUP                           │
└─────────────────────────────────────────────────────────────────┘

[Scheduled Task] → cleanupExpiredHolds() [DAILY JOB]
    │
    ├─> 1. Find expired holds (held_at > 24 hours ago, status = 'HELD')
    │
    ├─> 2. FOR EACH expired hold:
    │   ├─> BEGIN TRANSACTION
    │   ├─> Release reserved stock
    │   │   └─> FOR EACH cart item:
    │   │       └─> InventoryService.releaseReservedStock(productId, quantity)
    │   ├─> Mark hold as expired
    │   │   └─> hold.status = 'EXPIRED'
    │   ├─> Clear cart
    │   │   └─> cart.status = 'CLEARED'
    │   └─> COMMIT TRANSACTION
```

### 1.7 Returns & Credit Notes Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              RETURNS & CREDIT NOTES FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CREATE RETURN                                │
└─────────────────────────────────────────────────────────────────┘

[Client] → POST /api/cashier/returns/create
    │
    ├─> Request: { invoiceId, returnItems: [{ itemId, quantity, reason }] }
    │
    ▼
[ReturnService] → createReturn() [TRANSACTION BOUNDARY]
    │
    ├─> BEGIN TRANSACTION (REPEATABLE_READ isolation)
    │
    ├─> 1. Load original invoice
    │   └─> SalesInvoice invoice = invoiceRepository.findById(invoiceId)
    │       └─> IF NOT FOUND → throw EntityNotFoundException
    │       └─> IF invoice.is_cancelled → throw InvalidInvoiceException
    │
    ├─> 2. Validate return items
    │   └─> FOR EACH returnItem:
    │       ├─> Find invoice item
    │       │   └─> InvoiceItem item = findInvoiceItem(returnItem.itemId)
    │       │       └─> IF NOT FOUND → throw EntityNotFoundException
    │       │
    │       ├─> Validate quantity
    │       │   └─> IF returnItem.quantity > item.quantity → throw InvalidQuantityException
    │       │   └─> IF item already returned → check remaining quantity
    │       │
    │       └─> Validate return reason (if required)
    │
    ├─> 3. Calculate return amounts
    │   └─> FOR EACH returnItem:
    │       ├─> return_quantity = returnItem.quantity
    │       ├─> return_line_total = (item.line_total / item.quantity) * return_quantity
    │       ├─> return_discount = (item.discount_amount / item.quantity) * return_quantity
    │       ├─> return_taxable = return_line_total - return_discount
    │       └─> Calculate return taxes (proportional)
    │
    ├─> 4. Generate credit note number
    │   └─> CreditNoteNumberGenerator.generateNext()
    │       └─> Format: "CN-YYYYMMDD-0000001"
    │
    ├─> 5. Create credit note (negative invoice)
    │   └─> SalesInvoice creditNote = new SalesInvoice()
    │       ├─> invoice_number = credit note number
    │       ├─> invoice_date = CURRENT_DATE
    │       ├─> invoice_time = CURRENT_TIME
    │       ├─> cashier_id = currentUser.id
    │       ├─> counter_id = currentCounter.id
    │       ├─> is_credit_note = TRUE
    │       ├─> original_invoice_id = invoice.id
    │       ├─> subtotal = -SUM(return_line_totals)  (negative)
    │       ├─> discount_amount = -SUM(return_discounts)  (negative)
    │       ├─> taxable_amount = -SUM(return_taxable)  (negative)
    │       ├─> cgst_amount = -calculated  (negative)
    │       ├─> sgst_amount = -calculated  (negative)
    │       ├─> igst_amount = -calculated  (negative)
    │       ├─> grand_total = -calculated  (negative)
    │       └─> payment_status = 'REFUNDED'
    │
    ├─> 6. Create credit note items (negative)
    │   └─> FOR EACH returnItem:
    │       └─> InvoiceItem creditItem = new InvoiceItem()
    │           ├─> quantity = -return_quantity  (negative)
    │           ├─> unit_price = original unit_price
    │           ├─> line_total = -return_line_total  (negative)
    │           ├─> discount_amount = -return_discount  (negative)
    │           ├─> final_amount = -return_taxable  (negative)
    │           └─> Taxes = -calculated  (negative)
    │
    ├─> 7. Reverse stock (add back to inventory)
    │   └─> FOR EACH returnItem:
    │       └─> InventoryService.returnStock(productId, return_quantity)
    │           ├─> UPDATE inventory
    │           │   SET current_stock = current_stock + return_quantity
    │           │   WHERE product_id = ?
    │           │
    │           └─> Create StockMovement
    │               ├─> movement_type = 'RETURN'
    │               ├─> quantity = return_quantity  (positive for return)
    │               ├─> reference_type = 'RETURN'
    │               ├─> reference_id = creditNote.id
    │               └─> created_by = currentUser.id
    │
    ├─> 8. Create refund payment
    │   └─> Payment refundPayment = new Payment()
    │       ├─> payment_mode = original payment mode (or CASH)
    │       ├─> amount = -creditNote.grand_total  (negative)
    │       ├─> is_refunded = TRUE
    │       └─> refunded_at = CURRENT_TIMESTAMP
    │
    ├─> 9. Update original invoice
    │   └─> invoice.refunded_amount = creditNote.grand_total
    │   └─> IF refunded_amount = invoice.grand_total:
    │       └─> invoice.payment_status = 'REFUNDED'
    │   └─> ELSE:
    │       └─> invoice.payment_status = 'PARTIAL_REFUND'
    │
    ├─> 10. Link credit note to original invoice
    │   └─> creditNote.original_invoice_id = invoice.id
    │   └─> (Optional: Create return_links table for many-to-many relationship)
    │
    ├─> 11. Save credit note
    │   └─> InvoiceRepository.save(creditNote)
    │
    ├─> 12. Create audit log
    │   └─> AuditLogService.log('RETURN_CREATE', creditNote.id, currentUser.id)
    │
    ├─> 13. Broadcast return (WebSocket)
    │   └─> WebSocketNotificationService.broadcastReturnCreated(creditNote)
    │
    ├─> COMMIT TRANSACTION
    │
    └─> RETURN CreditNoteResponse (complete credit note)
```

---

## 2. Service-Layer Responsibilities

### 2.1 CartService

**Location**: `com.jspcs.pos.service.sales.CartService`

**Responsibilities:**
- Cart management (create, update, delete cart)
- Add items to cart (barcode/manual)
- Remove items from cart
- Update item quantities
- Apply discounts (item-level, invoice-level)
- Calculate cart totals
- Hold/resume cart
- Stock reservation management
- Cart validation

**Key Methods:**
```java
CartResponse createCart(UUID counterId, UUID cashierId);
CartResponse addItemToCart(UUID cartId, String barcode, Integer quantity);
ProductSearchResponse searchProducts(String searchTerm);
CartResponse addItemManual(UUID cartId, UUID productId, Integer quantity);
CartResponse removeItem(UUID cartId, UUID itemId);
CartResponse updateQuantity(UUID cartId, UUID itemId, Integer quantity);
CartResponse applyItemDiscount(UUID cartId, UUID itemId, DiscountRequest request);
CartResponse applyInvoiceDiscount(UUID cartId, DiscountRequest request);
CartResponse holdCart(UUID cartId, String notes);
CartResponse resumeCart(String holdId);
CartResponse getCart(UUID cartId);
void clearCart(UUID cartId);
```

### 2.2 InvoiceService

**Location**: `com.jspcs.pos.service.sales.InvoiceService`

**Responsibilities:**
- Invoice creation
- Invoice retrieval
- Invoice cancellation
- Invoice calculation (totals, taxes)
- Invoice validation
- Invoice number generation
- Stock deduction (convert reservation to sale)
- Payment processing integration

**Key Methods:**
```java
InvoiceResponse createInvoice(CreateInvoiceRequest request, String username);
InvoiceResponse getInvoice(UUID invoiceId);
InvoiceResponse cancelInvoice(UUID invoiceId, String reason, String username);
PagedResponse<InvoiceResponse> getInvoices(InvoiceSearchRequest request);
InvoiceResponse getInvoiceByNumber(String invoiceNumber);
void validateInvoice(SalesInvoice invoice);
String generateInvoiceNumber();
```

### 2.3 InvoiceCalculationService

**Location**: `com.jspcs.pos.service.sales.InvoiceCalculationService`

**Responsibilities:**
- Calculate invoice totals
- Calculate GST (CGST/SGST/IGST)
- Calculate discounts
- Calculate line totals
- Round-off calculation
- Tax grouping by GST rate

**Key Methods:**
```java
void calculateTotals(SalesInvoice invoice);
void calculateGst(SalesInvoice invoice);
void calculateItemTotals(InvoiceItem item);
BigDecimal calculateRoundOff(BigDecimal grandTotal);
Map<BigDecimal, List<InvoiceItem>> groupItemsByGstRate(List<InvoiceItem> items);
boolean isSameState(String customerGstin, String businessGstin);
```

### 2.4 PaymentService

**Location**: `com.jspcs.pos.service.payment.PaymentService`

**Responsibilities:**
- Process payments (single/multi-mode)
- Payment validation
- Payment status updates
- Refund processing
- Payment mode validation

**Key Methods:**
```java
PaymentResponse processPayment(UUID invoiceId, PaymentRequest request, String username);
PaymentResponse processMultiModePayment(UUID invoiceId, List<PaymentRequest> payments, String username);
void updatePaymentStatus(UUID invoiceId);
PaymentResponse processRefund(UUID invoiceId, RefundRequest request, String username);
List<PaymentMode> getAvailablePaymentModes();
```

### 2.5 ReturnService

**Location**: `com.jspcs.pos.service.sales.ReturnService`

**Responsibilities:**
- Process returns
- Create credit notes
- Calculate return amounts
- Reverse stock
- Refund processing
- Return validation

**Key Methods:**
```java
CreditNoteResponse createReturn(CreateReturnRequest request, String username);
CreditNoteResponse getCreditNote(UUID creditNoteId);
PagedResponse<CreditNoteResponse> getReturns(ReturnSearchRequest request);
void validateReturnItems(UUID invoiceId, List<ReturnItemRequest> items);
BigDecimal calculateReturnAmount(InvoiceItem item, Integer returnQuantity);
```

### 2.6 InventoryService

**Location**: `com.jspcs.pos.service.inventory.InventoryService`

**Responsibilities:**
- Stock reservation
- Stock release
- Stock deduction (sale)
- Stock return (reverse)
- Stock availability checks
- Concurrent stock operations

**Key Methods:**
```java
void reserveStock(UUID productId, Integer quantity, UUID reservationId);
void releaseReservedStock(UUID productId, Integer quantity, UUID reservationId);
void sellStock(UUID productId, Integer quantity, UUID invoiceId, UUID userId);
void returnStock(UUID productId, Integer quantity, UUID creditNoteId, UUID userId);
StockAvailability checkAvailability(UUID productId, Integer quantity);
void adjustStock(UUID productId, Integer quantity, StockMovementType type, String reason, UUID userId);
```

---

## 3. Transaction Boundaries

### 3.1 Invoice Creation Transaction

**Service**: `InvoiceService.createInvoice()`

**Transaction Configuration:**
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,  // Prevent phantom reads
    propagation = Propagation.REQUIRED,
    timeout = 30  // 30 seconds max
)
public InvoiceResponse createInvoice(CreateInvoiceRequest request, String username) {
    // All operations within single transaction
}
```

**Transaction Scope:**
- Invoice creation
- Invoice items creation
- Stock deduction (for all items)
- Stock movements creation
- GST tax details creation
- Payment processing
- Invoice save

**Rollback Scenarios:**
- Insufficient stock (any item)
- Payment processing failure
- Database constraint violation
- Any runtime exception

**Why REPEATABLE_READ:**
- Prevents phantom reads during invoice creation
- Ensures stock availability consistency
- Critical for financial accuracy

### 3.2 Stock Reservation Transaction

**Service**: `InventoryService.reserveStock()`

**Transaction Configuration:**
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    propagation = Propagation.REQUIRES_NEW  // Separate transaction
)
public void reserveStock(UUID productId, Integer quantity, UUID reservationId) {
    // Pessimistic locking for stock reservation
}
```

**Transaction Scope:**
- Lock inventory row (SELECT FOR UPDATE)
- Update reserved_stock
- Create stock movement (if needed)
- Release lock

**Why REQUIRES_NEW:**
- Independent transaction for reservation
- Allows rollback without affecting parent transaction
- Better isolation for concurrent operations

### 3.3 Return/Credit Note Transaction

**Service**: `ReturnService.createReturn()`

**Transaction Configuration:**
```java
@Transactional(
    isolation = Isolation.REPEATABLE_READ,
    propagation = Propagation.REQUIRED,
    timeout = 30
)
public CreditNoteResponse createReturn(CreateReturnRequest request, String username) {
    // All return operations within single transaction
}
```

**Transaction Scope:**
- Credit note creation
- Credit note items creation
- Stock return (reverse)
- Stock movements creation
- Refund payment creation
- Original invoice update
- Credit note save

**Rollback Scenarios:**
- Invalid return items
- Stock return failure
- Payment processing failure
- Any runtime exception

### 3.4 Cart Hold Transaction

**Service**: `CartService.holdCart()`

**Transaction Configuration:**
```java
@Transactional(
    isolation = Isolation.READ_COMMITTED,
    propagation = Propagation.REQUIRED
)
public CartHoldResponse holdCart(UUID cartId, String notes) {
    // Hold cart, keep stock reserved
}
```

**Transaction Scope:**
- Create cart hold record
- Update cart status
- Create audit log

**Note**: Stock remains reserved (no transaction needed)

### 3.5 Transaction Best Practices

**DO:**
- ✅ Use REPEATABLE_READ for financial transactions
- ✅ Use REQUIRES_NEW for independent operations (stock reservation)
- ✅ Keep transactions short (< 30 seconds)
- ✅ Use pessimistic locking for critical operations (stock)
- ✅ Handle optimistic locking conflicts (products, inventory)

**DON'T:**
- ❌ Don't use long transactions
- ❌ Don't access external services inside transactions
- ❌ Don't use SERIALIZABLE unnecessarily
- ❌ Don't perform heavy calculations inside transactions

---

## 4. Crash Recovery Strategy (Power Failure)

### 4.1 Recovery Scenarios

#### Scenario 1: Crash During Cart Building (Before Invoice Creation)

**State:**
- Cart items in memory/database
- Stock reserved in inventory
- No invoice created

**Recovery Strategy:**
```
1. On system restart:
   ├─> Find all active carts (status = 'ACTIVE')
   ├─> Check last_updated_at timestamp
   ├─> IF last_updated_at > 30 minutes ago:
   │   ├─> Mark cart as expired
   │   ├─> Release reserved stock
   │   └─> Clear cart
   └─> IF last_updated_at < 30 minutes ago:
       └─> Keep cart active (user can resume)
```

**Implementation:**
```java
@Scheduled(cron = "0 */5 * * * *")  // Every 5 minutes
public void cleanupExpiredCarts() {
    // Find carts not updated in 30 minutes
    List<Cart> expiredCarts = cartRepository.findExpiredCarts(Duration.ofMinutes(30));
    
    for (Cart cart : expiredCarts) {
        try {
            // Release all reserved stock
            for (CartItem item : cart.getItems()) {
                inventoryService.releaseReservedStock(
                    item.getProductId(), 
                    item.getQuantity(), 
                    cart.getId()
                );
            }
            
            // Clear cart
            cart.setStatus(CartStatus.EXPIRED);
            cartRepository.save(cart);
            
        } catch (Exception e) {
            log.error("Error cleaning up expired cart: {}", cart.getId(), e);
        }
    }
}
```

#### Scenario 2: Crash During Invoice Creation (Mid-Transaction)

**State:**
- Transaction partially completed
- Some stock deducted, some not
- Invoice not saved (transaction rolled back)

**Recovery Strategy:**
```
Database ACID guarantees:
├─> Transaction not committed → All changes rolled back
├─> Stock remains reserved (not deducted)
├─> Cart remains intact
└─> No recovery needed (transaction atomicity)

On system restart:
├─> Cart still has items
├─> Stock still reserved
└─> User can retry invoice creation
```

**Implementation:**
- PostgreSQL ACID compliance ensures transaction atomicity
- If transaction not committed, all changes are rolled back
- No manual recovery needed

#### Scenario 3: Crash After Invoice Creation (Before Stock Movement)

**State:**
- Invoice saved in database
- Stock deducted
- Stock movement record may be missing (if created in separate transaction)

**Recovery Strategy:**
```
1. On system restart:
   ├─> Find invoices without stock movements
   │   └─> SELECT invoices WHERE created_at > last_cleanup
   │       AND NOT EXISTS (
   │           SELECT 1 FROM stock_movements 
   │           WHERE reference_id = invoice.id 
   │           AND reference_type = 'SALE'
   │       )
   │
   ├─> FOR EACH invoice:
   │   ├─> Validate stock movements exist
   │   ├─> IF missing → Create stock movements from invoice items
   │   └─> IF stock movements exist → Skip (already processed)
   └─> Log recovery actions
```

**Implementation:**
```java
@Scheduled(cron = "0 0 * * * *")  // Daily
public void recoverMissingStockMovements() {
    LocalDateTime lastRun = recoveryMetadataService.getLastRecoveryTime();
    List<SalesInvoice> invoices = invoiceRepository.findInvoicesWithoutStockMovements(lastRun);
    
    for (SalesInvoice invoice : invoices) {
        try {
            // Verify stock movements exist for all items
            for (InvoiceItem item : invoice.getItems()) {
                boolean movementExists = stockMovementRepository.existsByReference(
                    "SALE", 
                    invoice.getId(), 
                    item.getProductId()
                );
                
                if (!movementExists) {
                    // Create missing stock movement
                    StockMovement movement = new StockMovement();
                    movement.setProductId(item.getProductId());
                    movement.setMovementType(StockMovementType.OUT);
                    movement.setQuantity(item.getQuantity());
                    movement.setReferenceType("SALE");
                    movement.setReferenceId(invoice.getId());
                    movement.setCreatedBy(invoice.getCashierId());
                    // Calculate previous/new stock from inventory
                    stockMovementRepository.save(movement);
                }
            }
        } catch (Exception e) {
            log.error("Error recovering stock movements for invoice: {}", invoice.getId(), e);
        }
    }
    
    recoveryMetadataService.updateLastRecoveryTime(LocalDateTime.now());
}
```

#### Scenario 4: Crash During Stock Reservation

**State:**
- Cart item being added
- Stock reservation transaction may be incomplete

**Recovery Strategy:**
```
Database ACID guarantees:
├─> Reservation transaction atomic
├─> IF not committed → No reservation
└─> Cart item not added (transaction rolled back)

On system restart:
├─> Cart state is consistent
└─> User can retry adding item
```

**Implementation:**
- No recovery needed (transaction atomicity)
- Stock reservation uses REQUIRES_NEW transaction
- Either fully reserved or not at all

### 4.2 Recovery Mechanisms

#### 4.2.1 Scheduled Cleanup Jobs

**Cart Cleanup (Every 5 minutes):**
```java
@Scheduled(cron = "0 */5 * * * *")
public void cleanupExpiredCarts() {
    // Release stock from expired carts
}
```

**Hold Cleanup (Daily):**
```java
@Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
public void cleanupExpiredHolds() {
    // Release stock from expired holds (24+ hours)
}
```

**Recovery Job (Daily):**
```java
@Scheduled(cron = "0 0 3 * * *")  // 3 AM daily
public void recoverMissingData() {
    // Recover missing stock movements
    // Verify invoice consistency
    // Fix any data inconsistencies
}
```

#### 4.2.2 Database Constraints for Integrity

**Foreign Key Constraints:**
- Ensure referential integrity
- Prevent orphaned records

**Check Constraints:**
- Ensure business rule compliance
- Prevent invalid data

**Unique Constraints:**
- Prevent duplicate invoice numbers
- Prevent duplicate reservations

#### 4.2.3 Audit Trail for Recovery

**Audit Logs:**
- Track all critical operations
- Enable recovery verification
- Support forensic analysis

**Stock Movements:**
- Complete history of stock changes
- Can reconstruct inventory state
- Support recovery validation

**Transaction Logs:**
- PostgreSQL WAL (Write-Ahead Logging)
- Point-in-time recovery
- Transaction consistency

### 4.3 Recovery Validation

**On System Startup:**
```java
@Component
public class SystemHealthChecker {
    
    @PostConstruct
    public void validateSystemHealth() {
        // 1. Check database connectivity
        // 2. Verify recent invoices have stock movements
        // 3. Check for orphaned reservations
        // 4. Validate inventory consistency
        // 5. Run recovery jobs if needed
    }
}
```

**Inventory Consistency Check:**
```java
public void validateInventoryConsistency() {
    // Compare inventory.current_stock with sum of stock_movements
    // Flag discrepancies for manual review
    // Log inconsistencies
}
```

---

## Summary

This billing engine design provides:

✅ **Barcode Billing**: Complete flow from scan to invoice  
✅ **Manual Entry**: Product search and selection flow  
✅ **Invoice Creation**: Full lifecycle with validation  
✅ **GST Calculation**: CGST/SGST/IGST support  
✅ **Discounts**: Item-level and invoice-level discounts  
✅ **Hold/Resume**: Cart hold with stock reservation  
✅ **Returns**: Complete return and credit note flow  
✅ **Transaction Management**: Appropriate boundaries and isolation  
✅ **Crash Recovery**: Comprehensive recovery strategies  

The design ensures data integrity, handles concurrency, and provides robust recovery mechanisms for power failures and system crashes.

