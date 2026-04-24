import { useEffect, useState } from 'react';
import {
    Users,
    Package,
    TrendingUp,
    RefreshCw,
    Activity,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useDashboardStore } from '@/store/dashboardStore';
import { useDashboardWebSocket } from '@/store/useDashboardWebSocket';
import { cn } from '@/utils/utils';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
    const { 
        totalRevenue, 
        productCount, 
        activeUsers, 
        cashierRevenue, 
        lastUpdated,
        setInitialData 
    } = useDashboardStore();
    const [loading, setLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    
    // Initialize WebSocket connection
    useDashboardWebSocket();

    useEffect(() => {
        const fetchInitialData = async () => {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const API_URL = import.meta.env.VITE_API_URL || '';
            
            try {
                const [productsRes, revenueRes, cashierRes, usersRes] = await Promise.all([
                    fetch(`${API_URL}/api/dashboard/products/count`, { headers }),
                    fetch(`${API_URL}/api/dashboard/revenue/today`, { headers }),
                    fetch(`${API_URL}/api/dashboard/revenue/cashier`, { headers }),
                    fetch(`${API_URL}/api/dashboard/active-users`, { headers })
                ]);
                
                if (productsRes.ok && revenueRes.ok && cashierRes.ok && usersRes.ok) {
                    const productsData = await productsRes.json();
                    const revenueData = await revenueRes.json();
                    const cashierData = await cashierRes.json();
                    const usersData = await usersRes.json();
                    
                    setInitialData({
                        productCount: productsData.totalProducts || 0,
                        totalRevenue: revenueData.totalRevenue || 0,
                        cashierRevenue: cashierData || [],
                        activeUsers: usersData || []
                    });
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchInitialData();
    }, [setInitialData]);

    const handleClearRevenue = async () => {
        console.log("Clear Revenue button clicked");
        if (!confirm("Are you sure you want to clear today's revenue? This will affect all reports.")) {
            console.log("Clear Revenue cancelled by user");
            return;
        }
        
        setIsClearing(true);
        console.log("Attempting to clear revenue...");
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || '';
            const url = `${API_URL}/api/dashboard/clear`;
            console.log(`POSTing to: ${url}`);
            
            const headers: any = { 
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const res = await fetch(url, {
                method: 'POST',
                headers: headers
            });
            
            console.log(`Response status: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log("Revenue cleared response:", data);
                toast.success("Revenue cleared successfully");
            } else {
                const errorData = await res.text();
                console.error("Failed to clear revenue:", errorData);
                toast.error(`Failed to clear revenue: ${res.status}`);
            }
        } catch (error) {
            console.error("Error clearing revenue:", error);
            toast.error("Error clearing revenue. Check console for details.");
        } finally {
            setIsClearing(false);
        }
    };

    const adminCount = activeUsers.filter(u => u.role === 'ADMIN').length;
    const cashierCount = activeUsers.filter(u => u.role !== 'ADMIN').length;

    const stats = [
        {
            title: "Daily Revenue",
            value: `₹${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: TrendingUp,
            description: "Total sales for today"
        },
        {
            title: "Products",
            value: productCount.toLocaleString(),
            icon: Package,
            description: "Across all categories"
        },
        {
            title: "Active Users",
            value: activeUsers.length.toString(),
            icon: Users,
            description: `${adminCount} Admin${adminCount !== 1 ? 's' : ''}, ${cashierCount} Cashier${cashierCount !== 1 ? 's' : ''}`
        }
    ];

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-4">
                <div className="relative">
                    <Activity className="h-12 w-12 text-primary animate-pulse" />
                    <div className="absolute inset-0 h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
                <p className="text-lg font-medium text-muted-foreground animate-pulse">Initializing real-time dashboard...</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black tracking-tight font-outfit text-primary">Live Dashboard</h1>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground mt-1">Real-time overview of your store operations</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Updated</p>
                        <p className="text-sm font-medium">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearRevenue}
                        disabled={isClearing}
                        className="text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
                    >
                        {isClearing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Clear Revenue
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <StatsCard {...stat} />
                    </motion.div>
                ))}
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-7 lg:col-span-4 shadow-sm border-border/50 overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Cashier Live Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px]">Cashier Name</th>
                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-center">Status</th>
                                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Today Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {cashierRevenue.length === 0 ? (
                                            <motion.tr
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                                                    No active transactions recorded yet today
                                                </td>
                                            </motion.tr>
                                        ) : (
                                            cashierRevenue.map((cashier, idx) => (
                                                <motion.tr 
                                                    key={cashier.cashierName} 
                                                    layout
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                                >
                                                    <td className="px-6 py-4 font-semibold text-base">{cashier.cashierName}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-tighter shadow-sm",
                                                            cashier.status === "ONLINE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                                                        )}>
                                                            <span className={cn("h-1.5 w-1.5 rounded-full", cashier.status === "ONLINE" ? "bg-emerald-500 animate-pulse" : "bg-gray-400")}></span>
                                                            {cashier.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <motion.span 
                                                            key={cashier.revenue}
                                                            initial={{ scale: 1.1, color: "#10b981" }}
                                                            animate={{ scale: 1, color: "var(--primary)" }}
                                                            className="font-black text-lg text-primary font-outfit block"
                                                        >
                                                            ₹{cashier.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </motion.span>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-7 lg:col-span-3 shadow-sm border-border/50 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Active Sessions
                        </CardTitle>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{activeUsers.length}</span>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {activeUsers.length === 0 ? (
                                    <motion.p 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center text-muted-foreground py-8 italic"
                                    >
                                        No active administrative or cashier sessions
                                    </motion.p>
                                ) : (
                                    activeUsers.map((user) => (
                                        <motion.div 
                                            key={user.userId} 
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-full",
                                                    user.role === 'ADMIN' ? "bg-blue-100" : "bg-orange-100"
                                                )}>
                                                    <Users className={cn(
                                                        "h-4 w-4",
                                                        user.role === 'ADMIN' ? "text-blue-600" : "text-orange-600"
                                                    )} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm leading-none">{user.username}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">Logged in {new Date(user.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest",
                                                    user.role === 'ADMIN' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                                                )}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
};
