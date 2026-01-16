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
    productName: string; // Add name for display
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
}

export interface CreateInvoiceRequest {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerGstin?: string;
    items: InvoiceSubItem[];
    notes?: string;
}

export interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: any[]; // refine later
}
