import {
    BarChart3,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Download,
    Calendar as CalendarIcon,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatsCard } from '@/components/ui/StatsCard';

export const ReportsPage = () => {
    const dateRange = 'Last 30 Days';

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
                    value="₹12,45,850"
                    icon={DollarSign}
                    description="+12.5% from last period"
                    trend={{ value: 12.5, isPositive: true }}
                />
                <StatsCard
                    title="Total Sales"
                    value="4,850"
                    icon={ShoppingBag}
                    description="+5.2% from last period"
                    trend={{ value: 5.2, isPositive: true }}
                />
                <StatsCard
                    title="Avg. Ticket Size"
                    value="₹256"
                    icon={TrendingUp}
                    description="-1.4% from last period"
                    trend={{ value: 1.4, isPositive: false }}
                />
                <StatsCard
                    title="Net Profit"
                    value="₹3,12,000"
                    icon={BarChart3}
                    description="+8.3% from last period"
                    trend={{ value: 8.3, isPositive: true }}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Over Time</CardTitle>
                        <CardDescription>Daily revenue trends for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border border-dashed rounded-lg mx-6 mb-6">
                        <div className="text-center text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>Revenue chart visualizing data across {dateRange}</p>
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
                            {[
                                { name: "Beverages", value: "₹4.2L", per: 75 },
                                { name: "Bakery", value: "₹2.8L", per: 60 },
                                { name: "Snacks", value: "₹1.5L", per: 45 },
                                { name: "Dairy", value: "1.2L", per: 30 }
                            ].map((cat, i) => (
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

            <Card>
                <CardHeader>
                    <CardTitle>Recent Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold">Peak Sales Achievement</h4>
                                <p className="text-sm text-muted-foreground">Your sales on Sunday reached ₹1.2L, which is 25% higher than average weekends.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600">
                                <ArrowDownRight className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold">Inventory Alert</h4>
                                <p className="text-sm text-muted-foreground">3 high-velocity items are nearing low-stock levels. Consider restocking soon.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
