import { useState } from 'react';
import {
    Package,
    AlertTriangle,
    ArrowUpRight,
    Search,
    Filter,
    RefreshCcw,
    History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import { StatsCard } from '@/components/ui/StatsCard';

export const InventoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock inventory data
    const inventoryData = [
        { id: 1, name: "Premium Coffee Beans", sku: "PROD-001", currentStock: 45, minStock: 20, status: "In Stock", lastUpdated: "2h ago" },
        { id: 2, name: "Organic Green Tea", sku: "PROD-002", currentStock: 12, minStock: 15, status: "Low Stock", lastUpdated: "5h ago" },
        { id: 3, name: "Whole Wheat Bread", sku: "PROD-003", currentStock: 5, minStock: 10, status: "Low Stock", lastUpdated: "1h ago" },
        { id: 4, name: "Salted Butter", sku: "PROD-004", currentStock: 28, minStock: 15, status: "In Stock", lastUpdated: "3d ago" },
        { id: 5, name: "Dark Chocolate 70%", sku: "PROD-005", currentStock: 0, minStock: 10, status: "Out of Stock", lastUpdated: "10m ago" },
    ];

    const filteredInventory = inventoryData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground">Monitor stock levels and track inventory movement.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <History className="mr-2 h-4 w-4" />
                        Stock History
                    </Button>
                    <Button>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Update Stock
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Items"
                    value="1,248"
                    icon={Package}
                    description="Across all categories"
                />
                <StatsCard
                    title="Low Stock Items"
                    value="12"
                    icon={AlertTriangle}
                    description="Action required"
                    trend={{ value: 2, isPositive: false }}
                />
                <StatsCard
                    title="Out of Stock"
                    value="3"
                    icon={Package}
                    description="Lost sales opportunity"
                />
                <StatsCard
                    title="Stock Value"
                    value="₹4.2L"
                    icon={ArrowUpRight}
                    description="Current valuation"
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Inventory Overview</CardTitle>
                            <CardDescription>A detailed list of your current inventory status.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search inventory..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">Min. Required</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInventory.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="text-right font-bold">{item.currentStock}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{item.minStock}</TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                            item.status === "In Stock" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                            item.status === "Low Stock" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                            item.status === "Out of Stock" && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        )}>
                                            {item.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.lastUpdated}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Adjust</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
