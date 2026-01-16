import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';

interface PrivateRouteProps {
    roles?: string[];
}

export const PrivateRoute = ({ roles }: PrivateRouteProps) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (roles && user && !roles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
