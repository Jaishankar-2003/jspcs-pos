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
};
