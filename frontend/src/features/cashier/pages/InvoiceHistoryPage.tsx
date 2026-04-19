import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Calendar,
    Eye,
    FileText,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import { salesApi } from '@/api/sales';
import toast from 'react-hot-toast';
import type { InvoiceResponse } from '@/types';

export const InvoiceHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const data = await salesApi.getAll();
                // Sort by date desc (assuming ID or date sorting from backend or here)
                // Backend usually filters by ID asc/desc. Let's sorting client side for now.
                const sorted = data.sort((a, b) => new Date(b.invoiceDate + ' ' + b.invoiceTime).getTime() - new Date(a.invoiceDate + ' ' + a.invoiceTime).getTime());
                setInvoices(sorted);
            } catch (error) {
                console.error("Failed to load invoices", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToCSV = () => {
        if (invoices.length === 0) return;
        const headers = ["Invoice Number", "Date", "Customer", "Amount", "Status", "Payment Mode"];
        const rows = invoices.map(inv => [
            inv.invoiceNumber,
            `${inv.invoiceDate} ${inv.invoiceTime}`,
            inv.customerName || "Walk-in",
            inv.grandTotal,
            inv.status || "PAID",
            inv.paymentMode || "-"
        ].map(e => `"${e}"`).join(","));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "invoices_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
                    <p className="text-muted-foreground">Review and manage past sales transactions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => toast("Date filtering coming soon!")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Today
                    </Button>
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
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by INV# or customer..."
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
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                                        <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
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
                                                {inv.paymentMode || 'PENDING'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">₹{inv.grandTotal?.toLocaleString()}</TableCell>
                                        <TableCell className="text-sm">@{inv.cashierName || 'admin'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon">
                                                    <FileText className="h-4 w-4" />
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
        </div>
    );
};
