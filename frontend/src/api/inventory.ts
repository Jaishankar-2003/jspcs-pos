import api from './axios';
import type { StockMovement, ProductBatch } from '@/types';

export const inventoryApi = {
    getMovements: async (params?: { productId?: string; movementType?: string; limit?: number; offset?: number }): Promise<StockMovement[]> => {
        let url = '/inventory/movements';
        const queryParts = [];
        if (params?.productId) queryParts.push(`product_id=${params.productId}`);
        if (params?.movementType) queryParts.push(`movement_type=${params.movementType}`);
        if (params?.limit) queryParts.push(`limit=${params.limit}`);
        if (params?.offset) queryParts.push(`offset=${params.offset}`);
        if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

        const { data } = await api.get<StockMovement[]>(url);
        return data;
    },
    getBatches: async (filterType?: 'all' | 'near_expiry' | 'expired', thresholdDays = 30): Promise<ProductBatch[]> => {
        let url = `/inventory/batches?threshold_days=${thresholdDays}`;
        if (filterType && filterType !== 'all') {
            url += `&filter_type=${filterType}`;
        }
        const { data } = await api.get<ProductBatch[]>(url);
        return data;
    },
    createBatch: async (batchData: Partial<ProductBatch>): Promise<ProductBatch> => {
        const { data } = await api.post<ProductBatch>('/inventory/batches', batchData);
        return data;
    },
    getValuation: async (): Promise<{
        totalProducts: number;
        totalStockUnits: number;
        unitsBreakdown?: Record<string, number>;
        lowStockCount?: number;
        outOfStockCount?: number;
        healthyStockCount?: number;
        costValuation: number;
        retailValuation: number;
        netRetailValuation?: number;
        potentialGrossProfit?: number;
        potentialMargin: number;
        productValuations?: any[];
    }> => {
        const { data } = await api.get('/inventory/valuation');
        return data;
    }
};
