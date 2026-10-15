import { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Download,
    Calendar as CalendarIcon,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatsCard } from '@/components/ui/StatsCard';
import { salesApi } from '@/api/sales';
import type { InvoiceResponse } from '@/types';

export const ReportsPage = () => {
    const [dateRange] = useState('All Time');
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalSales: 0,
        avgTicket: 0,
        netProfit: 0 // Estimated
    });
    const [categorySales, setCategorySales] = useState<{ name: string, value: string, per: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const invoices: InvoiceResponse[] = await salesApi.getAll();

                // Calculate Totals
                const revenue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
                const salesCount = invoices.length;
                const avgTicket = salesCount > 0 ? revenue / salesCount : 0;
                const profit = revenue * 0.2; // Estimated 20% margin

                setStats({
                    totalRevenue: revenue,
                    totalSales: salesCount,
                    avgTicket,
                    netProfit: profit
                });

                // Calculate Top Categories
                const catMap: Record<string, number> = {};
                invoices.forEach(inv => {
                    inv.items.forEach(item => {
                        const cat = item.category || 'Uncategorized';
                        catMap[cat] = (catMap[cat] || 0) + item.finalAmount;
                    });
                });

                const sortedCats = Object.entries(catMap)
                    .map(([name, val]) => ({ name, val }))
                    .sort((a, b) => b.val - a.val)
                    .slice(0, 5);

                const totalCatSales = sortedCats.reduce((acc, c) => acc + c.val, 0);

                setCategorySales(sortedCats.map(c => ({
                    name: c.name,
                    value: `₹${(c.val / 1000).toFixed(1)}k`,
                    per: totalCatSales > 0 ? (c.val / totalCatSales) * 100 : 0
                })));

            } catch (error) {
                console.error("Failed to load report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales & Analytics</h1>
                    <p className="text-muted-foreground">Detailed insights into your business performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                    description="Gross revenue"
                    trend={{ value: 0, isPositive: true }}
                />
                <StatsCard
                    title="Total Sales"
                    value={stats.totalSales.toString()}
                    icon={ShoppingBag}
                    description="Invoices generated"
                    trend={{ value: 0, isPositive: true }}
                />
                <StatsCard
                    title="Avg. Ticket Size"
                    value={`₹${stats.avgTicket.toFixed(0)}`}
                    icon={TrendingUp}
                    description="Per transaction"
                    trend={{ value: 0, isPositive: false }}
                />
                <StatsCard
                    title="Est. Net Profit"
                    value={`₹${stats.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={BarChart3}
                    description="Estimated @ 20%"
                    trend={{ value: 0, isPositive: true }}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Over Time</CardTitle>
                        <CardDescription>Daily revenue trends.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border border-dashed rounded-lg mx-6 mb-6">
                        <div className="text-center text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>Chart visualization coming soon (requires charting lib)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Selling Categories</CardTitle>
                        <CardDescription>Sales distribution by product category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {categorySales.length === 0 ? <p className="text-muted-foreground text-center">No sales data yet.</p> :
                                categorySales.map((cat, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{cat.name}</span>
                                            <span className="text-muted-foreground">{cat.value}</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${cat.per}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
