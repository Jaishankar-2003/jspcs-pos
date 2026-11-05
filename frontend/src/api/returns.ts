import api from './axios';
import type { SalesReturn } from '@/types';

export interface CreateReturnPayload {
    saleId: string;
    refundMode?: 'CASH' | 'CARD' | 'UPI';
    reason?: string;
    items: {
        productId: string;
        quantity: number;
        condition?: 'SELLABLE' | 'DAMAGED';
    }[];
}

export const returnsApi = {
    getAll: async (): Promise<SalesReturn[]> => {
        const { data } = await api.get<SalesReturn[]>('/returns');
        return data;
    },
    getById: async (id: string): Promise<SalesReturn> => {
        const { data } = await api.get<SalesReturn>(`/returns/${id}`);
        return data;
    },
    create: async (returnData: CreateReturnPayload): Promise<SalesReturn> => {
        const { data } = await api.post<SalesReturn>('/returns', returnData);
        return data;
    }
};

