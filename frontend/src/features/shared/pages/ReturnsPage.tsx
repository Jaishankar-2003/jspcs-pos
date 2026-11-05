import { useState, useEffect } from 'react';
import {
    Search,
    RotateCcw,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { returnsApi } from '@/api/returns';
import { salesApi } from '@/api/sales';
import type { SalesReturn, InvoiceResponse } from '@/types';
import toast from 'react-hot-toast';

export const ReturnsPage = () => {
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Invoice Search & Return Processing
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
    const [searchingInvoice, setSearchingInvoice] = useState(false);
    const [matchedInvoice, setMatchedInvoice] = useState<InvoiceResponse | null>(null);
    const [returnItems, setReturnItems] = useState<{ [productId: string]: { quantity: number; condition: 'SELLABLE' | 'DAMAGED' } }>({});
    const [refundMode, setRefundMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [returnReason, setReturnReason] = useState('');
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const data = await returnsApi.getAll();
            setReturns(data);
        } catch (error) {
            console.error('Failed to load returns', error);
            toast.error('Failed to load returns history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns();
    }, []);

    const handleSearchInvoice = async () => {
        if (!invoiceSearchQuery.trim()) {
            toast.error("Please enter an invoice ID or invoice number");
            return;
        }

        try {
            setSearchingInvoice(true);
            const allInvoices = await salesApi.getAll();
            const found = allInvoices.find(inv =>
                inv.id.toLowerCase() === invoiceSearchQuery.trim().toLowerCase() ||
                (inv.invoiceNumber && inv.invoiceNumber.toLowerCase() === invoiceSearchQuery.trim().toLowerCase())
            );

            if (!found) {
                toast.error("No matching invoice found");
                setMatchedInvoice(null);
                return;
            }

            setMatchedInvoice(found);
            setRefundMode((found.paymentMode as 'CASH' | 'CARD' | 'UPI') || 'CASH');
            const map: Record<string, { quantity: number; condition: 'SELLABLE' | 'DAMAGED' }> = {};
            found.items.forEach(it => {
                map[it.productId] = { quantity: 0, condition: 'SELLABLE' };
            });
            setReturnItems(map);
            toast.success(`Found invoice #${found.invoiceNumber || found.id.slice(0, 8)}`);
        } catch (error) {
            console.error("Invoice search failed", error);
            toast.error("Error searching invoice");
        } finally {
            setSearchingInvoice(false);
        }
    };

    const handleProcessReturn = async () => {
        if (!matchedInvoice) return;

        const itemsToReturn = Object.entries(returnItems)
            .filter(([, val]) => val.quantity > 0)
            .map(([productId, val]) => ({
                productId,
                quantity: val.quantity,
                condition: val.condition
            }));

        if (itemsToReturn.length === 0) {
            toast.error("Enter at least 1 item quantity to return");
            return;
        }

        try {
            setSubmittingReturn(true);
            await returnsApi.create({
                saleId: matchedInvoice.id,
                refundMode,
                reason: returnReason || "Customer return",
                items: itemsToReturn
            });

            toast.success("Return processed successfully!");
            setMatchedInvoice(null);
            setInvoiceSearchQuery('');
            fetchReturns();
        } catch (error) {
            console.error("Return failed", error);
            toast.error("Return failed");
        } finally {
            setSubmittingReturn(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sales Returns & Refunds</h1>
                <p className="text-muted-foreground">Process invoice returns, audit refund records, and track sellable vs damaged items.</p>
            </div>

            {/* Quick Invoice Return Lookup Box */}
            <Card className="border-primary/20 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-primary" />
                        Initiate a Return
                    </CardTitle>
                    <CardDescription>Enter the customer's Invoice ID or Invoice Number to look up purchased items.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 max-w-md">
                        <Input
                            placeholder="e.g. INV-20261105-XXXX or invoice ID..."
                            value={invoiceSearchQuery}
                            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                        />
                        <Button onClick={handleSearchInvoice} disabled={searchingInvoice}>
                            {searchingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Find Invoice
                        </Button>
                    </div>

                    {matchedInvoice && (
                        <div className="p-4 border rounded-xl bg-card space-y-4 animate-in fade-in">
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <div>
                                    <span className="font-bold text-base">{matchedInvoice.invoiceNumber || matchedInvoice.id}</span>
                                    <span className="text-muted-foreground ml-3">{matchedInvoice.invoiceDate} {matchedInvoice.invoiceTime}</span>
                                </div>
                                <span className="font-semibold text-primary">Original Total: ₹{matchedInvoice.grandTotal}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Purchased Items</label>
                                {matchedInvoice.items?.map((item) => {
                                    const entry = returnItems[item.productId] || { quantity: 0, condition: 'SELLABLE' };
                                    return (
                                        <div key={item.productId} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                                            <div>
                                                <div className="font-medium text-sm">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">Original Qty: {item.quantity} | Unit Price: ₹{item.unitPrice}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground">Return Qty:</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={item.quantity}
                                                        value={entry.quantity}
                                                        onChange={(e) => {
                                                            const q = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                                                            setReturnItems({
                                                                ...returnItems,
                                                                [item.productId]: { ...entry, quantity: q }
                                                            });
                                                        }}
                                                        className="w-16 h-8 text-center text-xs font-semibold"
                                                    />
                                                </div>
                                                <select
                                                    value={entry.condition}
                                                    onChange={(e) => {
                                                        setReturnItems({
                                                            ...returnItems,
                                                            [item.productId]: { ...entry, condition: e.target.value as any }
                                                        });
                                                    }}
                                                    className="h-8 text-xs border rounded px-2 bg-background"
                                                >
                                                    <option value="SELLABLE">Sellable (Restock)</option>
                                                    <option value="DAMAGED">Damaged (Quarantine)</option>
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Refund Method</label>
                                    <select
                                        value={refundMode}
                                        onChange={(e) => setRefundMode(e.target.value as any)}
                                        className="w-full h-9 border rounded px-2 text-sm bg-background mt-1"
                                    >
                                        <option value="CASH">Cash Refund</option>
                                        <option value="CARD">Card Refund</option>
                                        <option value="UPI">UPI Refund</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Return Reason</label>
                                    <Input
                                        placeholder="Reason for customer return..."
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        className="h-9 mt-1 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button variant="outline" size="sm" onClick={() => setMatchedInvoice(null)}>Cancel</Button>
                                <Button size="sm" onClick={handleProcessReturn} disabled={submittingReturn}>
                                    {submittingReturn ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    Confirm Return & Refund
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Returns History Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Return History</CardTitle>
                            <CardDescription>All processed returns and customer refunds.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search return# or invoice#..."
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
                    ) : returns.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <RotateCcw className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p>No returns processed yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return #</TableHead>
                                    <TableHead>Original Invoice</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Refund Mode</TableHead>
                                    <TableHead className="text-right">Refund Amount</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns
                                    .filter(r => r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || (r.saleInvoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-mono font-medium">{r.returnNumber}</TableCell>
                                            <TableCell className="font-mono text-xs">{r.saleInvoiceNumber || r.saleId.slice(0, 8)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(r.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm">@{r.cashierName || 'cashier'}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-muted border">
                                                    {r.refundMode}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-rose-500">
                                                -₹{Number(r.totalRefundAmount).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{r.returnReason || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
