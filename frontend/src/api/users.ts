import api from './axios';

// Extend User type or create a specific response type if needed
// Assuming AuthResponse-like structure or specific UserResponse from backend
export interface UserResponse {
    id: string;
    username: string;
    fullName: string;
    role: string;
    email?: string;
    createdAt: string;
    isActive: boolean;
}

export interface CreateUserRequest {
    username: string;
    password?: string;
    fullName: string;
    role: string; // ADMIN, CASHIER
    email?: string;
    phone?: string;
}

export const usersApi = {
    getAll: async (): Promise<UserResponse[]> => {
        const { data } = await api.get<UserResponse[]>('/users');
        return data;
    },

    create: async (user: CreateUserRequest): Promise<UserResponse> => {
        const { data } = await api.post<UserResponse>('/users', user);
        return data;
    },

    getById: async (id: string): Promise<UserResponse> => {
        const { data } = await api.get<UserResponse>(`/users/${id}`);
        return data;
    },
    update: async (id: string, user: any): Promise<UserResponse> => {
        const { data } = await api.put<UserResponse>(`/users/${id}`, user);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    },

    getRoles: async (): Promise<any[]> => {
        const response = await api.get('/users/roles');
        return response.data;
    },

    getCounters: async (): Promise<any[]> => {
        const response = await api.get('/users/counters');
        return response.data;
    },

    getMe: async (): Promise<any> => {
        const response = await api.get('/users/me');
        return response.data;
    }
};
