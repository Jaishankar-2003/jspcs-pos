import api from './axios';

export const settingsApi = {
    getAll: async (): Promise<Record<string, string>> => {
        const { data } = await api.get<Record<string, string>>('/settings');
        return data;
    },
    update: async (settingsData: Record<string, string | number>): Promise<Record<string, string>> => {
        const { data } = await api.put<Record<string, string>>('/settings', settingsData);
        return data;
    }
};
