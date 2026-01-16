import api from './axios';
import type { AuthResponse } from '@/types';

export interface LoginRequest {
    username: string;
    password: string;
}

export const authApi = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials);
        return data;
    },
};
