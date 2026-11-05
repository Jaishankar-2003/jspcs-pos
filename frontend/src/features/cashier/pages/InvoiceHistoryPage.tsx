import { useState, useEffect } from 'react';
import {
    Search,
    Download,
    Eye,
    RotateCcw,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/utils';
import { salesApi } from '@/api/sales';
import { returnsApi } from '@/api/returns';
import toast from 'react-hot-toast';
import type { InvoiceResponse } from '@/types';

export const InvoiceHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    // Return modal state
    const [returnInvoice, setReturnInvoice] = useState<InvoiceResponse | null>(null);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [refundMode, setRefundMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [returnItems, setReturnItems] = useState<{ [productId: string]: { quantity: number; condition: 'SELLABLE' | 'DAMAGED' } }>({});
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await salesApi.getAll();
            setInvoices(data);
        } catch (error) {
            console.error("Failed to load invoices", error);
            toast.error("Failed to load invoice history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(inv =>
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToCSV = () => {
        if (invoices.length === 0) return;
        const headers = ["Invoice Number", "Date", "Time", "Customer", "Amount", "Payment Mode", "Cashier"];
        const rows = invoices.map(inv => [
            inv.invoiceNumber || inv.id,
            inv.invoiceDate,
            inv.invoiceTime,
            inv.customerName || "Walk-in",
            inv.grandTotal,
            inv.paymentMode || "CASH",
            inv.cashierName || "admin"
        ].map(e => `"${e}"`).join(","));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenReturn = (inv: InvoiceResponse) => {
        setReturnInvoice(inv);
        setReturnReason('');
        setRefundMode((inv.paymentMode as 'CASH' | 'CARD' | 'UPI') || 'CASH');
        const initialMap: Record<string, { quantity: number; condition: 'SELLABLE' | 'DAMAGED' }> = {};
        inv.items.forEach(item => {
            initialMap[item.productId] = { quantity: 0, condition: 'SELLABLE' };
        });
        setReturnItems(initialMap);
        setIsReturnOpen(true);
    };

    const handleSubmitReturn = async () => {
        if (!returnInvoice) return;
        
        const itemsToReturn = Object.entries(returnItems)
            .filter(([, val]) => val.quantity > 0)
            .map(([productId, val]) => ({
                productId,
                quantity: val.quantity,
                condition: val.condition
            }));

        if (itemsToReturn.length === 0) {
            toast.error("Please enter at least 1 item quantity to return");
            return;
        }

        try {
            setSubmittingReturn(true);
            await returnsApi.create({
                saleId: returnInvoice.id,
                refundMode,
                reason: returnReason || "Customer return",
                items: itemsToReturn
            });
            toast.success("Sales return processed successfully!");
            setIsReturnOpen(false);
            fetchInvoices();
        } catch (error) {
            console.error("Return failed", error);
            toast.error("Failed to process return");
        } finally {
            setSubmittingReturn(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
                    <p className="text-muted-foreground">Review and manage past sales transactions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export All
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Sales Transactions</CardTitle>
                            <CardDescription>A complete log of generated invoices.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by INV# or customer..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No invoices found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-mono font-medium">{inv.invoiceNumber || inv.id.substring(0, 8)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {inv.invoiceDate} <span className="text-xs">{inv.invoiceTime}</span>
                                        </TableCell>
                                        <TableCell>{inv.customerName || 'Walk-in'}</TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                                inv.paymentMode === "CASH" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                                inv.paymentMode === "UPI" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                                inv.paymentMode === "CARD" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                                !inv.paymentMode && "bg-gray-100 text-gray-500 border-gray-200"
                                            )}>
                                                {inv.paymentMode || 'CASH'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">₹{Number(inv.grandTotal || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-sm">@{inv.cashierName || 'admin'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setSelectedInvoice(inv); setIsDetailOpen(true); }}
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    onClick={() => handleOpenReturn(inv)}
                                                    title="Process Return"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Invoice Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Invoice: ${selectedInvoice?.invoiceNumber || selectedInvoice?.id || ''}`}
                description={`Date: ${selectedInvoice?.invoiceDate} ${selectedInvoice?.invoiceTime} | Cashier: @${selectedInvoice?.cashierName || 'admin'}`}
            >
                {selectedInvoice && (
                    <div className="space-y-4 pt-2">
                        <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center text-sm">
                            <div>
                                <span className="text-muted-foreground">Customer: </span>
                                <span className="font-semibold">{selectedInvoice.customerName || 'Walk-in'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Payment: </span>
                                <span className="font-semibold">{selectedInvoice.paymentMode}</span>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{item.productName}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">₹{item.unitPrice}</TableCell>
                                            <TableCell className="text-right font-semibold">₹{item.subtotal || item.finalAmount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-col items-end pt-2 space-y-1 text-sm border-t">
                            <div className="flex justify-between w-48">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>₹{Number(selectedInvoice.subtotal || selectedInvoice.grandTotal).toLocaleString()}</span>
                            </div>
                            {Number(selectedInvoice.discountAmount || 0) > 0 && (
                                <div className="flex justify-between w-48 text-emerald-600">
                                    <span>Discount:</span>
                                    <span>-₹{Number(selectedInvoice.discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between w-48 text-base font-bold pt-1 border-t">
                                <span>Grand Total:</span>
                                <span className="text-primary">₹{Number(selectedInvoice.grandTotal).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Return Modal */}
            <Modal
                isOpen={isReturnOpen}
                onClose={() => setIsReturnOpen(false)}
                title={`Process Return: ${returnInvoice?.invoiceNumber || ''}`}
                description="Select the products and quantities to return."
            >
                {returnInvoice && (
                    <div className="space-y-4 pt-2">
                        <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                            {returnInvoice.items?.map((item) => {
                                const currentEntry = returnItems[item.productId] || { quantity: 0, condition: 'SELLABLE' };
                                return (
                                    <div key={item.productId} className="flex items-center justify-between p-2 border-b last:border-0">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{item.productName}</div>
                                            <div className="text-xs text-muted-foreground">Purchased: {item.quantity} × ₹{item.unitPrice}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    value={currentEntry.quantity}
                                                    onChange={(e) => {
                                                        const q = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                                                        setReturnItems({
                                                            ...returnItems,
                                                            [item.productId]: { ...currentEntry, quantity: q }
                                                        });
                                                    }}
                                                    className="h-8 text-center"
                                                />
                                            </div>
                                            <select
                                                value={currentEntry.condition}
                                                onChange={(e) => {
                                                    setReturnItems({
                                                        ...returnItems,
                                                        [item.productId]: { ...currentEntry, condition: e.target.value as 'SELLABLE' | 'DAMAGED' }
                                                    });
                                                }}
                                                className="h-8 text-xs border rounded px-2 bg-background"
                                            >
                                                <option value="SELLABLE">Sellable</option>
                                                <option value="DAMAGED">Damaged</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Refund Method</label>
                                <select
                                    value={refundMode}
                                    onChange={(e) => setRefundMode(e.target.value as 'CASH' | 'CARD' | 'UPI')}
                                    className="w-full h-9 border rounded px-2 text-sm bg-background mt-1"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                                <Input
                                    placeholder="e.g. Defective, change of mind"
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="h-9 mt-1 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button variant="outline" onClick={() => setIsReturnOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitReturn} disabled={submittingReturn}>
                                {submittingReturn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm Return
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
