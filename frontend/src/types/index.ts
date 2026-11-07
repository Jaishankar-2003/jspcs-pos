export interface User {
    username: string;
    role: string;
    permissions: string[];
}

export interface AuthResponse {
    token: string;
    type: string;
    username: string;
    role: string;
    permissions: string[];
    expiresAt: string;
}

export interface Product {
    id: string;
    sku: string;
    barcode?: string;
    name: string;
    category: string;
    subCategory?: string;
    brand?: string;
    unitOfMeasure: string;
    costPrice?: number;
    sellingPrice: number;
    mrp?: number;
    gstRate: number;
    hsnCode?: string;
    isTaxable: boolean;
    isInclusive?: boolean;
    taxType?: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST';
    customCgstRate?: number;
    customSgstRate?: number;
    currentStock: number;
    availableStock?: number;
    isActive: boolean;
    low_stock_threshold?: number;
}

export interface CartItem extends Product {
    quantity: number;
    discount: number; // Percentage or fixed amount
    total: number;
}

export interface InvoiceSubItem {
    productId: string;
    productName: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    mrp?: number;
    hsnCode?: string;
    unit?: string;
    unitOfMeasure?: string;
    gstRate?: number;
    discount?: number;
    discountAmount?: number;
    tax?: number;
    taxAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    taxableAmount?: number;
    finalAmount: number;
    subtotal?: number;
    total: number;
    batchNumber?: string;
}

export interface CreateInvoiceRequest {
    customerName?: string;
    customerPhone?: string;
    isInterstate?: boolean;
    items: {
        productId: string;
        quantity: number;
        discountPercent?: number;
        unitPrice?: number;
        batchId?: string;
    }[];
    paymentMode?: 'CASH' | 'CARD' | 'UPI';
    discountPercent?: number;
    discountAmount?: number;
    discountReason?: string;
    notes?: string;
}

export interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceTime: string;
    customerName: string;
    customerPhone?: string;
    paymentMode: string;
    subtotal: number;
    totalTaxAmount: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    discountAmount: number;
    grandTotal: number;
    status: string;
    items: InvoiceSubItem[];
    cashierName?: string;
}

// --- Feature A: Supplier ---
export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    notes?: string;
    isActive: boolean;
    createdAt?: string;
}

// --- Feature B: Purchase ---
export interface PurchaseItem {
    id?: string;
    productId: string;
    productName?: string;
    productSku?: string;
    purchaseUnit?: string;
    conversionFactor?: number;
    baseUnit?: string;
    purchaseQuantity?: number;
    purchaseUnitPrice?: number;
    convertedQuantity?: number;
    orderedQuantity: number;
    receivedQuantity?: number;
    damagedQuantity?: number;
    unitCost: number;
    taxRate?: number;
    taxType?: string;
    isInclusive?: boolean;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    discountPercent?: number;
    discountAmount?: number;
    additionalCharges?: number;
    lineTotal?: number;
    batchNumber?: string;
    expiryDate?: string;
}

export interface PurchaseAttachment {
    id: string;
    purchaseId?: string;
    grnId?: string;
    filename: string;
    fileType?: string;
    fileSize?: number;
    documentCategory: string;
    createdAt: string;
    downloadUrl?: string;
}

export interface GrnBatchItem {
    id?: string;
    batchNumber: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    damagedQuantity?: number;
    rejectedQuantity?: number;
    convertedAcceptedQuantity?: number;
    convertedDamagedQuantity?: number;
    mfgDate?: string;
    expiryDate?: string;
    purchaseCost?: number;
    baseUnitCost?: number;
    mrp?: number;
    notes?: string;
}

export interface GoodsReceiptItem {
    id: string;
    productId: string;
    productName: string;
    purchaseUnit?: string;
    conversionFactor?: number;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    damagedQuantity: number;
    acceptedStockQuantity: number;
    damagedStockQuantity: number;
    purchaseUnitCost: number;
    baseUnitCost: number;
    taxRate?: number;
    lineTotal: number;
    batches?: GrnBatchItem[];
}

export interface GoodsReceipt {
    id: string;
    grnNumber: string;
    receivedDate: string;
    supplierInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    invoiceTaxableAmount?: number;
    gstAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    invoiceTotal?: number;
    notes?: string;
    status: string;
    createdAt: string;
    items: GoodsReceiptItem[];
}

export interface Purchase {
    id: string;
    purchaseNumber: string;
    supplierId: string;
    supplierName?: string;
    status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
    subtotal?: number;
    totalAmount: number;
    taxAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    discountAmount?: number;
    additionalCharges?: number;
    isInterstate?: boolean;
    supplierInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    paymentTerms?: string;
    dueDate?: string;
    notes?: string;
    createdAt: string;
    receivedAt?: string;
    attachmentsCount?: number;
    items: PurchaseItem[];
}

// --- Feature C: Inventory Ledger ---
export interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    movementType: string;
    previousQuantity: number;
    quantityChanged: number;
    newQuantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    creatorUsername?: string;
    createdAt: string;
}

// --- Feature D: Sales Returns ---
export interface SalesReturnItem {
    id?: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    refundSubtotal: number;
    condition: 'SELLABLE' | 'DAMAGED';
}

export interface SalesReturn {
    id: string;
    returnNumber: string;
    saleId: string;
    saleInvoiceNumber?: string;
    cashierName?: string;
    refundMode: 'CASH' | 'CARD' | 'UPI';
    totalRefundAmount: number;
    returnReason?: string;
    createdAt: string;
    items: SalesReturnItem[];
}

// --- Feature E: Cashier Shift ---
export interface CashierShift {
    id: string;
    cashierId: string;
    cashierUsername?: string;
    status: 'OPEN' | 'CLOSED';
    openedAt: string;
    closedAt?: string;
    openingCash: number;
    closingCashActual?: number;
    closingCashExpected?: number;
    cashDifference?: number;
    cashSales: number;
    cardSales: number;
    upiSales: number;
    refundTotal: number;
    notes?: string;
}

// --- Feature F: Product Batch ---
export interface ProductBatch {
    id: string;
    productId: string;
    productName?: string;
    productSku?: string;
    batchNumber: string;
    mfgDate?: string;
    expiryDate: string;
    costPrice: number;
    sellingPrice: number;
    initialQuantity: number;
    currentQuantity: number;
    isActive: boolean;
    isExpired: boolean;
    daysUntilExpiry: number;
    createdAt: string;
}

// --- Feature G: Reports Summary ---
export interface ReportSummary {
    rangeType: string;
    totalRevenue: number;
    grossRevenue?: number;
    salesReturns?: number;
    netRevenue?: number;
    totalTransactions: number;
    averageTicket: number;
    totalCOGS: number;
    grossCOGS?: number;
    cogsReversed?: number;
    netCOGS?: number;
    damagedGoodsLoss?: number;
    grossProfit: number;
    profitMarginPercent: number;
    totalTax: number;
    grossTax?: number;
    taxReversed?: number;
    netTax?: number;
    totalDiscount: number;
    topCategories: { name: string; revenue: number; percentage: number }[];
    topProducts: { name: string; unitsSold: number; revenue: number }[];
    slowMovingCount: number;
    slowMovingSample: { productId: string; name: string; currentStock: number; unitsSold: number }[];
}
