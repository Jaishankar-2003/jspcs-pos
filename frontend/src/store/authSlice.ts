import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (authData: AuthResponse) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (authData) => {
                const user = {
                    username: authData.username,
                    role: authData.role,
                    permissions: authData.permissions,
                };
                // Also save to localStorage for axios interceptor
                localStorage.setItem('token', authData.token);
                localStorage.setItem('user', JSON.stringify(user));

                set({
                    user,
                    token: authData.token,
                    isAuthenticated: true,
                });
            },
            logout: () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
