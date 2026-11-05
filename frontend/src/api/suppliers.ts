import api from './axios';
import type { Supplier } from '@/types';

export const suppliersApi = {
    getAll: async (includeInactive = false): Promise<Supplier[]> => {
        const { data } = await api.get<Supplier[]>(`/suppliers?include_inactive=${includeInactive}`);
        return data;
    },
    getById: async (id: string): Promise<Supplier> => {
        const { data } = await api.get<Supplier>(`/suppliers/${id}`);
        return data;
    },
    create: async (supplier: Partial<Supplier>): Promise<Supplier> => {
        const { data } = await api.post<Supplier>('/suppliers', supplier);
        return data;
    },
    update: async (id: string, supplier: Partial<Supplier>): Promise<Supplier> => {
        const { data } = await api.put<Supplier>(`/suppliers/${id}`, supplier);
        return data;
    },
    delete: async (id: string): Promise<{ message: string }> => {
        const { data } = await api.delete<{ message: string }>(`/suppliers/${id}`);
        return data;
    }
};
