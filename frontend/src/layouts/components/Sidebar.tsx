import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Settings,
    ShoppingCart
} from 'lucide-react';
import { cn } from '@/utils/utils';

const adminNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: 'Products', icon: Package, href: '/admin/products' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Reports', icon: FileText, href: '/admin/reports' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export const Sidebar = () => {
    const location = useLocation();

    return (
        <div className="hidden border-r bg-muted/40 md:block w-64 min-h-screen flex flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link to="/" className="flex items-center gap-2 font-semibold">
                    <ShoppingCart className="h-6 w-6" />
                    <span className="">JSPCS POS</span>
                </Link>
            </div>
            <div className="flex-1">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4 gap-1">
                    {adminNavItems.map((item) => (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                location.pathname.startsWith(item.href)
                                    ? "bg-muted text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
};
