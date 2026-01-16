import {
    Users,
    Package,
    ShoppingCart,
    TrendingUp,
    Clock,
    ArrowUpRight
} from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/utils';

export const DashboardPage = () => {
    // Mock data for demonstration
    const stats = [
        {
            title: "Total Revenue",
            value: "₹1,24,500",
            icon: TrendingUp,
            trend: { value: 12.5, isPositive: true },
            description: "Based on last 30 days"
        },
        {
            title: "Total Orders",
            value: "450",
            icon: ShoppingCart,
            trend: { value: 8.2, isPositive: true },
            description: "Active orders in processing"
        },
        {
            title: "Products",
            value: "1,205",
            icon: Package,
            description: "Across all categories"
        },
        {
            title: "Active Users",
            value: "24",
            icon: Users,
            trend: { value: 2.1, isPositive: false },
            description: "Cashiers currently logged in"
        }
    ];

    const recentOrders = [
        { id: "INV-001", customer: "Walk-in Customer", amount: "₹1,200", status: "Paid", time: "2 mins ago" },
        { id: "INV-002", customer: "John Doe", amount: "₹4,500", status: "Paid", time: "15 mins ago" },
        { id: "INV-003", customer: "Jane Smith", amount: "₹850", status: "Pending", time: "1 hour ago" },
        { id: "INV-004", customer: "Walk-in Customer", amount: "₹2,100", status: "Paid", time: "3 hours ago" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Clock className="mr-2 h-4 w-4" />
                        Last 7 Days
                    </Button>
                    <Button size="sm">Download Report</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Performance</CardTitle>
                        <CardDescription>
                            Volume of sales tracked over the last 30 days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                        {/* Chart will go here */}
                        Chart Placeholder (Requires Recharts)
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest transactions across all counters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{order.customer}</p>
                                        <p className="text-xs text-muted-foreground">{order.id} • {order.time}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{order.amount}</p>
                                        <p className={cn(
                                            "text-xs font-semibold",
                                            order.status === "Paid" ? "text-emerald-500" : "text-amber-500"
                                        )}>{order.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-6 text-primary group" size="sm">
                            View All Transactions
                            <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
