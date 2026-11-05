import api from './axios';
import type { ReportSummary } from '@/types';

export const reportsApi = {
    getSummary: async (rangeType = 'all', startDate?: string, endDate?: string): Promise<ReportSummary> => {
        let url = `/reports/summary?range_type=${rangeType}`;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }
        const { data } = await api.get<ReportSummary>(url);
        return data;
    }
};

