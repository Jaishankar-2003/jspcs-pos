import { useState } from 'react';
import {
    Search,
    Filter,
    Download,
    Calendar,
    Eye,
    FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';

export const InvoiceHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock invoices data
    const invoicesData = [
        { id: 1, number: "INV-2024-001", date: "2024-01-16 10:15", customer: "Walk-in Customer", total: 1250.50, paymentMode: "CASH", cashier: "admin" },
        { id: 2, number: "INV-2024-002", date: "2024-01-16 11:30", customer: "John Doe", total: 3420.00, paymentMode: "UPI", cashier: "admin" },
        { id: 3, number: "INV-2024-003", date: "2024-01-16 12:45", customer: "Walk-in Customer", total: 450.00, paymentMode: "CARD", cashier: "cashier1" },
        { id: 4, number: "INV-2024-004", date: "2024-01-16 13:20", customer: "Walk-in Customer", total: 890.00, paymentMode: "CASH", cashier: "admin" },
        { id: 5, number: "INV-2024-005", date: "2024-01-16 14:10", customer: "Sarah Smith", total: 125.00, paymentMode: "UPI", cashier: "cashier1" },
    ];

    const filteredInvoices = invoicesData.filter(inv =>
        inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
                    <p className="text-muted-foreground">Review and manage past sales transactions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Today
                    </Button>
                    <Button variant="outline">
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
                                    <TableCell className="font-mono font-medium">{inv.number}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                                    <TableCell>{inv.customer}</TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                            inv.paymentMode === "CASH" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                            inv.paymentMode === "UPI" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                            inv.paymentMode === "CARD" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}>
                                            {inv.paymentMode}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">₹{inv.total.toLocaleString()}</TableCell>
                                    <TableCell className="text-sm">@{inv.cashier}</TableCell>
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
                </CardContent>
            </Card>
        </div>
    );
};
