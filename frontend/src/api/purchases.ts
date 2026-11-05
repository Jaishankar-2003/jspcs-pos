import api from './axios';
import type { Purchase, PurchaseItem } from '@/types';

export interface ReceiveItemPayload {
    itemId: string;
    receivedQuantity: number;
    damagedQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
}

export const purchasesApi = {
    getAll: async (status?: string): Promise<Purchase[]> => {
        const url = status ? `/purchases?status=${status}` : '/purchases';
        const { data } = await api.get<Purchase[]>(url);
        return data;
    },
    getById: async (id: string): Promise<Purchase> => {
        const { data } = await api.get<Purchase>(`/purchases/${id}`);
        return data;
    },
    create: async (purchaseData: { supplierId: string; notes?: string; items: PurchaseItem[] }): Promise<Purchase> => {
        const { data } = await api.post<Purchase>('/purchases', purchaseData);
        return data;
    },
    receiveGoods: async (id: string, items: ReceiveItemPayload[]): Promise<Purchase> => {
        const { data } = await api.post<Purchase>(`/purchases/${id}/receive`, { items });
        return data;
    },
    cancel: async (id: string): Promise<Purchase> => {
        const { data } = await api.put<Purchase>(`/purchases/${id}/cancel`);
        return data;
    }
};
