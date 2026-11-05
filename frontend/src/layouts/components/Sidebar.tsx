import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Settings,
    ShoppingCart,
    Boxes,
    Tag,
    Truck,
    ShoppingBag,
    RotateCcw,
    Clock,
    Receipt
} from 'lucide-react';
import { cn } from '@/utils/utils';

const adminNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: 'Products', icon: Package, href: '/admin/products' },
    { label: 'Inventory', icon: Boxes, href: '/admin/inventory' },
    { label: 'Suppliers', icon: Truck, href: '/admin/suppliers' },
    { label: 'Purchases', icon: ShoppingBag, href: '/admin/purchases' },
    { label: 'Sales History', icon: Receipt, href: '/admin/history' },
    { label: 'Returns', icon: RotateCcw, href: '/admin/returns' },
    { label: 'Cashier Shifts', icon: Clock, href: '/admin/shifts' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Categories & Units', icon: Tag, href: '/admin/masters' },
    { label: 'Reports', icon: FileText, href: '/admin/reports' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export const Sidebar = () => {
    const location = useLocation();

    return (
        <div className="hidden border-r bg-muted/40 md:block w-64 min-h-screen flex flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link to="/" className="flex items-center gap-2 font-semibold">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                    <span className="font-bold">JSPCS POS</span>
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="grid items-start px-2 text-sm font-semibold lg:px-4 py-4 gap-1">
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
