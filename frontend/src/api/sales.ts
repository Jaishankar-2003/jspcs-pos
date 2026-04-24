import api from './axios';
import type { InvoiceResponse } from '@/types';

export interface CreateInvoiceItemRequest {
    productId: string;
    quantity: number;
    discountPercent?: number;
    unitPrice?: number;
}

export interface CreateInvoiceRequest {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items: CreateInvoiceItemRequest[];
    // TODO: Backend does not currently support paymentMode in CreateInvoiceRequest.
    // We will send it, but it might be ignored until backend is updated.
    paymentMode?: 'CASH' | 'CARD' | 'UPI';
    notes?: string;
}

export const salesApi = {
    createInvoice: async (data: CreateInvoiceRequest): Promise<InvoiceResponse> => {
        const response = await api.post<InvoiceResponse>('/sales/invoices', data);
        return response.data;
    },

    getInvoice: async (id: string): Promise<InvoiceResponse> => {
        const response = await api.get<InvoiceResponse>(`/sales/invoices/${id}`);
        return response.data;
    },

    getAll: async (): Promise<InvoiceResponse[]> => {
        const response = await api.get<InvoiceResponse[]>('/sales/invoices');
        return response.data;
    }
};
