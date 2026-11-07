import { useState, useEffect, useMemo } from 'react';
import {
    Package,
    AlertTriangle,
    Search,
    Loader2,
    ArrowDownRight,
    ArrowUpRight,
    TrendingUp,
    History,
    Boxes,
    Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { productsApi } from '@/api/products';
import { inventoryApi } from '@/api/inventory';
import type { Product, StockMovement, ProductBatch } from '@/types';
import toast from 'react-hot-toast';

export const InventoryPage = () => {
    const [activeTab, setActiveTab] = useState<'stock' | 'ledger' | 'batches'>('stock');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [batches, setBatches] = useState<ProductBatch[]>([]);
    const [valuation, setValuation] = useState<{
        totalProducts: number;
        totalStockUnits: number;
        unitsBreakdown?: Record<string, number>;
        lowStockCount?: number;
        outOfStockCount?: number;
        healthyStockCount?: number;
        costValuation: number;
        retailValuation: number;
        netRetailValuation?: number;
        potentialGrossProfit?: number;
        potentialMargin: number;
        productValuations?: any[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Adjust Stock modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newStock, setNewStock] = useState('');
    const [newThreshold, setNewThreshold] = useState('');
    const [adjustReason, setAdjustReason] = useState('Manual physical count adjustment');
    const [savingAdjust, setSavingAdjust] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const [prodData, valData] = await Promise.all([
                productsApi.getAll(),
                inventoryApi.getValuation()
            ]);
            setProducts(prodData);
            setValuation(valData);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async () => {
        try {
            const data = await inventoryApi.getMovements({ limit: 100 });
            setMovements(data);
        } catch (error) {
            console.error("Failed to load ledger", error);
        }
    };

    const fetchBatches = async () => {
        try {
            const data = await inventoryApi.getBatches('all');
            setBatches(data);
        } catch (error) {
            console.error("Failed to load batches", error);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    useEffect(() => {
        if (activeTab === 'ledger') fetchMovements();
        if (activeTab === 'batches') fetchBatches();
    }, [activeTab]);

    const handleOpenAdjust = (product: Product) => {
        setSelectedProduct(product);
        setNewStock(product.currentStock?.toString() || '0');
        setNewThreshold(product.low_stock_threshold?.toString() || '10');
        setAdjustReason('Manual physical count adjustment');
        setIsAdjustModalOpen(true);
    };

    const handleUpdateStock = async () => {
        if (!selectedProduct) return;
        try {
            setSavingAdjust(true);
            await productsApi.updateStock(selectedProduct.id, parseInt(newStock));
            if (parseInt(newThreshold) !== selectedProduct.low_stock_threshold) {
                await productsApi.update(selectedProduct.id, {
                    low_stock_threshold: parseInt(newThreshold)
                });
            }
            setIsAdjustModalOpen(false);
            fetchInventory();
            toast.success('Inventory stock updated and logged in ledger!');
        } catch (error) {
            console.error("Failed to update inventory", error);
            toast.error("Failed to update inventory");
        } finally {
            setSavingAdjust(false);
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

    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.low_stock_threshold || 10) && (p.currentStock || 0) > 0).length;
    const outOfStockCount = products.filter(p => (p.currentStock || 0) <= 0).length;

    const valMap = useMemo(() => {
        const map = new Map<string, any>();
        if (valuation?.productValuations) {
            valuation.productValuations.forEach(pv => map.set(pv.id, pv));
        }
        return map;
    }, [valuation]);

    const unitsSummary = useMemo(() => {
        if (!valuation?.unitsBreakdown) return '';
        const entries = Object.entries(valuation.unitsBreakdown);
        if (entries.length === 0) return '';
        return entries.map(([u, q]) => `${q} ${u}`).slice(0, 3).join(', ');
    }, [valuation]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory & Stock Ledger</h1>
                    <p className="text-muted-foreground">Monitor stock levels, audit movements, track near-expiry batches, and review valuation.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border ${activeTab === 'stock' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                    >
                        <Boxes className="h-4 w-4" /> Current Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border ${activeTab === 'ledger' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                    >
                        <History className="h-4 w-4" /> Movement Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab('batches')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border ${activeTab === 'batches' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                    >
                        <Clock className="h-4 w-4" /> Batches & Expiry
                    </button>
                </div>
            </div>

            {/* Valuation KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatsCard
                    title="Total Inventory Units"
                    value={valuation ? Number(valuation.totalStockUnits).toLocaleString() : '0'}
                    icon={Package}
                    description={unitsSummary || `${products.length} catalog items`}
                    trend={{ value: 0, isPositive: true }}
                />
                <StatsCard
                    title="Cost Valuation"
                    value={`₹${valuation ? Number(valuation.costValuation).toLocaleString() : '0'}`}
                    icon={ArrowDownRight}
                    description="Asset value (purchase cost)"
                    trend={{ value: 0, isPositive: true }}
                />
                <StatsCard
                    title="Retail Valuation"
                    value={`₹${valuation ? Number(valuation.retailValuation).toLocaleString() : '0'}`}
                    icon={ArrowUpRight}
                    description="Potential sales at retail"
                    trend={{ value: 0, isPositive: true }}
                />
                <StatsCard
                    title="Potential Gross Profit"
                    value={`₹${valuation ? Number(valuation.potentialGrossProfit || 0).toLocaleString() : '0'}`}
                    icon={TrendingUp}
                    description={`${valuation?.potentialMargin || 0}% margin (excl. GST)`}
                    trend={{ value: valuation?.potentialMargin || 0, isPositive: (valuation?.potentialMargin || 0) >= 0 }}
                />
                <StatsCard
                    title="Stock Health Alerts"
                    value={`${(valuation?.lowStockCount ?? lowStockCount) + (valuation?.outOfStockCount ?? outOfStockCount)}`}
                    icon={AlertTriangle}
                    description={`${valuation?.outOfStockCount ?? outOfStockCount} Out, ${valuation?.lowStockCount ?? lowStockCount} Low, ${valuation?.healthyStockCount ?? Math.max(0, products.length - lowStockCount - outOfStockCount)} Well`}
                    trend={{ value: 0, isPositive: false }}
                />
            </div>

            {/* TAB 1: Current Stock */}
            {activeTab === 'stock' && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search product or SKU..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {['all', 'low', 'out', 'instock'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${statusFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                    >
                                        {f === 'all' ? 'All Items' : f === 'low' ? `Low Stock (${lowStockCount})` : f === 'out' ? `Out of Stock (${outOfStockCount})` : 'In Stock'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : paginatedInventory.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">No matching inventory items.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="whitespace-nowrap min-w-[180px]">Product</TableHead>
                                            <TableHead className="whitespace-nowrap min-w-[110px]">SKU</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[100px]">Unit Cost</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[120px]">Selling Price</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[100px]">MRP</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[120px]">Current Stock</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[120px]">Stock Value</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[120px]">Est. Gross Profit</TableHead>
                                            <TableHead className="text-center whitespace-nowrap min-w-[110px]">Status</TableHead>
                                            <TableHead className="text-right whitespace-nowrap min-w-[110px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedInventory.map((item) => {
                                            const threshold = item.low_stock_threshold || 10;
                                            const isLow = (item.currentStock || 0) <= threshold;
                                            const isOut = (item.currentStock || 0) <= 0;
                                            const val = valMap.get(item.id);

                                            const unitCost = val ? Number(val.costPrice || 0) : Number(item.costPrice || 0);
                                            const sellingPrice = val ? Number(val.sellingPrice || 0) : Number(item.sellingPrice || 0);
                                            const mrp = val?.mrp ?? item.mrp;
                                            const retailValue = val ? Number(val.retailValue || 0) : ((item.currentStock || 0) * sellingPrice);
                                            const estProfit = val ? Number(val.estimatedProfit || 0) : (unitCost > 0 ? (retailValue - (item.currentStock || 0) * unitCost) : 0);

                                            return (
                                                <TableRow key={item.id} className="hover:bg-muted/20">
                                                    <TableCell className="min-w-[180px]">
                                                        <div className="font-semibold text-foreground">{item.name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.category || '-'}</div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{item.sku}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {unitCost > 0 ? (
                                                            <span>₹{unitCost.toFixed(2)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs italic">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <div>₹{sellingPrice.toFixed(2)}</div>
                                                        <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                                                            {item.isInclusive ? 'Incl. GST' : '+GST'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {mrp ? (
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">₹{Number(mrp).toFixed(2)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap font-bold text-base">
                                                        {item.currentStock || 0}{' '}
                                                        <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                                                            {item.unitOfMeasure || 'PCS'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap font-semibold">
                                                        ₹{retailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {unitCost > 0 ? (
                                                            <span className={estProfit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                                                ₹{estProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs italic">Cost N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center whitespace-nowrap">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${isOut ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : isLow ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <Button size="sm" variant="outline" onClick={() => handleOpenAdjust(item)}>
                                                            Adjust Stock
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t text-sm">
                                <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
                                    <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 2: Movement Ledger */}
            {activeTab === 'ledger' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Movement Ledger</CardTitle>
                        <CardDescription>Audited trace of all sales, purchase receipts, adjustments, returns, and damages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {movements.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">No stock movements recorded yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Movement Type</TableHead>
                                        <TableHead className="text-right">Prev</TableHead>
                                        <TableHead className="text-right">Change</TableHead>
                                        <TableHead className="text-right">New</TableHead>
                                        <TableHead>Reason / Reference</TableHead>
                                        <TableHead>User</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(m.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm">
                                                {m.productName} <span className="text-xs text-muted-foreground font-mono">({m.productSku})</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-muted border font-mono">
                                                    {m.movementType}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">{m.previousQuantity}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={m.quantityChanged > 0 ? 'text-emerald-600' : m.quantityChanged < 0 ? 'text-rose-600' : 'text-muted-foreground'}>
                                                    {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{m.newQuantity}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{m.reason || '-'}</TableCell>
                                            <TableCell className="text-xs">@{m.creatorUsername || 'system'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 3: Batches & Expiry */}
            {activeTab === 'batches' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Batch & Expiry Monitoring</CardTitle>
                        <CardDescription>Track perishable items, FEFO allocation order, and upcoming expiration dates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {batches.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">No product batches registered yet. Batches are created automatically upon receiving purchases.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Batch #</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead className="text-right">Available Qty</TableHead>
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead>Expiry Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batches.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-semibold">{b.productName} <span className="text-xs text-muted-foreground font-mono">({b.productSku})</span></TableCell>
                                            <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(b.expiryDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{b.currentQuantity}</TableCell>
                                            <TableCell className="text-right">₹{b.costPrice}</TableCell>
                                            <TableCell>
                                                {b.isExpired ? (
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                                        EXPIRED (Sale Blocked)
                                                    </span>
                                                ) : b.daysUntilExpiry <= 30 ? (
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                        Near Expiry ({b.daysUntilExpiry} days)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        Fresh ({b.daysUntilExpiry} days)
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Adjust Stock Modal */}
            <Modal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                title={`Adjust Stock: ${selectedProduct?.name || ''}`}
                description="Update the physical quantity. Every change is logged in the Stock Movement Ledger."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">New Stock Quantity *</label>
                        <Input
                            type="number"
                            min="0"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            className="text-lg font-bold"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Low Stock Alert Threshold</label>
                        <Input
                            type="number"
                            min="0"
                            value={newThreshold}
                            onChange={(e) => setNewThreshold(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Reason for Adjustment</label>
                        <Input
                            placeholder="e.g. Annual physical count, found undamaged"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateStock} disabled={savingAdjust}>
                            {savingAdjust ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Adjustment
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
