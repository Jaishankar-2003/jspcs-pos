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
    },
    uploadBulk: async (file: File): Promise<{ message: string; errors: string[]; count: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post<{ message: string; errors: string[]; count: number }>('/suppliers/bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },
    downloadSampleCSV: () => {
        const headers = "supplierName,contactPerson,phoneNumber,email,gstin,address,notes\n";
        const sample = 'Sri Lakshmi Traders,Ramesh Kumar,9000000001,ramesh@lakshmitraders.example,33AAAAA0000A1Z5,"Gandhipuram, Coimbatore, Tamil Nadu","Groceries and rice wholesale supplier"\n';
        const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'suppliers_sample.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }
};
