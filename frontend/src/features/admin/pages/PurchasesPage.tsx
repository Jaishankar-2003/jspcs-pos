import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    ShoppingBag,
    PackageCheck,
    XCircle,
    Trash2,
    Loader2,
    Paperclip,
    FileText,
    Eye,
    Download,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Building2,
    Layers,
    FileUp,
    Check,
    Clock
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
import type { Purchase, Supplier, Product, GoodsReceipt, PurchaseAttachment } from '@/types';
import toast from 'react-hot-toast';

const PURCHASE_UNITS = [
    { label: 'Unit', value: 'Unit', defaultFactor: 1 },
    { label: 'Piece (PCS)', value: 'Piece', defaultFactor: 1 },
    { label: 'Pack', value: 'Pack', defaultFactor: 10 },
    { label: 'Box', value: 'Box', defaultFactor: 24 },
    { label: 'Carton', value: 'Carton', defaultFactor: 48 },
    { label: 'Bag', value: 'Bag', defaultFactor: 25 },
    { label: 'Case', value: 'Case', defaultFactor: 12 },
    { label: 'Custom', value: 'Custom', defaultFactor: 1 }
];

const GST_RATES = [
    { label: '0% GST (Nil)', value: 0 },
    { label: '5% GST (CGST 2.5% + SGST 2.5%)', value: 5 },
    { label: '12% GST (CGST 6% + SGST 6%)', value: 12 },
    { label: '18% GST (CGST 9% + SGST 9%)', value: 18 },
    { label: '28% GST (CGST 14% + SGST 14%)', value: 28 },
    { label: 'Custom / Manual Tax %', value: -1 }
];

interface FormItem {
    productId: string;
    purchaseUnit: string;
    conversionFactor: number;
    purchaseQuantity: number;
    purchaseUnitPrice: number;
    taxRate: number;
    taxType: string;
    isInclusive: boolean;
    discountPercent: number;
    additionalCharges: number;
    batchNumber: string;
    expiryDate: string;
    isManualTax?: boolean;
}

interface BatchEntry {
    batchNumber: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    damagedQuantity: number;
    mfgDate: string;
    expiryDate: string;
    purchaseCost: number;
    mrp: number;
    notes: string;
}

export const PurchasesPage: React.FC = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [isInterstate, setIsInterstate] = useState(false);
    const [poStatus, setPoStatus] = useState<'DRAFT' | 'ORDERED'>('ORDERED');
    const [paymentTerms, setPaymentTerms] = useState('Net 30');
    const [dueDate, setDueDate] = useState('');
    const [poNotes, setPoNotes] = useState('');
    const [poItems, setPoItems] = useState<FormItem[]>([]);
    const [createAttachmentFiles, setCreateAttachmentFiles] = useState<File[]>([]);
    const [createAttachmentCategory, setCreateAttachmentCategory] = useState('SUPPLIER_QUOTATION');
    const [submittingPo, setSubmittingPo] = useState(false);

    // Receive Modal state (GRN & Multi-Batch)
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [grnInvoiceNumber, setGrnInvoiceNumber] = useState('');
    const [grnInvoiceDate, setGrnInvoiceDate] = useState('');
    const [grnInvoiceTotal, setGrnInvoiceTotal] = useState<number | ''>('');
    const [grnNotes, setGrnNotes] = useState('');
    const [grnItemBatches, setGrnItemBatches] = useState<Record<string, BatchEntry[]>>({});
    const [grnAttachmentFiles, setGrnAttachmentFiles] = useState<File[]>([]);
    const [grnAttachmentCategory, setGrnAttachmentCategory] = useState('PURCHASE_INVOICE');
    const [submittingReceive, setSubmittingReceive] = useState(false);

    // Details & GRN History Modal state
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [activeDetailsPurchase, setActiveDetailsPurchase] = useState<Purchase | null>(null);
    const [detailsGrns, setDetailsGrns] = useState<GoodsReceipt[]>([]);
    const [detailsAttachments, setDetailsAttachments] = useState<PurchaseAttachment[]>([]);
    const [detailsTab, setDetailsTab] = useState<'ITEMS' | 'GRNS' | 'ATTACHMENTS'>('ITEMS');
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);
    const [newAttachmentCategory, setNewAttachmentCategory] = useState('BILL_PHOTO');
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

    // Create PO Handlers
    const handleOpenCreate = () => {
        const firstSupplier = suppliers[0]?.id || '';
        const firstProduct = products[0];
        setSelectedSupplierId(firstSupplier);
        setIsInterstate(false);
        setPoStatus('ORDERED');
        setPaymentTerms('Net 30');
        setDueDate('');
        setPoNotes('');
        setCreateAttachmentFiles([]);
        setCreateAttachmentCategory('SUPPLIER_QUOTATION');

        if (firstProduct) {
            const cost = Number(firstProduct.costPrice || firstProduct.sellingPrice || 10);
            setPoItems([{
                productId: firstProduct.id,
                purchaseUnit: 'Box',
                conversionFactor: 10,
                purchaseQuantity: 5,
                purchaseUnitPrice: cost * 10,
                taxRate: Number(firstProduct.gstRate || 5),
                taxType: 'TAXABLE',
                isInclusive: false,
                discountPercent: 0,
                additionalCharges: 0,
                batchNumber: '',
                expiryDate: ''
            }]);
        } else {
            setPoItems([]);
        }
        setIsCreateOpen(true);
    };

    const handleAddItem = () => {
        const firstProduct = products[0];
        if (!firstProduct) {
            toast.error('No products available. Please create products first.');
            return;
        }
        const cost = Number(firstProduct.costPrice || firstProduct.sellingPrice || 10);
        setPoItems([
            ...poItems,
            {
                productId: firstProduct.id,
                purchaseUnit: 'Box',
                conversionFactor: 10,
                purchaseQuantity: 5,
                purchaseUnitPrice: cost * 10,
                taxRate: Number(firstProduct.gstRate || 5),
                taxType: 'TAXABLE',
                isInclusive: false,
                discountPercent: 0,
                additionalCharges: 0,
                batchNumber: '',
                expiryDate: ''
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setPoItems(poItems.filter((_, idx) => idx !== index));
    };

    const handleProductChange = (index: number, newProductId: string) => {
        const p = products.find(prod => prod.id === newProductId);
        const updated = [...poItems];
        updated[index].productId = newProductId;
        if (p) {
            const cost = Number(p.costPrice || p.sellingPrice || 10);
            const factor = updated[index].conversionFactor || 1;
            updated[index].purchaseUnitPrice = cost * factor;
            if (!updated[index].isManualTax) {
                updated[index].taxRate = Number(p.gstRate || 5);
            }
        }
        setPoItems(updated);
    };

    const handleUnitChange = (index: number, newUnit: string) => {
        const foundUnit = PURCHASE_UNITS.find(u => u.value === newUnit);
        const factor = foundUnit ? foundUnit.defaultFactor : 1;
        const updated = [...poItems];
        updated[index].purchaseUnit = newUnit;
        updated[index].conversionFactor = factor;
        const p = products.find(prod => prod.id === updated[index].productId);
        const baseCost = Number(p?.costPrice || p?.sellingPrice || 10);
        updated[index].purchaseUnitPrice = baseCost * factor;
        setPoItems(updated);
    };

    // Calculate line item financials
    const calculateLineFinancials = (item: FormItem) => {
        const qty = item.purchaseQuantity || 0;
        const price = item.purchaseUnitPrice || 0;
        const factor = item.conversionFactor || 1;
        const totalBaseUnits = qty * factor;
        const costPerBaseUnit = factor > 0 ? price / factor : price;

        const rawTotal = qty * price;
        const discountAmount = (rawTotal * (item.discountPercent || 0)) / 100;
        const afterDiscount = Math.max(0, rawTotal - discountAmount);

        let taxableAmount = afterDiscount;
        let taxAmount = 0;

        if (item.taxType !== 'EXEMPT' && item.taxRate > 0) {
            if (item.isInclusive) {
                taxableAmount = afterDiscount / (1 + item.taxRate / 100);
                taxAmount = afterDiscount - taxableAmount;
            } else {
                taxAmount = taxableAmount * (item.taxRate / 100);
            }
        }

        const lineTotal = (item.isInclusive ? afterDiscount : (taxableAmount + taxAmount)) + (item.additionalCharges || 0);

        return {
            totalBaseUnits,
            costPerBaseUnit,
            taxableAmount,
            taxAmount,
            lineTotal
        };
    };

    // Summary calculations for PO modal
    const calculateOrderSummary = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalBaseUnits = 0;
        let totalAdditional = 0;
        let grandTotal = 0;

        poItems.forEach(item => {
            const financials = calculateLineFinancials(item);
            subtotal += financials.taxableAmount;
            totalTax += financials.taxAmount;
            totalBaseUnits += financials.totalBaseUnits;
            totalAdditional += item.additionalCharges || 0;
            grandTotal += financials.lineTotal;
        });

        const cgst = isInterstate ? 0 : totalTax / 2;
        const sgst = isInterstate ? 0 : totalTax / 2;
        const igst = isInterstate ? totalTax : 0;

        return {
            subtotal,
            totalTax,
            cgst,
            sgst,
            igst,
            totalBaseUnits,
            totalAdditional,
            grandTotal
        };
    };

    const handleCreatePo = async (statusOverride?: 'DRAFT' | 'ORDERED') => {
        if (!selectedSupplierId) {
            toast.error('Please select a supplier');
            return;
        }
        if (poItems.length === 0) {
            toast.error('Please add at least one product');
            return;
        }

        const finalStatus = statusOverride || poStatus;

        try {
            setSubmittingPo(true);
            const created = await purchasesApi.create({
                supplierId: selectedSupplierId,
                status: finalStatus,
                isInterstate,
                paymentTerms,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                notes: poNotes,
                items: poItems.map(item => {
                    const financials = calculateLineFinancials(item);
                    return {
                        productId: item.productId,
                        purchaseUnit: item.purchaseUnit,
                        conversionFactor: item.conversionFactor,
                        purchaseQuantity: item.purchaseQuantity,
                        purchaseUnitPrice: item.purchaseUnitPrice,
                        unitCost: Number(financials.costPerBaseUnit.toFixed(2)),
                        orderedQuantity: financials.totalBaseUnits,
                        baseUnit: products.find(p => p.id === item.productId)?.unitOfMeasure || 'Unit',
                        taxRate: item.taxRate,
                        taxType: item.taxType,
                        isInclusive: item.isInclusive,
                        discountPercent: item.discountPercent,
                        additionalCharges: item.additionalCharges,
                        batchNumber: item.batchNumber || undefined,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : undefined
                    };
                })
            });

            // Upload any attached files
            if (createAttachmentFiles.length > 0) {
                for (const file of createAttachmentFiles) {
                    try {
                        await purchasesApi.uploadAttachment(created.id, file, createAttachmentCategory);
                    } catch (attErr) {
                        console.error('Failed to upload attachment', attErr);
                    }
                }
            }

            if (finalStatus === 'DRAFT') {
                toast.success('Purchase Order saved as DRAFT. Stock will not change.');
            } else {
                toast.success('Purchase Order ORDERED! Stock increases strictly upon Goods Receiving (GRN).');
            }

            setIsCreateOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to create PO', error);
            toast.error('Failed to create purchase order');
        } finally {
            setSubmittingPo(false);
        }
    };

    // Confirm Draft PO
    const handleConfirmDraftPo = async (po: Purchase) => {
        try {
            await purchasesApi.confirm(po.id);
            toast.success(`PO ${po.purchaseNumber} confirmed and set to ORDERED!`);
            fetchData();
        } catch (error) {
            console.error('Failed to confirm draft PO', error);
            toast.error('Failed to confirm purchase order');
        }
    };

    // Receive Goods Modal Handlers (GRN & Multi-Batch)
    const handleOpenReceive = (po: Purchase) => {
        setSelectedPurchase(po);
        setGrnInvoiceNumber(po.supplierInvoiceNumber || '');
        setGrnInvoiceDate(po.supplierInvoiceDate ? po.supplierInvoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setGrnInvoiceTotal(po.totalAmount || '');
        setGrnNotes('');
        setGrnAttachmentFiles([]);
        setGrnAttachmentCategory('PURCHASE_INVOICE');

        const initialBatches: Record<string, BatchEntry[]> = {};

        po.items.forEach(item => {
            const factor = item.conversionFactor || 1;
            const remainingBase = item.orderedQuantity - (item.receivedQuantity || 0) - (item.damagedQuantity || 0);
            const remainingPurchase = factor > 0 ? Number((remainingBase / factor).toFixed(2)) : remainingBase;
            const unitPrice = item.purchaseUnitPrice || (item.unitCost * factor);

            initialBatches[item.id!] = [
                {
                    batchNumber: item.batchNumber || `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                    receivedQuantity: Math.max(0, remainingPurchase),
                    acceptedQuantity: Math.max(0, remainingPurchase),
                    damagedQuantity: 0,
                    mfgDate: '',
                    expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                    purchaseCost: unitPrice,
                    mrp: Number(item.unitCost * 1.3),
                    notes: ''
                }
            ];
        });

        setGrnItemBatches(initialBatches);
        setIsReceiveOpen(true);
    };

    const handleAddBatchRow = (itemId: string, item: Purchase['items'][0]) => {
        const currentBatches = grnItemBatches[itemId] || [];
        const factor = item.conversionFactor || 1;
        const unitPrice = item.purchaseUnitPrice || (item.unitCost * factor);

        const newBatch: BatchEntry = {
            batchNumber: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            receivedQuantity: 0,
            acceptedQuantity: 0,
            damagedQuantity: 0,
            mfgDate: '',
            expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
            purchaseCost: unitPrice,
            mrp: Number(item.unitCost * 1.3),
            notes: ''
        };

        setGrnItemBatches({
            ...grnItemBatches,
            [itemId]: [...currentBatches, newBatch]
        });
    };

    const handleRemoveBatchRow = (itemId: string, batchIdx: number) => {
        const currentBatches = grnItemBatches[itemId] || [];
        if (currentBatches.length <= 1) {
            toast.error('Each item must have at least one batch entry');
            return;
        }
        setGrnItemBatches({
            ...grnItemBatches,
            [itemId]: currentBatches.filter((_, idx) => idx !== batchIdx)
        });
    };

    const handleUpdateBatchField = (
        itemId: string,
        batchIdx: number,
        field: keyof BatchEntry,
        value: any
    ) => {
        const currentBatches = [...(grnItemBatches[itemId] || [])];
        currentBatches[batchIdx] = {
            ...currentBatches[batchIdx],
            [field]: value
        };
        // Auto-update accepted if received changed
        if (field === 'receivedQuantity') {
            const rcv = Number(value) || 0;
            const dmg = Number(currentBatches[batchIdx].damagedQuantity) || 0;
            currentBatches[batchIdx].acceptedQuantity = Math.max(0, rcv - dmg);
        } else if (field === 'damagedQuantity') {
            const dmg = Number(value) || 0;
            const rcv = Number(currentBatches[batchIdx].receivedQuantity) || 0;
            currentBatches[batchIdx].acceptedQuantity = Math.max(0, rcv - dmg);
        }
        setGrnItemBatches({
            ...grnItemBatches,
            [itemId]: currentBatches
        });
    };

    const handleConfirmReceive = async () => {
        if (!selectedPurchase) return;

        // Validate items and batches
        const receiveItemsPayload: any[] = [];

        for (const item of selectedPurchase.items) {
            const batches = grnItemBatches[item.id!] || [];
            const factor = item.conversionFactor || 1;
            const remainingBase = item.orderedQuantity - (item.receivedQuantity || 0) - (item.damagedQuantity || 0);

            const totalReceivedPurchase = batches.reduce((acc, b) => acc + (Number(b.receivedQuantity) || 0), 0);
            const totalDamagedPurchase = batches.reduce((acc, b) => acc + (Number(b.damagedQuantity) || 0), 0);

            const totalReceivedBase = totalReceivedPurchase * factor;

            if (totalReceivedBase > remainingBase) {
                toast.error(`Received quantity for ${item.productName} exceeds remaining balance (${remainingBase} units).`);
                return;
            }

            for (const b of batches) {
                if (!b.batchNumber.trim()) {
                    toast.error(`Please provide a Batch Number for ${item.productName}`);
                    return;
                }
                if (!b.expiryDate) {
                    toast.error(`Please provide an Expiry Date for batch ${b.batchNumber}`);
                    return;
                }
            }

            receiveItemsPayload.push({
                itemId: item.id,
                receivedQuantity: totalReceivedPurchase,
                damagedQuantity: totalDamagedPurchase,
                batches: batches.map(b => ({
                    batchNumber: b.batchNumber,
                    receivedQuantity: Number(b.receivedQuantity) || 0,
                    acceptedQuantity: Number(b.acceptedQuantity) || 0,
                    damagedQuantity: Number(b.damagedQuantity) || 0,
                    mfgDate: b.mfgDate ? new Date(b.mfgDate).toISOString() : undefined,
                    expiryDate: new Date(b.expiryDate).toISOString(),
                    purchaseCost: Number(b.purchaseCost) || item.purchaseUnitPrice,
                    mrp: Number(b.mrp) || undefined,
                    notes: b.notes || undefined
                }))
            });
        }

        try {
            setSubmittingReceive(true);
            await purchasesApi.receiveGoods(selectedPurchase.id, {
                supplierInvoiceNumber: grnInvoiceNumber || undefined,
                supplierInvoiceDate: grnInvoiceDate ? new Date(grnInvoiceDate).toISOString() : undefined,
                invoiceTotal: grnInvoiceTotal ? Number(grnInvoiceTotal) : undefined,
                notes: grnNotes || undefined,
                items: receiveItemsPayload
            });

            // Upload any bill attachments for this GRN
            if (grnAttachmentFiles.length > 0) {
                for (const file of grnAttachmentFiles) {
                    try {
                        await purchasesApi.uploadAttachment(selectedPurchase.id, file, grnAttachmentCategory);
                    } catch (attErr) {
                        console.error('Failed to upload GRN attachment', attErr);
                    }
                }
            }

            toast.success('Goods receipt (GRN) confirmed! Stock and batches successfully updated.');
            setIsReceiveOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Receive failed', error);
            const msg = error.response?.data?.detail || 'Failed to confirm goods receipt';
            toast.error(msg);
        } finally {
            setSubmittingReceive(false);
        }
    };

    // Open PO Details Modal
    const handleOpenDetails = async (po: Purchase) => {
        setActiveDetailsPurchase(po);
        setDetailsTab('ITEMS');
        setIsDetailsOpen(true);
        setLoadingDetails(true);
        try {
            const [grns, atts] = await Promise.all([
                purchasesApi.getGrns(po.id),
                purchasesApi.getAttachments(po.id)
            ]);
            setDetailsGrns(grns);
            setDetailsAttachments(atts);
        } catch (err) {
            console.error('Failed to load PO details', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleUploadDetailsAttachment = async () => {
        if (!activeDetailsPurchase || !newAttachmentFile) {
            toast.error('Please select a file to upload');
            return;
        }

        try {
            setUploadingAttachment(true);
            const uploaded = await purchasesApi.uploadAttachment(
                activeDetailsPurchase.id,
                newAttachmentFile,
                newAttachmentCategory
            );
            setDetailsAttachments([uploaded, ...detailsAttachments]);
            setNewAttachmentFile(null);
            toast.success('Attachment uploaded successfully!');
            fetchData(); // updates attachment count in table
        } catch (error) {
            console.error('Failed to upload attachment', error);
            toast.error('Failed to upload attachment');
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleDeleteDetailsAttachment = async (attachmentId: string) => {
        if (!confirm('Are you sure you want to delete this attachment?')) return;
        try {
            await purchasesApi.deleteAttachment(attachmentId);
            setDetailsAttachments(detailsAttachments.filter(a => a.id !== attachmentId));
            toast.success('Attachment deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete attachment');
        }
    };

    const handleCancelPo = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this purchase order?')) return;
        try {
            await purchasesApi.cancel(id);
            toast.success('Purchase order cancelled');
            fetchData();
        } catch (error) {
            toast.error('Failed to cancel PO');
        }
    };

    const filteredPurchases = purchases.filter(p => {
        const matchesSearch = p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.supplierInvoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
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

    const orderSummary = calculateOrderSummary();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Management</h1>
                    <p className="text-muted-foreground">
                        Order in boxes, packs, or units with live GST conversion, multi-batch GRN receiving, and bill attachments.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search PO#, Supplier, Invoice#..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['ALL', 'DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === st ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                >
                                    {st.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredPurchases.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-base font-medium">No purchase orders found</p>
                            <p className="text-xs text-muted-foreground mt-1">Create a purchase order to stock your inventory.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="whitespace-nowrap min-w-[130px]">PO Number</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[160px]">Supplier</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[110px]">Date</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[120px]">Status</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[100px] text-center">Items & Units</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[80px] text-center">Docs</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[120px] text-right">Total Amount</TableHead>
                                        <TableHead className="whitespace-nowrap min-w-[180px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.map((po) => {
                                        const totalOrderedUnits = po.items.reduce((acc, it) => acc + (it.orderedQuantity || 0), 0);
                                        const totalReceivedUnits = po.items.reduce((acc, it) => acc + (it.receivedQuantity || 0), 0);

                                        return (
                                            <TableRow key={po.id} className="hover:bg-muted/20">
                                                <TableCell className="font-mono font-medium whitespace-nowrap">
                                                    <span className="text-primary font-semibold">{po.purchaseNumber}</span>
                                                    {po.supplierInvoiceNumber && (
                                                        <div className="text-[11px] text-muted-foreground font-sans">
                                                            Inv: {po.supplierInvoiceNumber}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">
                                                    {po.supplierName}
                                                    {po.isInterstate && (
                                                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                                                            IGST
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {new Date(po.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(po.status)}`}>
                                                        {po.status.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center text-xs whitespace-nowrap">
                                                    <div><span className="font-semibold">{po.items.length}</span> lines</div>
                                                    <div className="text-muted-foreground text-[11px]">
                                                        {totalReceivedUnits} / {totalOrderedUnits} units
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {(po.attachmentsCount || 0) > 0 ? (
                                                        <button
                                                            onClick={() => handleOpenDetails(po)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border"
                                                            title="View attachments"
                                                        >
                                                            <Paperclip className="h-3 w-3" />
                                                            {po.attachmentsCount}
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold whitespace-nowrap text-foreground">
                                                    ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleOpenDetails(po)}
                                                            title="View PO & GRN Details"
                                                            className="h-8 px-2 text-xs"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                                            View
                                                        </Button>

                                                        {po.status === 'DRAFT' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 px-2 text-xs text-blue-600 border-blue-600/30 hover:bg-blue-50"
                                                                onClick={() => handleConfirmDraftPo(po)}
                                                                title="Confirm and send to Supplier"
                                                            >
                                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                                Confirm
                                                            </Button>
                                                        )}

                                                        {['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 px-2 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 font-medium"
                                                                onClick={() => handleOpenReceive(po)}
                                                                title="Receive Goods (GRN)"
                                                            >
                                                                <PackageCheck className="mr-1 h-3.5 w-3.5" />
                                                                Receive
                                                            </Button>
                                                        )}

                                                        {['DRAFT', 'ORDERED'].includes(po.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                                onClick={() => handleCancelPo(po.id)}
                                                                title="Cancel PO"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CREATE PURCHASE ORDER MODAL */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Purchase Order"
                description="Purchase in boxes, cartons or units with automated base unit conversion and Indian GST calculation. Stock will NOT increase until goods are received."
                className="max-w-5xl max-h-[92vh] overflow-y-auto"
            >
                <div className="space-y-4 pt-2 text-sm">
                    {/* Header info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-primary" /> Supplier *
                            </label>
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                                className="w-full h-9 border border-input rounded px-2.5 text-xs bg-background mt-1 focus:ring-1 focus:ring-primary outline-none"
                            >
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.gstin ? `(${s.gstin})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" /> Payment Terms
                            </label>
                            <select
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value)}
                                className="w-full h-9 border border-input rounded px-2.5 text-xs bg-background mt-1 focus:ring-1 focus:ring-primary outline-none"
                            >
                                <option value="Immediate">Immediate / Cash</option>
                                <option value="Net 15">Net 15 Days</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                                <option value="Advance">100% Advance</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-primary" /> Expected Due Date
                            </label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="h-9 mt-1 text-xs"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-xs font-semibold text-muted-foreground">Order Notes / Instructions</label>
                            <Input
                                placeholder="Special handling notes, dispatch instructions, or payment details..."
                                value={poNotes}
                                onChange={(e) => setPoNotes(e.target.value)}
                                className="h-8 mt-1 text-xs"
                            />
                        </div>

                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={isInterstate}
                                    onChange={(e) => setIsInterstate(e.target.checked)}
                                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                />
                                <span>Inter-State Purchase (IGST)</span>
                            </label>
                        </div>
                    </div>

                    {/* Order Items Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                Line Items ({poItems.length})
                            </label>
                            <Button size="sm" variant="outline" onClick={handleAddItem} className="h-7 text-xs font-medium border-dashed">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                            </Button>
                        </div>

                        <div className="border border-border rounded-lg bg-card overflow-x-auto shadow-sm">
                            <Table className="min-w-[1040px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/80 text-[11px] font-semibold text-muted-foreground uppercase">
                                        <TableHead className="w-[260px] whitespace-nowrap">Product & Base Unit</TableHead>
                                        <TableHead className="w-[130px] whitespace-nowrap">Purchase Unit</TableHead>
                                        <TableHead className="w-[100px] text-center whitespace-nowrap">Units/Pack</TableHead>
                                        <TableHead className="w-[95px] text-center whitespace-nowrap">Order Qty</TableHead>
                                        <TableHead className="w-[125px] text-center whitespace-nowrap">Base Stock</TableHead>
                                        <TableHead className="w-[140px] text-right whitespace-nowrap">Unit Price (₹)</TableHead>
                                        <TableHead className="w-[130px] text-center whitespace-nowrap">GST Rate</TableHead>
                                        <TableHead className="w-[120px] text-right whitespace-nowrap">Line Total</TableHead>
                                        <TableHead className="w-[45px] text-center"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {poItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                                                No items in this order. Click &quot;Add Product&quot; to begin.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        poItems.map((item, idx) => {
                                            const p = products.find(prod => prod.id === item.productId);
                                            const financials = calculateLineFinancials(item);

                                            return (
                                                <TableRow key={idx} className="hover:bg-muted/10 transition-colors text-xs">
                                                    {/* Product Selection */}
                                                    <TableCell className="w-[260px] align-top py-2.5">
                                                        <select
                                                            value={item.productId}
                                                            onChange={(e) => handleProductChange(idx, e.target.value)}
                                                            className="h-8 w-full border border-input rounded px-2 text-xs bg-background focus:ring-1 focus:ring-primary outline-none"
                                                        >
                                                            {products.map(prod => (
                                                                <option key={prod.id} value={prod.id}>
                                                                    {prod.name} ({prod.sku})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 whitespace-nowrap">
                                                            <span>Base: <strong className="text-foreground">{p?.unitOfMeasure || 'Unit'}</strong></span>
                                                            <span>•</span>
                                                            <span>Stock: <strong className="text-foreground">{p?.availableStock ?? p?.currentStock ?? 0}</strong></span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Purchase Unit */}
                                                    <TableCell className="w-[130px] align-top py-2.5">
                                                        <select
                                                            value={item.purchaseUnit}
                                                            onChange={(e) => handleUnitChange(idx, e.target.value)}
                                                            className="h-8 w-full border border-input rounded px-2 text-xs bg-background focus:ring-1 focus:ring-primary outline-none font-medium"
                                                        >
                                                            {PURCHASE_UNITS.map(u => (
                                                                <option key={u.value} value={u.value}>{u.label}</option>
                                                            ))}
                                                        </select>
                                                    </TableCell>

                                                    {/* Units per Package Conversion */}
                                                    <TableCell className="w-[100px] align-top py-2.5">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={item.conversionFactor}
                                                            onChange={(e) => {
                                                                const updated = [...poItems];
                                                                updated[idx].conversionFactor = Math.max(1, parseFloat(e.target.value) || 1);
                                                                setPoItems(updated);
                                                            }}
                                                            className="h-8 text-center text-xs"
                                                            title="How many base units per purchase unit (e.g. 100 pcs per box)"
                                                        />
                                                    </TableCell>

                                                    {/* Purchase Quantity */}
                                                    <TableCell className="w-[95px] align-top py-2.5">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.purchaseQuantity}
                                                            onChange={(e) => {
                                                                const updated = [...poItems];
                                                                updated[idx].purchaseQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                                                setPoItems(updated);
                                                            }}
                                                            className="h-8 text-center text-xs font-semibold"
                                                        />
                                                    </TableCell>

                                                    {/* Converted Base Stock */}
                                                    <TableCell className="w-[125px] align-top py-2.5 text-center">
                                                        <div className="font-mono font-medium text-xs bg-muted/40 py-1.5 px-2 rounded whitespace-nowrap">
                                                            {financials.totalBaseUnits} {p?.unitOfMeasure || 'Units'}
                                                        </div>
                                                    </TableCell>

                                                    {/* Purchase Unit Price (e.g. per box) */}
                                                    <TableCell className="w-[140px] align-top py-2.5">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.purchaseUnitPrice}
                                                            onChange={(e) => {
                                                                const updated = [...poItems];
                                                                updated[idx].purchaseUnitPrice = parseFloat(e.target.value) || 0;
                                                                setPoItems(updated);
                                                            }}
                                                            className="h-8 text-right text-xs"
                                                        />
                                                        <div className="text-[10px] text-muted-foreground text-right mt-1 whitespace-nowrap">
                                                            ₹{financials.costPerBaseUnit.toFixed(2)} / {p?.unitOfMeasure || 'unit'}
                                                        </div>
                                                    </TableCell>

                                                    {/* GST Rate */}
                                                    <TableCell className="w-[140px] align-top py-2.5">
                                                        {item.isManualTax ? (
                                                            <div className="space-y-1">
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.01"
                                                                        placeholder="Tax %"
                                                                        value={item.taxRate}
                                                                        onChange={(e) => {
                                                                            const updated = [...poItems];
                                                                            updated[idx].taxRate = parseFloat(e.target.value) || 0;
                                                                            setPoItems(updated);
                                                                        }}
                                                                        className="h-8 text-center text-xs pr-6 font-semibold"
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...poItems];
                                                                        updated[idx].isManualTax = false;
                                                                        setPoItems(updated);
                                                                    }}
                                                                    className="text-[10px] text-primary hover:underline block text-center w-full"
                                                                >
                                                                    ← Standard slabs
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <select
                                                                    value={item.taxRate}
                                                                    onChange={(e) => {
                                                                        if (e.target.value === '-1') {
                                                                            const updated = [...poItems];
                                                                            updated[idx].isManualTax = true;
                                                                            setPoItems(updated);
                                                                        } else {
                                                                            const updated = [...poItems];
                                                                            updated[idx].taxRate = parseFloat(e.target.value) || 0;
                                                                            setPoItems(updated);
                                                                        }
                                                                    }}
                                                                    className="h-8 w-full border border-input rounded px-1.5 text-xs bg-background focus:ring-1 focus:ring-primary outline-none"
                                                                >
                                                                    {GST_RATES.map(r => (
                                                                        <option key={r.value} value={r.value}>
                                                                            {r.value === -1 ? r.label : `${r.value}% GST`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...poItems];
                                                                        updated[idx].isManualTax = true;
                                                                        setPoItems(updated);
                                                                    }}
                                                                    className="text-[10px] text-muted-foreground hover:text-primary hover:underline block text-center w-full"
                                                                >
                                                                    + Manual Tax %
                                                                </button>
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    {/* Line Total */}
                                                    <TableCell className="w-[120px] align-top py-2.5 text-right font-bold text-xs text-foreground whitespace-nowrap pt-3.5">
                                                        ₹{financials.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>

                                                    {/* Remove */}
                                                    <TableCell className="w-[45px] align-top py-2.5 text-center pt-2.5">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 justify-self-center transition-colors"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            title="Remove item"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Quotation / Bill Attachment Dropzone */}
                    <div className="bg-muted/20 border border-dashed rounded-lg p-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                                    Attach Supplier Quotation / Estimate (Optional)
                                </label>
                                <p className="text-[11px] text-muted-foreground">Upload PDF, JPG, PNG or WEBP documents up to 10MB.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={createAttachmentCategory}
                                    onChange={(e) => setCreateAttachmentCategory(e.target.value)}
                                    className="h-8 text-xs border border-input rounded px-2 bg-background"
                                >
                                    <option value="SUPPLIER_QUOTATION">Supplier Quotation</option>
                                    <option value="PURCHASE_INVOICE">Proforma / Bill</option>
                                    <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                                    <option value="OTHER">Other Document</option>
                                </select>
                                <input
                                    type="file"
                                    id="poAttachmentInput"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setCreateAttachmentFiles(Array.from(e.target.files));
                                        }
                                    }}
                                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                                />
                            </div>
                        </div>
                        {createAttachmentFiles.length > 0 && (
                            <div className="mt-2 text-xs text-emerald-600 font-medium">
                                ✓ {createAttachmentFiles.length} file(s) ready to upload: {createAttachmentFiles.map(f => f.name).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Order Financial Summary Card */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card p-3 rounded-lg border text-xs">
                        <div>
                            <span className="text-muted-foreground">Total Base Units:</span>
                            <div className="text-base font-bold text-foreground">{orderSummary.totalBaseUnits}</div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Subtotal (Taxable):</span>
                            <div className="text-base font-semibold text-foreground">
                                ₹{orderSummary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">{isInterstate ? 'IGST Total:' : 'CGST + SGST:'}</span>
                            <div className="text-base font-semibold text-purple-600">
                                ₹{orderSummary.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {!isInterstate && orderSummary.totalTax > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                    (CGST ₹{orderSummary.cgst.toFixed(2)} + SGST ₹{orderSummary.sgst.toFixed(2)})
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-muted-foreground">Grand Total:</span>
                            <div className="text-lg font-bold text-primary">
                                ₹{orderSummary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-2 pt-3 border-t">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            Inventory does not increase until Goods Receipt Note (GRN) is confirmed.
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button
                                variant="secondary"
                                onClick={() => handleCreatePo('DRAFT')}
                                disabled={submittingPo}
                            >
                                Save as Draft
                            </Button>
                            <Button
                                onClick={() => handleCreatePo('ORDERED')}
                                disabled={submittingPo}
                                className="bg-primary"
                            >
                                {submittingPo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm & Place Order
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* GOODS RECEIPT NOTE (GRN) & MULTI-BATCH MODAL */}
            <Modal
                isOpen={isReceiveOpen}
                onClose={() => setIsReceiveOpen(false)}
                title={`Confirm Goods Receipt (GRN): ${selectedPurchase?.purchaseNumber || ''}`}
                description="Record received shipments, enter supplier invoice details, allocate quantities into multiple batches, and update sellable inventory."
                className="max-w-5xl max-h-[92vh] overflow-y-auto"
            >
                {selectedPurchase && (
                    <div className="space-y-4 pt-2 text-sm">
                        {/* Supplier Bill / Invoice Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border">
                            <div>
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5 text-primary" /> Supplier Invoice # *
                                </label>
                                <Input
                                    placeholder="e.g. INV-2026-9021"
                                    value={grnInvoiceNumber}
                                    onChange={(e) => setGrnInvoiceNumber(e.target.value)}
                                    className="h-8 mt-1 text-xs font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-primary" /> Invoice Date
                                </label>
                                <Input
                                    type="date"
                                    value={grnInvoiceDate}
                                    onChange={(e) => setGrnInvoiceDate(e.target.value)}
                                    className="h-8 mt-1 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground">Invoice Total (₹)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={grnInvoiceTotal}
                                    onChange={(e) => setGrnInvoiceTotal(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                    className="h-8 mt-1 text-xs font-semibold"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground">Receiving Notes</label>
                                <Input
                                    placeholder="Delivery notes, condition..."
                                    value={grnNotes}
                                    onChange={(e) => setGrnNotes(e.target.value)}
                                    className="h-8 mt-1 text-xs"
                                />
                            </div>
                        </div>

                        {/* Items & Multi-Batch Allocation */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Received Items & Batch Allocation
                            </label>

                            {selectedPurchase.items?.map((item) => {
                                const batches = grnItemBatches[item.id!] || [];
                                const factor = item.conversionFactor || 1;
                                const remainingBase = item.orderedQuantity - (item.receivedQuantity || 0) - (item.damagedQuantity || 0);
                                const remainingPurchase = factor > 0 ? (remainingBase / factor) : remainingBase;

                                const totalBatchReceived = batches.reduce((acc, b) => acc + (Number(b.receivedQuantity) || 0), 0);
                                const totalBatchAccepted = batches.reduce((acc, b) => acc + (Number(b.acceptedQuantity) || 0), 0);
                                const totalBatchDamaged = batches.reduce((acc, b) => acc + (Number(b.damagedQuantity) || 0), 0);

                                const totalAcceptedBase = totalBatchAccepted * factor;
                                const totalDamagedBase = totalBatchDamaged * factor;

                                return (
                                    <div key={item.id} className="p-3.5 border rounded-lg bg-card shadow-sm space-y-3">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b">
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                    {item.productName}
                                                    <span className="text-xs font-normal text-muted-foreground">({item.productSku || 'SKU'})</span>
                                                    <span className="px-2 py-0.5 rounded text-[11px] bg-secondary font-medium">
                                                        Unit: {item.purchaseUnit} (1 {item.purchaseUnit} = {factor} {item.baseUnit || 'PCS'})
                                                    </span>
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-muted-foreground">
                                                    Ordered: <strong>{item.purchaseQuantity || (item.orderedQuantity / factor)} {item.purchaseUnit}</strong> ({item.orderedQuantity} base)
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Remaining: <strong className="text-primary">{remainingPurchase} {item.purchaseUnit}</strong> ({remainingBase} base)
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAddBatchRow(item.id!, item)}
                                                    className="h-7 text-xs border-dashed text-primary hover:text-primary font-medium"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add Batch
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Batch Rows */}
                                        <div className="space-y-2 overflow-x-auto">
                                            <div className="min-w-[840px] space-y-1.5">
                                                <div className="grid grid-cols-[180px_90px_90px_90px_130px_100px_90px_32px] gap-2 items-center px-2 py-1.5 bg-muted/60 rounded text-[11px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                                                    <div>Batch # *</div>
                                                    <div className="text-center">Rcv ({item.purchaseUnit})</div>
                                                    <div className="text-center text-emerald-600">Accept</div>
                                                    <div className="text-center text-rose-500">Damage</div>
                                                    <div>Expiry Date *</div>
                                                    <div>Unit Cost (₹)</div>
                                                    <div>MRP (₹)</div>
                                                    <div></div>
                                                </div>

                                                {batches.map((b, bIdx) => (
                                                    <div key={bIdx} className="grid grid-cols-[180px_90px_90px_90px_130px_100px_90px_32px] gap-2 items-center px-2 py-1.5 border rounded bg-background text-xs">
                                                        <div>
                                                            <Input
                                                                placeholder="BATCH-001"
                                                                value={b.batchNumber}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'batchNumber', e.target.value)}
                                                                className="h-7 text-xs font-mono font-medium"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={b.receivedQuantity}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'receivedQuantity', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-center text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={b.acceptedQuantity}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'acceptedQuantity', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-center text-xs font-semibold text-emerald-600 bg-emerald-50/30"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={b.damagedQuantity}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'damagedQuantity', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-center text-xs font-semibold text-rose-500 bg-rose-50/30"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="date"
                                                                value={b.expiryDate}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'expiryDate', e.target.value)}
                                                                className="h-7 text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={b.purchaseCost}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'purchaseCost', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs"
                                                                title={`Cost per ${item.purchaseUnit}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={b.mrp}
                                                                onChange={(e) => handleUpdateBatchField(item.id!, bIdx, 'mrp', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs"
                                                                placeholder="MRP"
                                                            />
                                                        </div>
                                                        <div>
                                                            {batches.length > 1 && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                                                                    onClick={() => handleRemoveBatchRow(item.id!, bIdx)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Item Batch Summary */}
                                        <div className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded text-[11px] text-muted-foreground">
                                            <div className="flex gap-4">
                                                <span>Total Received: <strong className="text-foreground">{totalBatchReceived} {item.purchaseUnit}</strong></span>
                                                <span>Accepted into Stock: <strong className="text-emerald-600">+{totalAcceptedBase} {item.baseUnit || 'PCS'}</strong></span>
                                                {totalDamagedBase > 0 && (
                                                    <span>Quarantined Damage: <strong className="text-rose-500">{totalDamagedBase} {item.baseUnit || 'PCS'}</strong></span>
                                                )}
                                            </div>
                                            <div>
                                                {totalBatchReceived === remainingPurchase ? (
                                                    <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Full allocation
                                                    </span>
                                                ) : totalBatchReceived < remainingPurchase ? (
                                                    <span className="text-amber-600 font-medium">Partial ({remainingPurchase - totalBatchReceived} remaining)</span>
                                                ) : (
                                                    <span className="text-rose-500 font-medium">Over-allocation</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bill Attachments for GRN */}
                        <div className="bg-muted/20 border border-dashed rounded-lg p-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <FileUp className="h-3.5 w-3.5 text-primary" />
                                        Attach Physical Bill Photo / Delivery Challan
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">Upload bill photos or scanned delivery challans (PDF, PNG, JPG).</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={grnAttachmentCategory}
                                        onChange={(e) => setGrnAttachmentCategory(e.target.value)}
                                        className="h-8 text-xs border border-input rounded px-2 bg-background"
                                    >
                                        <option value="PURCHASE_INVOICE">Supplier Tax Invoice</option>
                                        <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                                        <option value="BILL_PHOTO">Bill Photo</option>
                                        <option value="OTHER">Other Document</option>
                                    </select>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setGrnAttachmentFiles(Array.from(e.target.files));
                                            }
                                        }}
                                        className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                                    />
                                </div>
                            </div>
                            {grnAttachmentFiles.length > 0 && (
                                <div className="mt-2 text-xs text-emerald-600 font-medium">
                                    ✓ {grnAttachmentFiles.length} file(s) attached: {grnAttachmentFiles.map(f => f.name).join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center pt-3 border-t">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Accepted units will immediately become sellable stock in POS billing.
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleConfirmReceive}
                                    disabled={submittingReceive}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                >
                                    {submittingReceive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm Goods Receipt (GRN)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* VIEW PO, GRNS & ATTACHMENTS DETAILS MODAL */}
            <Modal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                title={`Purchase Order: ${activeDetailsPurchase?.purchaseNumber || ''}`}
                description={`Supplier: ${activeDetailsPurchase?.supplierName || ''} | Status: ${activeDetailsPurchase?.status || ''}`}
                className="max-w-4xl max-h-[92vh] overflow-y-auto"
            >
                {activeDetailsPurchase && (
                    <div className="space-y-4 pt-2 text-sm">
                        {/* Tab Switcher */}
                        <div className="flex gap-2 border-b pb-2">
                            <button
                                onClick={() => setDetailsTab('ITEMS')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${detailsTab === 'ITEMS' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                PO Items ({activeDetailsPurchase.items.length})
                            </button>
                            <button
                                onClick={() => setDetailsTab('GRNS')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${detailsTab === 'GRNS' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Goods Receipts / GRNs ({detailsGrns.length})
                            </button>
                            <button
                                onClick={() => setDetailsTab('ATTACHMENTS')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${detailsTab === 'ATTACHMENTS' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Bill Attachments ({detailsAttachments.length})
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : detailsTab === 'ITEMS' ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-muted/30 p-2.5 rounded-lg text-xs">
                                    <div><span className="text-muted-foreground">PO Number:</span> <strong className="font-mono text-foreground">{activeDetailsPurchase.purchaseNumber}</strong></div>
                                    <div><span className="text-muted-foreground">Supplier:</span> <strong className="text-foreground">{activeDetailsPurchase.supplierName}</strong></div>
                                    <div><span className="text-muted-foreground">Tax Mode:</span> <strong className="text-foreground">{activeDetailsPurchase.isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</strong></div>
                                    <div><span className="text-muted-foreground">Total:</span> <strong className="text-primary font-bold">₹{Number(activeDetailsPurchase.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                                </div>

                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 text-xs">
                                                <TableHead>Product</TableHead>
                                                <TableHead>Purchase Unit</TableHead>
                                                <TableHead className="text-center">Units/Pack</TableHead>
                                                <TableHead className="text-center">Ordered Qty</TableHead>
                                                <TableHead className="text-center">Base Stock</TableHead>
                                                <TableHead className="text-center">Received</TableHead>
                                                <TableHead className="text-right">Unit Price (₹)</TableHead>
                                                <TableHead className="text-center">GST Rate</TableHead>
                                                <TableHead className="text-right">Line Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeDetailsPurchase.items.map((it) => {
                                                const factor = it.conversionFactor || 1;
                                                const purchaseQty = it.purchaseQuantity ?? (factor > 1 ? Number((it.orderedQuantity / factor).toFixed(2)) : it.orderedQuantity);
                                                const purchasePrice = it.purchaseUnitPrice ?? (factor > 1 ? it.unitCost * factor : it.unitCost);

                                                return (
                                                    <TableRow key={it.id} className="text-xs">
                                                        <TableCell className="font-medium">
                                                            <div>{it.productName}</div>
                                                            {it.productSku && <div className="text-[10px] text-muted-foreground font-mono">{it.productSku}</div>}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-primary">{it.purchaseUnit || 'Unit'}</TableCell>
                                                        <TableCell className="text-center font-medium">{factor}</TableCell>
                                                        <TableCell className="text-center font-bold">{purchaseQty}</TableCell>
                                                        <TableCell className="text-center font-mono bg-muted/30 rounded py-1 whitespace-nowrap">
                                                            {it.orderedQuantity} {it.baseUnit || 'PCS'}
                                                        </TableCell>
                                                        <TableCell className="text-center text-emerald-600 font-semibold">{it.receivedQuantity || 0}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="font-medium">₹{Number(purchasePrice).toFixed(2)}</div>
                                                            {factor > 1 && (
                                                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                    ₹{Number(it.unitCost).toFixed(2)} / {it.baseUnit || 'unit'}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium">
                                                            {it.taxRate}%
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">₹{Number(it.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : detailsTab === 'GRNS' ? (
                            <div className="space-y-4">
                                {detailsGrns.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        No Goods Receipts recorded yet for this purchase order.
                                    </div>
                                ) : (
                                    detailsGrns.map((g) => (
                                        <div key={g.id} className="border rounded-lg p-3 bg-card shadow-sm space-y-2">
                                            <div className="flex justify-between items-center border-b pb-2">
                                                <div>
                                                    <span className="font-mono font-bold text-primary">{g.grnNumber}</span>
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        Received on {new Date(g.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    {g.supplierInvoiceNumber && (
                                                        <span className="font-medium bg-muted px-2 py-0.5 rounded">
                                                            Supplier Inv: {g.supplierInvoiceNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {g.items.map((gItem) => (
                                                    <div key={gItem.id} className="bg-muted/20 p-2 rounded text-xs">
                                                        <div className="flex justify-between font-medium">
                                                            <span>{gItem.productName}</span>
                                                            <span className="text-emerald-600 font-semibold">
                                                                Accepted: {gItem.acceptedStockQuantity} PCS (Damaged: {gItem.damagedStockQuantity})
                                                            </span>
                                                        </div>

                                                        {gItem.batches && gItem.batches.length > 0 && (
                                                            <div className="mt-1.5 space-y-1">
                                                                {gItem.batches.map((b, bIdx) => (
                                                                    <div key={bIdx} className="flex justify-between text-[11px] text-muted-foreground bg-background px-2 py-1 rounded border">
                                                                        <span>Batch: <strong className="text-foreground font-mono">{b.batchNumber}</strong></span>
                                                                        <span>Accepted: <strong className="text-emerald-600">{b.convertedAcceptedQuantity}</strong> PCS</span>
                                                                        {b.expiryDate && (
                                                                            <span>Exp: {new Date(b.expiryDate).toLocaleDateString()}</span>
                                                                        )}
                                                                        {b.mrp && <span>MRP: ₹{Number(b.mrp).toFixed(2)}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Upload new attachment */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 bg-muted/30 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={newAttachmentCategory}
                                            onChange={(e) => setNewAttachmentCategory(e.target.value)}
                                            className="h-8 text-xs border border-input rounded px-2 bg-background"
                                        >
                                            <option value="BILL_PHOTO">Bill Photo</option>
                                            <option value="PURCHASE_INVOICE">Supplier Tax Invoice</option>
                                            <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                                            <option value="SUPPLIER_QUOTATION">Supplier Quotation</option>
                                            <option value="OTHER">Other Document</option>
                                        </select>
                                        <input
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                                            onChange={(e) => setNewAttachmentFile(e.target.files?.[0] || null)}
                                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handleUploadDetailsAttachment}
                                        disabled={!newAttachmentFile || uploadingAttachment}
                                    >
                                        {uploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileUp className="h-3.5 w-3.5 mr-1" />}
                                        Upload
                                    </Button>
                                </div>

                                {/* Attachment list */}
                                {detailsAttachments.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        No attachments uploaded for this purchase order yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {detailsAttachments.map((att) => (
                                            <div key={att.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-card text-xs">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Paperclip className="h-4 w-4 text-primary shrink-0" />
                                                    <div className="truncate">
                                                        <div className="font-medium text-foreground truncate" title={att.filename}>
                                                            {att.filename}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {att.documentCategory.replace('_', ' ')} • {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <a
                                                        href={purchasesApi.getAttachmentDownloadUrl(att.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted"
                                                        title="Download / View"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteDetailsAttachment(att.id)}
                                                        className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t">
                            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
export default PurchasesPage;
