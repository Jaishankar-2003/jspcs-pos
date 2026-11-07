import api from './axios';
import type { Purchase, PurchaseItem, PurchaseAttachment, GoodsReceipt, GrnBatchItem } from '@/types';

export interface ReceiveItemPayload {
    itemId: string;
    receivedQuantity: number;
    damagedQuantity?: number;
    rejectedQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
    mfgDate?: string;
    sellingPrice?: number;
    sellingGstRate?: number;
    batches?: GrnBatchItem[];
}

export interface PurchaseReceivePayload {
    supplierInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    invoiceTaxableAmount?: number;
    gstAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    invoiceTotal?: number;
    notes?: string;
    items: ReceiveItemPayload[];
}

export interface PurchaseCreatePayload {
    supplierId: string;
    status?: 'DRAFT' | 'ORDERED';
    isInterstate?: boolean;
    supplierInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    paymentTerms?: string;
    dueDate?: string;
    notes?: string;
    items: PurchaseItem[];
}

export const purchasesApi = {
    getAll: async (status?: string): Promise<Purchase[]> => {
        const url = status && status !== 'ALL' ? `/purchases?status=${status}` : '/purchases';
        const { data } = await api.get<Purchase[]>(url);
        return data;
    },

    getById: async (id: string): Promise<Purchase> => {
        const { data } = await api.get<Purchase>(`/purchases/${id}`);
        return data;
    },

    create: async (purchaseData: PurchaseCreatePayload): Promise<Purchase> => {
        const { data } = await api.post<Purchase>('/purchases', purchaseData);
        return data;
    },

    confirm: async (id: string): Promise<Purchase> => {
        const { data } = await api.put<Purchase>(`/purchases/${id}/confirm`);
        return data;
    },

    receiveGoods: async (id: string, payload: PurchaseReceivePayload | ReceiveItemPayload[]): Promise<Purchase> => {
        const body = Array.isArray(payload) ? { items: payload } : payload;
        const { data } = await api.post<Purchase>(`/purchases/${id}/receive`, body);
        return data;
    },

    cancel: async (id: string): Promise<Purchase> => {
        const { data } = await api.put<Purchase>(`/purchases/${id}/cancel`);
        return data;
    },

    getGrns: async (id: string): Promise<GoodsReceipt[]> => {
        const { data } = await api.get<GoodsReceipt[]>(`/purchases/${id}/grns`);
        return data;
    },

    getAttachments: async (id: string): Promise<PurchaseAttachment[]> => {
        const { data } = await api.get<PurchaseAttachment[]>(`/purchases/${id}/attachments`);
        return data;
    },

    uploadAttachment: async (id: string, file: File, documentCategory = 'OTHER', grnId?: string): Promise<PurchaseAttachment> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentCategory', documentCategory);
        if (grnId) formData.append('grnId', grnId);

        const { data } = await api.post<PurchaseAttachment>(`/purchases/${id}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },

    deleteAttachment: async (attachmentId: string): Promise<{ message: string }> => {
        const { data } = await api.delete<{ message: string }>(`/purchases/attachments/${attachmentId}`);
        return data;
    },

    getAttachmentDownloadUrl: (attachmentId: string): string => {
        return `/api/purchases/attachments/${attachmentId}/download`;
    }
};
