import api from './axios';
import type { Product } from '@/types';

export const productsApi = {
    getAll: async (): Promise<Product[]> => {
        const { data } = await api.get<Product[]>('/products');
        return data;
    },
    getById: async (id: string): Promise<Product> => {
        const { data } = await api.get<Product>(`/products/${id}`);
        return data;
    },
    getBySku: async (sku: string): Promise<Product> => {
        const { data } = await api.get<Product>(`/products/sku/${sku}`);
        return data;
    },
    create: async (product: Partial<Product>): Promise<Product> => {
        const { data } = await api.post<Product>('/products', product);
        return data;
    },
    update: async (id: string, product: Partial<Product>): Promise<Product> => {
        const { data } = await api.put<Product>(`/products/${id}`, product);
        return data;
    },
    updateStock: async (id: string, quantity: number): Promise<Product> => {
        const { data } = await api.put<Product>(`/products/${id}/stock`, { quantity });
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },
};
