import { useState, useEffect } from 'react';
import {
    Package,
    AlertTriangle,
    ArrowUpRight,
    Search,
    RefreshCcw,
    Loader2,
    Settings2,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import { StatsCard } from '@/components/ui/StatsCard';
import { productsApi } from '@/api/products';
import { Modal } from '@/components/ui/Modal';
import type { Product } from '@/types';

export const InventoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, low, out, instock
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newStock, setNewStock] = useState('');
    const [newThreshold, setNewThreshold] = useState('');

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const data = await productsApi.getAll();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleOpenAdjust = (product: Product) => {
        setSelectedProduct(product);
        setNewStock(product.currentStock?.toString() || '0');
        setNewThreshold(product.low_stock_threshold?.toString() || '10');
        setIsAdjustModalOpen(true);
    };

    const handleUpdateStock = async () => {
        if (!selectedProduct) return;
        try {
            await productsApi.updateStock(selectedProduct.id, parseInt(newStock));
            if (parseInt(newThreshold) !== selectedProduct.low_stock_threshold) {
                await productsApi.update(selectedProduct.id, {
                    low_stock_threshold: parseInt(newThreshold)
                });
            }
            setIsAdjustModalOpen(false);
            fetchInventory();
            alert('Inventory updated successfully!');
        } catch (error) {
            console.error("Failed to update inventory", error);
            alert("Failed to update inventory.");
        }
    };

    const filteredInventory = products.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const threshold = item.low_stock_threshold || 10;
        const isLow = (item.currentStock || 0) <= threshold;
        const isOut = (item.currentStock || 0) <= 0;

        if (statusFilter === 'low') return matchesSearch && isLow && !isOut;
        if (statusFilter === 'out') return matchesSearch && isOut;
        if (statusFilter === 'instock') return matchesSearch && !isLow;
        return matchesSearch;
    });

    const lowStockCount = products.filter(p => {
        const t = p.low_stock_threshold || 10;
        return (p.currentStock || 0) <= t && (p.currentStock || 0) > 0;
    }).length;
    
    const outOfStockCount = products.filter(p => (p.currentStock || 0) <= 0).length;
    const totalStockValue = products.reduce((acc, p) => acc + ((p.sellingPrice || 0) * (p.currentStock || 0)), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground">Monitor stock levels and track inventory movement.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchInventory}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Items"
                    value={products.length.toString()}
                    icon={Package}
                    description="Unique SKUs"
                />
                <StatsCard
                    title="Low Stock Items"
                    value={lowStockCount.toString()}
                    icon={AlertTriangle}
                    description="Action required"
                    trend={{ value: lowStockCount, isPositive: false }}
                />
                <StatsCard
                    title="Out of Stock"
                    value={outOfStockCount.toString()}
                    icon={Package}
                    description="Lost sales opportunity"
                />
                <StatsCard
                    title="Inventory Value"
                    value={`₹${(totalStockValue / 1000).toFixed(1)}K`}
                    icon={ArrowUpRight}
                    description="Based on selling price"
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Inventory Overview</CardTitle>
                            <CardDescription>Real-time stock levels across all products.</CardDescription>
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
                            <div className="flex items-center bg-muted rounded-lg p-1">
                                <Button 
                                    variant={statusFilter === 'all' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    onClick={() => setStatusFilter('all')}
                                    className="text-xs h-8 px-2"
                                >
                                    All
                                </Button>
                                <Button 
                                    variant={statusFilter === 'instock' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    onClick={() => setStatusFilter('instock')}
                                    className="text-xs h-8 px-2 text-emerald-500"
                                >
                                    In Stock
                                </Button>
                                <Button 
                                    variant={statusFilter === 'low' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    onClick={() => setStatusFilter('low')}
                                    className="text-xs h-8 px-2 text-amber-500"
                                >
                                    Low
                                </Button>
                                <Button 
                                    variant={statusFilter === 'out' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    onClick={() => setStatusFilter('out')}
                                    className="text-xs h-8 px-2 text-rose-500"
                                >
                                    Out
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Unit</TableHead>
                                    <TableHead className="text-right">Threshold</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map((item) => {
                                    const threshold = item.low_stock_threshold || 10;
                                    const isLow = (item.currentStock || 0) <= threshold;
                                    const isOut = (item.currentStock || 0) <= 0;
                                    
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={cn(isLow ? "text-rose-500" : "text-emerald-500")}>
                                                    {item.currentStock}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {item.unitOfMeasure}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-muted-foreground">{threshold}</span>
                                                    <Settings2 className="h-3 w-3 text-muted-foreground opacity-50" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                                    !isLow && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                                    isLow && !isOut && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                                    isOut && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                )}>
                                                    {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenAdjust(item)}>Adjust</Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                title="Inventory Settings"
                description={`Update stock and threshold for ${selectedProduct?.name}`}
            >
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock Count ({selectedProduct?.unitOfMeasure})</label>
                            <Input
                                type="number"
                                value={newStock}
                                onChange={(e) => setNewStock(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Low Stock Threshold</label>
                            <Input
                                type="number"
                                value={newThreshold}
                                onChange={(e) => setNewThreshold(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateStock}>Apply Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
