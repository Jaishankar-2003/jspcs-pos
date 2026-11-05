import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    ShoppingBag,
    PackageCheck,
    XCircle,
    Trash2,
    Loader2
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { purchasesApi } from '@/api/purchases';
import { suppliersApi } from '@/api/suppliers';
import { productsApi } from '@/api/products';
import type { Purchase, Supplier, Product } from '@/types';
import toast from 'react-hot-toast';

export const PurchasesPage = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [poNotes, setPoNotes] = useState('');
    const [poItems, setPoItems] = useState<{ productId: string; orderedQuantity: number; unitCost: number; batchNumber: string; expiryDate: string }[]>([]);
    const [submittingPo, setSubmittingPo] = useState(false);

    // Receive Modal state
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [receiveInputs, setReceiveInputs] = useState<{ [itemId: string]: { received: number; damaged: number; batch: string; expiry: string } }>({});
    const [submittingReceive, setSubmittingReceive] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [poData, supData, prodData] = await Promise.all([
                purchasesApi.getAll(),
                suppliersApi.getAll(),
                productsApi.getAll()
            ]);
            setPurchases(poData);
            setSuppliers(supData);
            setProducts(prodData);
        } catch (error) {
            console.error('Failed to load purchases data', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setSelectedSupplierId(suppliers[0]?.id || '');
        setPoNotes('');
        setPoItems([{ productId: products[0]?.id || '', orderedQuantity: 10, unitCost: Number(products[0]?.costPrice || products[0]?.sellingPrice || 10), batchNumber: '', expiryDate: '' }]);
        setIsCreateOpen(true);
    };

    const handleAddItem = () => {
        setPoItems([...poItems, { productId: products[0]?.id || '', orderedQuantity: 10, unitCost: Number(products[0]?.costPrice || products[0]?.sellingPrice || 10), batchNumber: '', expiryDate: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        setPoItems(poItems.filter((_, idx) => idx !== index));
    };

    const handleCreatePo = async () => {
        if (!selectedSupplierId) {
            toast.error("Please select a supplier");
            return;
        }
        if (poItems.length === 0) {
            toast.error("Please add at least one product");
            return;
        }

        try {
            setSubmittingPo(true);
            await purchasesApi.create({
                supplierId: selectedSupplierId,
                notes: poNotes,
                items: poItems.map(item => ({
                    productId: item.productId,
                    orderedQuantity: item.orderedQuantity,
                    unitCost: item.unitCost,
                    batchNumber: item.batchNumber || undefined,
                    expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : undefined
                }))
            });
            toast.success("Purchase order created! Note: Stock increases only after receiving goods.");
            setIsCreateOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to create PO", error);
            toast.error("Failed to create PO");
        } finally {
            setSubmittingPo(false);
        }
    };

    const handleOpenReceive = (po: Purchase) => {
        setSelectedPurchase(po);
        const map: Record<string, { received: number; damaged: number; batch: string; expiry: string }> = {};
        po.items.forEach(item => {
            const remaining = item.orderedQuantity - (item.receivedQuantity || 0) - (item.damagedQuantity || 0);
            map[item.id!] = {
                received: Math.max(0, remaining),
                damaged: 0,
                batch: item.batchNumber || '',
                expiry: item.expiryDate ? item.expiryDate.slice(0, 10) : ''
            };
        });
        setReceiveInputs(map);
        setIsReceiveOpen(true);
    };

    const handleConfirmReceive = async () => {
        if (!selectedPurchase) return;

        const payloadItems = Object.entries(receiveInputs).map(([itemId, val]) => ({
            itemId,
            receivedQuantity: Number(val.received) || 0,
            damagedQuantity: Number(val.damaged) || 0,
            batchNumber: val.batch || undefined,
            expiryDate: val.expiry ? new Date(val.expiry).toISOString() : undefined
        }));

        try {
            setSubmittingReceive(true);
            await purchasesApi.receiveGoods(selectedPurchase.id, payloadItems);
            toast.success("Goods receipt confirmed! Stock levels updated.");
            setIsReceiveOpen(false);
            fetchData();
        } catch (error) {
            console.error("Receive failed", error);
            toast.error("Failed to confirm receipt");
        } finally {
            setSubmittingReceive(false);
        }
    };

    const handleCancelPo = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this purchase order?")) return;
        try {
            await purchasesApi.cancel(id);
            toast.success("Purchase order cancelled");
            fetchData();
        } catch (error) {
            toast.error("Failed to cancel PO");
        }
    };

    const filteredPurchases = purchases.filter(p => {
        const matchesSearch = p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'RECEIVED':
                return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'PARTIALLY_RECEIVED':
                return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'ORDERED':
                return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'DRAFT':
                return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
            case 'CANCELLED':
                return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Management</h1>
                    <p className="text-muted-foreground">Order inventory from suppliers and confirm received stock.</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search PO# or supplier..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {['ALL', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${statusFilter === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                >
                                    {st.replace('_', ' ')}
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
                    ) : filteredPurchases.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p>No purchase orders found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.map((po) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="font-mono font-medium">{po.purchaseNumber}</TableCell>
                                        <TableCell>{po.supplierName}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(po.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(po.status)}`}>
                                                {po.status.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            ₹{Number(po.totalAmount).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-50"
                                                        onClick={() => handleOpenReceive(po)}
                                                        title="Receive Goods"
                                                    >
                                                        <PackageCheck className="mr-1 h-3.5 w-3.5" />
                                                        Receive
                                                    </Button>
                                                )}
                                                {po.status === 'ORDERED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-rose-500 hover:text-rose-600"
                                                        onClick={() => handleCancelPo(po.id)}
                                                        title="Cancel PO"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Purchase Order Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Purchase Order"
                description="Draft order for supplier. Stock will NOT increase until goods are confirmed."
            >
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Supplier *</label>
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                                className="w-full h-9 border rounded px-2 text-sm bg-background mt-1"
                            >
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Order Notes</label>
                            <Input
                                placeholder="Payment terms or instructions..."
                                value={poNotes}
                                onChange={(e) => setPoNotes(e.target.value)}
                                className="h-9 mt-1 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Order Items</label>
                            <Button size="sm" variant="ghost" onClick={handleAddItem} className="h-7 text-xs text-primary">
                                <Plus className="h-3 w-3 mr-1" /> Add Product
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto border rounded-lg p-2">
                            {poItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 border-b last:border-0 bg-card">
                                    <select
                                        value={item.productId}
                                        onChange={(e) => {
                                            const p = products.find(prod => prod.id === e.target.value);
                                            const updated = [...poItems];
                                            updated[idx].productId = e.target.value;
                                            if (p) updated[idx].unitCost = Number(p.costPrice || p.sellingPrice || 0);
                                            setPoItems(updated);
                                        }}
                                        className="h-8 flex-1 border rounded px-2 text-xs bg-background"
                                    >
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.orderedQuantity}
                                        onChange={(e) => {
                                            const updated = [...poItems];
                                            updated[idx].orderedQuantity = parseInt(e.target.value) || 0;
                                            setPoItems(updated);
                                        }}
                                        className="w-16 h-8 text-center text-xs"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Cost"
                                        value={item.unitCost}
                                        onChange={(e) => {
                                            const updated = [...poItems];
                                            updated[idx].unitCost = parseFloat(e.target.value) || 0;
                                            setPoItems(updated);
                                        }}
                                        className="w-20 h-8 text-center text-xs"
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => handleRemoveItem(idx)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                        <span className="text-sm font-semibold">
                            Total: ₹{poItems.reduce((acc, it) => acc + (it.orderedQuantity * it.unitCost), 0).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreatePo} disabled={submittingPo}>
                                {submittingPo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm PO
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Receive Goods Modal */}
            <Modal
                isOpen={isReceiveOpen}
                onClose={() => setIsReceiveOpen(false)}
                title={`Confirm Goods Receipt: ${selectedPurchase?.purchaseNumber || ''}`}
                description="Stock will increase for confirmed received quantities. Damaged units will be quarantined."
            >
                {selectedPurchase && (
                    <div className="space-y-4 pt-2">
                        <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-3">
                            {selectedPurchase.items?.map((item) => {
                                const inputs = receiveInputs[item.id!] || { received: 0, damaged: 0, batch: '', expiry: '' };
                                const remaining = item.orderedQuantity - (item.receivedQuantity || 0) - (item.damagedQuantity || 0);

                                return (
                                    <div key={item.id} className="p-3 border rounded-lg bg-card/50 space-y-2">
                                        <div className="flex justify-between items-center text-sm font-semibold">
                                            <span>{item.productName}</span>
                                            <span className="text-xs text-muted-foreground">Remaining: {remaining} of {item.orderedQuantity}</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[11px] text-emerald-600 font-medium">Received Qty</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={remaining}
                                                    value={inputs.received}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        setReceiveInputs({
                                                            ...receiveInputs,
                                                            [item.id!]: { ...inputs, received: val }
                                                        });
                                                    }}
                                                    className="h-8 text-xs font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-rose-500 font-medium">Damaged/Reject</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={inputs.damaged}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        setReceiveInputs({
                                                            ...receiveInputs,
                                                            [item.id!]: { ...inputs, damaged: val }
                                                        });
                                                    }}
                                                    className="h-8 text-xs text-rose-500 font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-muted-foreground font-medium">Batch #</label>
                                                <Input
                                                    placeholder="BATCH-123"
                                                    value={inputs.batch}
                                                    onChange={(e) => {
                                                        setReceiveInputs({
                                                            ...receiveInputs,
                                                            [item.id!]: { ...inputs, batch: e.target.value }
                                                        });
                                                    }}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-muted-foreground font-medium">Expiry Date</label>
                                                <Input
                                                    type="date"
                                                    value={inputs.expiry}
                                                    onChange={(e) => {
                                                        setReceiveInputs({
                                                            ...receiveInputs,
                                                            [item.id!]: { ...inputs, expiry: e.target.value }
                                                        });
                                                    }}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
                            <Button onClick={handleConfirmReceive} disabled={submittingReceive}>
                                {submittingReceive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm Goods Receipt
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
