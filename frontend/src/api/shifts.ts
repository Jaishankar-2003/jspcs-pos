import api from './axios';
import type { CashierShift } from '@/types';

export const shiftsApi = {
    getCurrent: async (): Promise<CashierShift> => {
        const { data } = await api.get<CashierShift>('/shifts/current');
        return data;
    },
    openShift: async (openingCash: number, notes?: string): Promise<CashierShift> => {
        const { data } = await api.post<CashierShift>('/shifts/open', { openingCash, notes });
        return data;
    },
    closeShift: async (actualCash: number, notes?: string): Promise<CashierShift> => {
        const { data } = await api.post<CashierShift>('/shifts/close', { actualCash, notes });
        return data;
    },
    getAll: async (cashierId?: string): Promise<CashierShift[]> => {
        const url = cashierId ? `/shifts?cashier_id=${cashierId}` : '/shifts';
        const { data } = await api.get<CashierShift[]>(url);
        return data;
    }
};

