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
    barcode: string;
    name: string;
    category: string;
    brand: string;
    unitOfMeasure: string;
    sellingPrice: number;
    gstRate: number;
    hsnCode: string;
    isTaxable: boolean;
    currentStock: number;
    availableStock: number;
    isActive: boolean;
}

export interface CartItem extends Product {
    quantity: number;
    discount: number; // Percentage or fixed amount
    total: number;
}

export interface InvoiceSubItem {
    productId: string;
    productName: string;
    category?: string; // Added category
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    finalAmount: number; // matched backend
    total: number; // legacy or computed
}

export interface CreateInvoiceRequest {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerGstin?: string;
    items: {
        productId: string;
        quantity: number;
        discountPercent?: number;
        unitPrice?: number;
    }[];
    paymentMode?: string; // Added
    notes?: string;
}

export interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    invoiceDate: string; // date
    invoiceTime: string; // time
    customerName: string;
    paymentMode: string; // Added
    subtotal: number;
    totalTaxAmount: number;
    discountAmount: number;
    grandTotal: number;
    status: string; // paymentStatus
    items: InvoiceSubItem[];
    cashierName?: string;
}
