import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authSlice';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import toast from 'react-hot-toast';

/**
 * Hook to automatically log out the user after a period of inactivity.
 * @param timeoutMs Timeout in milliseconds (default: 2 minutes)
 */
export const useInactivityLogout = (timeoutMs: number = 100000) => {
    const { logout, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (isAuthenticated) {
            timeoutRef.current = setTimeout(() => {
                handleLogout();
            }, timeoutMs);
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Inactivity logout: Failed to notify server', error);
        }

        toast('Logged out due to inactivity', {
            icon: '🕒',
            duration: 4000,
        });
        logout();
        navigate('/login');
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        const events = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        // Initial timer setup
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [isAuthenticated, logout, navigate, timeoutMs]);

    return { resetTimer };
};
