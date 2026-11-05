import { useState, useEffect } from 'react';
import {
    Clock,
    Lock,
    Unlock,
    Banknote,
    CreditCard,
    Smartphone,
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
import { Modal } from '@/components/ui/Modal';
import { shiftsApi } from '@/api/shifts';
import type { CashierShift } from '@/types';
import toast from 'react-hot-toast';

export const ShiftsPage = () => {
    const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
    const [allShifts, setAllShifts] = useState<CashierShift[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isOpenModalActive, setIsOpenModalActive] = useState(false);
    const [isCloseModalActive, setIsCloseModalActive] = useState(false);
    const [openingCashInput, setOpeningCashInput] = useState('1000');
    const [actualCashInput, setActualCashInput] = useState('');
    const [shiftNotes, setShiftNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchShiftData = async () => {
        try {
            setLoading(true);
            const [all] = await Promise.all([
                shiftsApi.getAll()
            ]);
            setAllShifts(all);

            try {
                const cur = await shiftsApi.getCurrent();
                setCurrentShift(cur);
            } catch (err: any) {
                // 404 means no active open shift
                setCurrentShift(null);
            }
        } catch (error) {
            console.error('Failed to load shift data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShiftData();
    }, []);

    const handleOpenShift = async () => {
        try {
            setSubmitting(true);
            const opened = await shiftsApi.openShift(parseFloat(openingCashInput) || 0, shiftNotes);
            toast.success("Shift opened successfully! Cash drawer initialized.");
            setCurrentShift(opened);
            setIsOpenModalActive(false);
            fetchShiftData();
        } catch (error: any) {
            console.error("Open shift failed", error);
            toast.error(error.response?.data?.detail || "Failed to open shift");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!actualCashInput) {
            toast.error("Please enter the counted cash amount");
            return;
        }

        try {
            setSubmitting(true);
            const closed = await shiftsApi.closeShift(parseFloat(actualCashInput) || 0, shiftNotes);
            const diff = Number(closed.cashDifference || 0);
            if (diff === 0) {
                toast.success("Shift closed cleanly! Cash matched expected amount.");
            } else if (diff > 0) {
                toast.success(`Shift closed. Cash overage: +₹${diff}`);
            } else {
                toast.error(`Shift closed. Cash shortage: -₹${Math.abs(diff)}`);
            }
            setCurrentShift(null);
            setIsCloseModalActive(false);
            fetchShiftData();
        } catch (error: any) {
            console.error("Close shift failed", error);
            toast.error(error.response?.data?.detail || "Failed to close shift");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cashier Shifts & Cash Drawer</h1>
                    <p className="text-muted-foreground">Reconcile opening float, cash sales, refunds, and closing drawer balances.</p>
                </div>
                {!currentShift ? (
                    <Button onClick={() => setIsOpenModalActive(true)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Unlock className="mr-2 h-4 w-4" />
                        Open Shift
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={() => { setActualCashInput(''); setIsCloseModalActive(true); }}>
                        <Lock className="mr-2 h-4 w-4" />
                        Close Active Shift
                    </Button>
                )}
            </div>

            {/* Current Active Shift Status Card */}
            {currentShift ? (
                <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <Clock className="h-5 w-5" />
                                <CardTitle className="text-lg">Active Shift: Started at {new Date(currentShift.openedAt).toLocaleTimeString()}</CardTitle>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-700 font-bold text-xs rounded-full border border-emerald-500/30">
                                OPEN
                            </span>
                        </div>
                        <CardDescription>Track cash sales and live expected drawer count in real time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-3 bg-background border rounded-xl">
                                <span className="text-xs text-muted-foreground block">Opening Cash</span>
                                <span className="text-xl font-bold">₹{Number(currentShift.openingCash).toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-background border rounded-xl">
                                <span className="text-xs text-muted-foreground block flex items-center gap-1">
                                    <Banknote className="h-3 w-3 text-orange-500" /> Cash Sales
                                </span>
                                <span className="text-xl font-bold text-orange-600">₹{Number(currentShift.cashSales).toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-background border rounded-xl">
                                <span className="text-xs text-muted-foreground block flex items-center gap-1">
                                    <Smartphone className="h-3 w-3 text-blue-500" /> UPI Sales
                                </span>
                                <span className="text-xl font-bold text-blue-600">₹{Number(currentShift.upiSales).toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-background border rounded-xl">
                                <span className="text-xs text-muted-foreground block flex items-center gap-1">
                                    <CreditCard className="h-3 w-3 text-emerald-500" /> Card Sales
                                </span>
                                <span className="text-xl font-bold text-emerald-600">₹{Number(currentShift.cardSales).toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-background border rounded-xl border-primary/40 bg-primary/5">
                                <span className="text-xs text-primary font-semibold block">Expected Cash Drawer</span>
                                <span className="text-2xl font-black text-primary">₹{Number(currentShift.closingCashExpected || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                        <Lock className="h-10 w-10 text-muted-foreground opacity-40" />
                        <div>
                            <h3 className="font-semibold text-lg">No Shift Currently Open</h3>
                            <p className="text-sm text-muted-foreground">Open your shift before billing to track cash float and end-of-day drawer reconciliation.</p>
                        </div>
                        <Button onClick={() => setIsOpenModalActive(true)}>
                            <Unlock className="mr-2 h-4 w-4" /> Start Shift Now
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Shift Audit History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Shift Reconciliation History</CardTitle>
                    <CardDescription>Audited records of cashier shifts, cash expected vs counted, and discrepancies.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : allShifts.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No shift records found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Opened At</TableHead>
                                    <TableHead>Closed At</TableHead>
                                    <TableHead className="text-right">Opening Float</TableHead>
                                    <TableHead className="text-right">Cash Sales</TableHead>
                                    <TableHead className="text-right">Expected Cash</TableHead>
                                    <TableHead className="text-right">Counted Cash</TableHead>
                                    <TableHead className="text-right">Difference</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allShifts.map((s) => {
                                    const diff = Number(s.cashDifference || 0);
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-semibold">@{s.cashierUsername || 'cashier'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{new Date(s.openedAt).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}</TableCell>
                                            <TableCell className="text-right">₹{Number(s.openingCash).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-medium">₹{Number(s.cashSales).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-semibold">₹{Number(s.closingCashExpected || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-semibold">{s.closingCashActual !== null ? `₹${Number(s.closingCashActual).toLocaleString()}` : '-'}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {s.closingCashActual !== null ? (
                                                    <span className={diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                                                        {diff > 0 ? `+₹${diff}` : diff < 0 ? `-₹${Math.abs(diff)}` : '₹0'}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${s.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                                    {s.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Open Shift Modal */}
            <Modal
                isOpen={isOpenModalActive}
                onClose={() => setIsOpenModalActive(false)}
                title="Open Cashier Shift"
                description="Enter the starting cash drawer float to begin."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Opening Cash Float (₹) *</label>
                        <Input
                            type="number"
                            placeholder="e.g. 1000"
                            value={openingCashInput}
                            onChange={(e) => setOpeningCashInput(e.target.value)}
                            className="text-lg font-bold h-11"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Shift Notes</label>
                        <Input
                            placeholder="e.g. Morning counter shift"
                            value={shiftNotes}
                            onChange={(e) => setShiftNotes(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" onClick={() => setIsOpenModalActive(false)}>Cancel</Button>
                        <Button onClick={handleOpenShift} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Start Shift
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Close Shift Modal */}
            <Modal
                isOpen={isCloseModalActive}
                onClose={() => setIsCloseModalActive(false)}
                title="Close Shift & Cash Reconciliation"
                description="Count physical cash in the drawer and enter the total."
            >
                {currentShift && (
                    <div className="space-y-4 pt-2">
                        <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Expected Cash in Drawer:</span>
                            <span className="font-bold text-lg text-primary">₹{Number(currentShift.closingCashExpected || 0).toLocaleString()}</span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Actual Counted Cash (₹) *</label>
                            <Input
                                type="number"
                                placeholder="Enter physical cash in drawer..."
                                value={actualCashInput}
                                onChange={(e) => setActualCashInput(e.target.value)}
                                className="text-xl font-bold h-12"
                                autoFocus
                            />
                        </div>

                        {actualCashInput && (
                            <div className="flex justify-between items-center p-3 border rounded-lg text-sm">
                                <span>Difference:</span>
                                <span className={`font-bold text-base ${parseFloat(actualCashInput) - Number(currentShift.closingCashExpected || 0) === 0 ? 'text-emerald-600' : (parseFloat(actualCashInput) - Number(currentShift.closingCashExpected || 0) > 0 ? 'text-blue-600' : 'text-rose-600')}`}>
                                    {parseFloat(actualCashInput) - Number(currentShift.closingCashExpected || 0) >= 0 ? '+' : ''}
                                    ₹{(parseFloat(actualCashInput) - Number(currentShift.closingCashExpected || 0)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Handover Notes</label>
                            <Input
                                placeholder="Explain any discrepancy or handover notes..."
                                value={shiftNotes}
                                onChange={(e) => setShiftNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button variant="outline" onClick={() => setIsCloseModalActive(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleCloseShift} disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm & Close Shift
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
