import { useState, useEffect } from 'react';
import {
    BarChart3,
    DollarSign,
    ShoppingBag,
    Download,
    Package,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatsCard } from '@/components/ui/StatsCard';
import { reportsApi } from '@/api/reports';
import type { ReportSummary } from '@/types';
import toast from 'react-hot-toast';

export const ReportsPage = () => {
    const [rangeType, setRangeType] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await reportsApi.getSummary(rangeType);
            setSummary(data);
        } catch (error) {
            console.error("Failed to load report data", error);
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [rangeType]);

    const exportToCSV = () => {
        if (!summary) return;
        const rows = [
            ["Metric", "Value"],
            ["Total Revenue", `₹${summary.totalRevenue}`],
            ["Total Transactions", summary.totalTransactions],
            ["Average Ticket Value", `₹${summary.averageTicket}`],
            ["Cost of Goods Sold (COGS)", `₹${summary.totalCOGS}`],
            ["Gross Profit", `₹${summary.grossProfit}`],
            ["Profit Margin", `${summary.profitMarginPercent}%`],
            ["Total Tax", `₹${summary.totalTax}`],
            ["Total Discounts Given", `₹${summary.totalDiscount}`],
            [],
            ["Top Product", "Units Sold", "Revenue"],
            ...summary.topProducts.map(p => [p.name, p.unitsSold, `₹${p.revenue}`]),
            [],
            ["Top Category", "Revenue", "Percentage"],
            ...summary.topCategories.map(c => [c.name, `₹${c.revenue}`, `${c.percentage}%`])
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.map(e => `"${e}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_analytics_${rangeType}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales & Analytics</h1>
                    <p className="text-muted-foreground">Accurate financial reports, Cost of Goods Sold (COGS), and profit margins.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md shadow-sm border bg-background p-1">
                        <button
                            onClick={() => setRangeType('today')}
                            className={`px-3 py-1.5 text-xs font-medium rounded ${rangeType === 'today' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setRangeType('week')}
                            className={`px-3 py-1.5 text-xs font-medium rounded ${rangeType === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            7 Days
                        </button>
                        <button
                            onClick={() => setRangeType('month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded ${rangeType === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            30 Days
                        </button>
                        <button
                            onClick={() => setRangeType('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded ${rangeType === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            All Time
                        </button>
                    </div>
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : summary ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCard
                            title="Gross Revenue"
                            value={`₹${Number(summary.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            icon={DollarSign}
                            description={`Total ${rangeType} sales`}
                            trend={{ value: 0, isPositive: true }}
                        />
                        <StatsCard
                            title="Total Transactions"
                            value={summary.totalTransactions.toString()}
                            icon={ShoppingBag}
                            description="Invoices processed"
                            trend={{ value: 0, isPositive: true }}
                        />
                        <StatsCard
                            title="Cost of Goods (COGS)"
                            value={`₹${Number(summary.totalCOGS || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            icon={Package}
                            description="Purchase cost of items sold"
                            trend={{ value: 0, isPositive: false }}
                        />
                        <StatsCard
                            title="Gross Profit"
                            value={`₹${Number(summary.grossProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            icon={BarChart3}
                            description={`Margin: ${summary.profitMarginPercent}%`}
                            trend={{ value: summary.profitMarginPercent, isPositive: summary.grossProfit >= 0 }}
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        {/* Top Selling Products */}
                        <Card className="lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Top Selling Products</CardTitle>
                                <CardDescription>Highest revenue generating items.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {summary.topProducts.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No products sold in this period.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {summary.topProducts.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-card/40">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-sm">{p.name}</span>
                                                        <span className="block text-xs text-muted-foreground">{p.unitsSold} units sold</span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-sm">₹{p.revenue.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Categories */}
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Category Breakdown</CardTitle>
                                <CardDescription>Sales distribution by product category.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {summary.topCategories.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">No sales data yet.</p>
                                    ) : (
                                        summary.topCategories.map((cat, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{cat.name}</span>
                                                    <span className="text-muted-foreground">₹{cat.revenue.toLocaleString()} ({cat.percentage}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-500"
                                                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Slow-Moving Products Alert */}
                    {summary.slowMovingCount > 0 && (
                        <Card className="border-amber-500/20 bg-amber-500/5">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <CardTitle className="text-base">Slow-Moving Stock Warning ({summary.slowMovingCount} products)</CardTitle>
                                </div>
                                <CardDescription>These products have less than 2 units sold during this period. Review stock levels.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {summary.slowMovingSample.map((item) => (
                                        <div key={item.productId} className="px-3 py-1 rounded border bg-background text-xs">
                                            <span className="font-semibold">{item.name}</span>
                                            <span className="text-muted-foreground ml-2">Stock: {item.currentStock}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : null}
        </div>
    );
};
