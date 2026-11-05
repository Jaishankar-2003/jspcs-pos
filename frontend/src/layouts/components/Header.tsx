import { CircleUser, LogOut, ShoppingCart, Receipt, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authSlice';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { cn } from '@/utils/utils';
import toast from 'react-hot-toast';

export const Header = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Failed to logout from server', error);
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <div className="w-full flex-1 flex items-center gap-3">
                {user?.role === 'CASHIER' && (
                    <nav className="flex items-center gap-1 md:gap-2">
                        <Link
                            to="/cashier/billing"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                location.pathname.includes('/billing')
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Billing (POS)
                        </Link>
                        <Link
                            to="/cashier/history"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                location.pathname.includes('/history')
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Receipt className="h-3.5 w-3.5" />
                            Invoice History
                        </Link>
                        <Link
                            to="/cashier/shift"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                location.pathname.includes('/shift')
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            My Shift
                        </Link>
                        <Link
                            to="/cashier/returns"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                location.pathname.includes('/returns')
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Returns
                        </Link>
                    </nav>
                )}
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold hidden md:block">
                    {user?.username} ({user?.role})
                </span>
                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
                    <CircleUser className="h-4 w-4" />
                    <span className="sr-only">Toggle user menu</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Logout</span>
                </Button>
            </div>
        </header>
    );
};
