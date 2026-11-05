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
    gstRate: number;
    hsnCode?: string;
    isTaxable: boolean;
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
    discount?: number;
    tax?: number;
    finalAmount: number;
    subtotal?: number;
    total: number;
    batchNumber?: string;
}

export interface CreateInvoiceRequest {
    customerName?: string;
    customerPhone?: string;
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
    orderedQuantity: number;
    receivedQuantity?: number;
    damagedQuantity?: number;
    unitCost: number;
    taxRate?: number;
    discountPercent?: number;
    lineTotal?: number;
    batchNumber?: string;
    expiryDate?: string;
}

export interface Purchase {
    id: string;
    purchaseNumber: string;
    supplierId: string;
    supplierName?: string;
    status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
    totalAmount: number;
    taxAmount?: number;
    discountAmount?: number;
    notes?: string;
    createdAt: string;
    receivedAt?: string;
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
    totalTransactions: number;
    averageTicket: number;
    totalCOGS: number;
    grossProfit: number;
    profitMarginPercent: number;
    totalTax: number;
    totalDiscount: number;
    topCategories: { name: string; revenue: number; percentage: number }[];
    topProducts: { name: string; unitsSold: number; revenue: number }[];
    slowMovingCount: number;
    slowMovingSample: { productId: string; name: string; currentStock: number; unitsSold: number }[];
}
