import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    FileUp,
    Loader2,
    Download,
    Filter,
    CheckSquare,
    Square,
    Calculator,
    Percent,
    Tag,
    AlertCircle,
    CheckCircle2
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/utils';
import { productsApi } from '@/api/products';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

export const ProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [isCustomGst, setIsCustomGst] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [masterCategories, setMasterCategories] = useState<{ id: string, name: string }[]>([]);
    const [masterSubCategories, setMasterSubCategories] = useState<{ id: string, name: string, categoryId: string }[]>([]);
    const [masterUnits, setMasterUnits] = useState<{ id: string, name: string }[]>([]);
    
    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '',
        subCategory: '',
        costPrice: '0',
        price: '',
        mrp: '',
        targetMargin: '10',
        stock: '0',
        unit: 'unit',
        gstRate: '18',
        isInclusive: false,
        taxType: 'TAXABLE',
        customCgstRate: '',
        customSgstRate: '',
        lowStockThreshold: '10'
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [prodData, cats, subcats, uns] = await Promise.all([
                productsApi.getAll(),
                fetch('/api/masters/categories', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch('/api/masters/subcategories', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch('/api/masters/units', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
            ]);
            setProducts(prodData);
            setMasterCategories(Array.isArray(cats) ? cats : []);
            setMasterSubCategories(Array.isArray(subcats) ? subcats : []);
            setMasterUnits(Array.isArray(uns) ? uns : []);
            setSelectedIds([]); // Clear selection after fetch
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpenAdd = () => {
        setEditingProduct(null);
        setIsCustomGst(false);
        setFormData({
            sku: '',
            name: '',
            category: '',
            subCategory: '',
            costPrice: '0',
            price: '',
            mrp: '',
            targetMargin: '10',
            stock: '0',
            unit: 'unit',
            gstRate: '18',
            isInclusive: false,
            taxType: 'TAXABLE',
            customCgstRate: '9',
            customSgstRate: '9',
            lowStockThreshold: '10'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        const rateStr = product.gstRate !== undefined && product.gstRate !== null ? product.gstRate.toString() : '18';
        const hasCustomRate = !['0', '5', '12', '18', '28'].includes(rateStr) || Boolean(product.customCgstRate || product.customSgstRate);
        setIsCustomGst(hasCustomRate);
        setFormData({
            sku: product.sku || '',
            name: product.name || '',
            category: product.category || '',
            subCategory: product.subCategory || '',
            costPrice: product.costPrice?.toString() || '0',
            price: product.sellingPrice?.toString() || '0',
            mrp: product.mrp?.toString() || '',
            targetMargin: '10',
            stock: product.currentStock?.toString() || '0',
            unit: product.unitOfMeasure || 'unit',
            gstRate: rateStr,
            isInclusive: Boolean(product.isInclusive),
            taxType: product.taxType || 'TAXABLE',
            customCgstRate: product.customCgstRate?.toString() || (hasCustomRate ? (parseFloat(rateStr) / 2).toString() : ''),
            customSgstRate: product.customSgstRate?.toString() || (hasCustomRate ? (parseFloat(rateStr) / 2).toString() : ''),
            lowStockThreshold: product.low_stock_threshold?.toString() || '10'
        });
        setIsModalOpen(true);
    };

    const handleSaveProduct = async () => {
        try {
            if (!formData.name || !formData.price) {
                toast.error("Product name and selling price are required");
                return;
            }
            const sPrice = parseFloat(formData.price);
            const cPrice = parseFloat(formData.costPrice || '0');
            const mrpPrice = formData.mrp ? parseFloat(formData.mrp) : undefined;

            if (sPrice < 0 || cPrice < 0) {
                toast.error("Price and cost cannot be negative");
                return;
            }

            if (mrpPrice !== undefined) {
                if (mrpPrice < 0) {
                    toast.error("MRP cannot be negative");
                    return;
                }
                if (mrpPrice > 0 && sPrice > mrpPrice) {
                    toast.error("Selling price cannot exceed Maximum Retail Price (MRP)");
                    return;
                }
            }

            const isCustom = isCustomGst || !['0', '5', '12', '18', '28'].includes(formData.gstRate);
            if (isCustom && formData.taxType === 'TAXABLE') {
                const cgst = parseFloat(formData.customCgstRate) || 0;
                const sgst = parseFloat(formData.customSgstRate) || 0;
                const total = parseFloat(formData.gstRate) || 0;
                if (Math.abs((cgst + sgst) - total) > 0.01) {
                    toast.error(`CGST (${cgst}%) + SGST (${sgst}%) must equal Total GST (${total}%)`);
                    return;
                }
            }

            const totalGst = formData.taxType !== 'TAXABLE' ? 0 : (parseFloat(formData.gstRate) || 0);
            const payload: any = {
                sku: formData.sku,
                name: formData.name,
                category: formData.category,
                subCategory: formData.subCategory,
                costPrice: cPrice,
                sellingPrice: sPrice,
                mrp: mrpPrice,
                gstRate: totalGst,
                isInclusive: formData.isInclusive,
                taxType: formData.taxType || 'TAXABLE',
                customCgstRate: isCustom && formData.customCgstRate ? parseFloat(formData.customCgstRate) : undefined,
                customSgstRate: isCustom && formData.customSgstRate ? parseFloat(formData.customSgstRate) : undefined,
                low_stock_threshold: parseInt(formData.lowStockThreshold) || 10,
                currentStock: parseInt(formData.stock) || 0,
                unitOfMeasure: formData.unit || 'unit'
            };

            if (editingProduct) {
                await productsApi.update(editingProduct.id, payload);
                toast.success('Product updated successfully!');
            } else {
                await productsApi.create(payload);
                toast.success('Product created successfully!');
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            console.error('Failed to save product', error);
            toast.error(error.response?.data?.detail || 'Failed to save product.');
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productsApi.delete(id);
                toast.success('Product deleted successfully');
                fetchProducts();
            } catch (error) {
                console.error('Failed to delete product', error);
                toast.error('Failed to delete product.');
            }
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
            try {
                setIsDeletingBulk(true);
                const result = await productsApi.deleteBulk(selectedIds);
                toast.success(result.message || 'Bulk delete successful');
                fetchProducts();
            } catch (error) {
                console.error('Bulk delete failed', error);
                toast.error('Bulk delete failed.');
            } finally {
                setIsDeletingBulk(false);
            }
        }
    };

    const handleImport = async () => {
        if (!importFile) return;
        try {
            setImporting(true);
            const formData = new FormData();
            formData.append('file', importFile);

            const response = await fetch('/api/products/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(result.message);
                if (result.errors && result.errors.length > 0) {
                    console.warn('Import warnings:', result.errors);
                    toast(result.errors.join('\n'), { icon: '⚠️', duration: 5000 });
                }
                setIsImportModalOpen(false);
                setImportFile(null);
                fetchProducts();
            } else {
                toast.error(result.detail || 'Bulk import failed');
            }
        } catch (error) {
            console.error('Bulk import error', error);
            toast.error('Bulk import failed.');
        } finally {
            setImporting(false);
        }
    };

    const downloadSampleCSV = () => {
        const headers = "sku,name,category,brand,unitOfMeasure,costPrice,sellingPrice,mrp,gstRate,isInclusive,hsnCode,isTaxable,currentStock,lowStockThreshold\n";
        const sample = "SKU-101,Sample Product,Groceries,BrandX,kg,120.00,150.00,160.00,18,false,HSN123,true,50,10\nSKU-102,Another Product,Electronics,BrandY,unit,2000.00,2500.00,2800.00,12,true,HSN456,true,5,2";
        const blob = new Blob([headers + sample], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products_sample.csv';
        a.click();
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const uniqueCategories = Array.from(new Set([
        ...products.map(p => p.category).filter(Boolean),
        ...masterCategories.map(c => c.name)
    ]));
    const uniqueSubCategories = Array.from(new Set([
        ...products.map(p => p.subCategory).filter(Boolean),
        ...masterSubCategories.map(s => s.name)
    ]));
    const uniqueUnits = Array.from(new Set([
        ...products.map(p => p.unitOfMeasure).filter(Boolean),
        ...masterUnits.map(u => u.name)
    ]));

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search or category changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                    <p className="text-muted-foreground">Manage your inventory, prices, and categories.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <Button 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            disabled={isDeletingBulk}
                        >
                            {isDeletingBulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Bulk Upload
                    </Button>
                    <Button onClick={handleOpenAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Catalog</CardTitle>
                        <div className="flex items-center gap-4 w-full max-w-2xl">
                            <div className="flex items-center gap-2 flex-1 max-w-xs">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select
                                    className="w-full p-2 bg-background border border-input rounded-md text-sm focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
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
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <div className="flex items-center justify-center cursor-pointer" onClick={handleSelectAll}>
                                                {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-16">S.No</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Price / MRP</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Unit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProducts.map((product, index) => (
                                        <TableRow key={product.id} className={cn(selectedIds.includes(product.id) && "bg-muted/50")}>
                                            <TableCell className="w-12">
                                                <div className="flex items-center justify-center cursor-pointer" onClick={() => handleToggleSelect(product.id)}>
                                                    {selectedIds.includes(product.id) ? (
                                                        <CheckSquare className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-medium">
                                                {startIndex + index + 1}
                                            </TableCell>
                                            <TableCell className="font-mono text-base">{product.sku}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-base font-medium bg-secondary text-secondary-foreground border border-border">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-semibold">₹{(product.sellingPrice || 0).toLocaleString()}</div>
                                                {product.mrp && product.mrp > 0 ? (
                                                    <div className="text-[11px] text-muted-foreground">MRP: ₹{product.mrp.toLocaleString()}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={cn(
                                                    (product.currentStock || 0) <= 10 ? "text-rose-500" : "text-foreground"
                                                )}>
                                                    {product.currentStock}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-base">
                                                {product.unitOfMeasure}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(product)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDeleteProduct(product.id!)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</span> of <span className="font-medium">{filteredProducts.length}</span> products
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? "default" : "outline"}
                                                    size="sm"
                                                    className="w-8 h-8 p-0"
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </Button>
                                            ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {filteredProducts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Package className="h-12 w-12 mb-4 opacity-20" />
                                    <p>No products found matching your search.</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? "Edit Product" : "Add New Product"}
                description={editingProduct ? "Update catalog product, pricing, and Indian GST configuration." : "Add a new product with complete pricing, Indian GST rates, and inventory controls."}
                className="max-w-3xl"
            >
                <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
                    {/* Group 1: Basic Information */}
                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Basic Information</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">SKU / Barcode *</label>
                                <Input
                                    placeholder="PROD-000"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-primary">Category *</label>
                                <Input
                                    placeholder="e.g. Beverages"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    list="category-list"
                                />
                                <datalist id="category-list">
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-primary">Sub Category</label>
                                <Input
                                    placeholder="e.g. Soft Drinks"
                                    value={formData.subCategory}
                                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                                    list="subcategory-list"
                                />
                                <datalist id="subcategory-list">
                                    {uniqueSubCategories.map(sub => (
                                        <option key={sub} value={sub} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-primary">Unit of Measure</label>
                                <Input
                                    placeholder="e.g. unit, kg, box"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    list="unit-list"
                                />
                                <datalist id="unit-list">
                                    {uniqueUnits.map(unit => (
                                        <option key={unit} value={unit} />
                                    ))}
                                    <option value="unit" />
                                    <option value="kg" />
                                    <option value="gram" />
                                    <option value="box" />
                                    <option value="litre" />
                                    <option value="ml" />
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Product Name *</label>
                            <Input
                                placeholder="Enter full product name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Live Pricing, Margin, MRP & Indian GST Calculations */}
                    {(() => {
                        const cost = parseFloat(formData.costPrice || '0') || 0;
                        const sell = parseFloat(formData.price || '0') || 0;
                        const mrp = formData.mrp ? parseFloat(formData.mrp) : null;
                        const isTaxable = formData.taxType === 'TAXABLE';
                        const gstRate = isTaxable ? (parseFloat(formData.gstRate) || 0) : 0;
                        const isInclusive = formData.isInclusive;

                        // Taxable value and output GST
                        let taxableSellingValue = sell;
                        let outputGst = 0;
                        let customerPays = sell;

                        if (!isTaxable || gstRate <= 0) {
                            taxableSellingValue = sell;
                            outputGst = 0;
                            customerPays = sell;
                        } else if (isInclusive) {
                            taxableSellingValue = sell / (1 + gstRate / 100);
                            outputGst = sell - taxableSellingValue;
                            customerPays = sell;
                        } else {
                            taxableSellingValue = sell;
                            outputGst = sell * (gstRate / 100);
                            customerPays = sell + outputGst;
                        }

                        // CGST & SGST Split
                        const isCustom = isCustomGst || !['0', '5', '12', '18', '28'].includes(formData.gstRate);
                        let cgstRate = gstRate / 2;
                        if (isCustom && formData.customCgstRate && formData.customSgstRate) {
                            cgstRate = parseFloat(formData.customCgstRate) || (gstRate / 2);
                        }
                        const cgstAmount = outputGst > 0 && gstRate > 0 ? (outputGst * (cgstRate / gstRate)) : 0;
                        const sgstAmount = outputGst - cgstAmount;

                        // Profit & Margins
                        const profitAvailable = cost > 0;
                        const profitPerUnit = taxableSellingValue - cost;
                        const profitMargin = taxableSellingValue > 0 ? (profitPerUnit / taxableSellingValue) * 100 : 0;
                        const markup = cost > 0 ? (profitPerUnit / cost) * 100 : 0;

                        // MRP Discount
                        const hasMrp = mrp !== null && mrp > 0;
                        const discountFromMrp = hasMrp ? Math.max(0, mrp - customerPays) : 0;
                        const discountPercentage = hasMrp && mrp > 0 ? (discountFromMrp / mrp) * 100 : 0;
                        const exceedsMrp = hasMrp && customerPays > mrp;

                        // Target Margin Suggestion
                        const targetMarginPct = parseFloat(formData.targetMargin || '0') || 0;
                        let suggestedPrice = 0;
                        if (cost > 0 && targetMarginPct > 0 && targetMarginPct < 100) {
                            const suggestedTaxable = cost / (1 - targetMarginPct / 100);
                            suggestedPrice = (isInclusive && isTaxable && gstRate > 0) ? suggestedTaxable * (1 + gstRate / 100) : suggestedTaxable;
                        }

                        return (
                            <>
                                {/* Group 2: Pricing & Profit Margin */}
                                <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-primary" /> 2. Pricing & Profit Margin
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            {profitAvailable ? (
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
                                                    profitMargin >= 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                }`}>
                                                    Margin: {profitMargin.toFixed(1)}% | Markup: {markup.toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                                                    Cost not available
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Cost Price (₹)</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={formData.costPrice}
                                                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                            />
                                            <span className="text-[10px] text-muted-foreground">Base cost excl. recoverable GST</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Maximum Retail Price (MRP) (₹)</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Optional (e.g. 1100.00)"
                                                value={formData.mrp}
                                                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                            />
                                            <span className="text-[10px] text-muted-foreground">Printed package MRP (tax-inclusive)</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Selling Price (₹) *</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            />
                                            <span className="text-[10px] text-muted-foreground">Configured customer price</span>
                                        </div>
                                    </div>

                                    {/* Warnings if Selling Price exceeds MRP */}
                                    {exceedsMrp && (
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>
                                                Warning: Customer price (₹{customerPays.toFixed(2)}) exceeds MRP (₹{mrp?.toFixed(2)}). Under Indian Legal Metrology Rules, packaged goods cannot be sold above MRP!
                                            </span>
                                        </div>
                                    )}

                                    {/* Target Margin & Price Suggestion */}
                                    <div className="p-2.5 rounded-lg border bg-background/60 space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-muted-foreground">Target Margin (%):</label>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="1"
                                                    max="99"
                                                    className="w-20 h-7 text-xs"
                                                    value={formData.targetMargin}
                                                    onChange={(e) => setFormData({ ...formData, targetMargin: e.target.value })}
                                                />
                                            </div>
                                            {cost > 0 && suggestedPrice > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        Suggested Price: <strong className="text-foreground">₹{suggestedPrice.toFixed(2)}</strong>
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-7 text-xs px-2 font-medium"
                                                        onClick={() => setFormData({ ...formData, price: suggestedPrice.toFixed(2) })}
                                                    >
                                                        Apply Suggested Price
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">
                                                    Enter cost price and target margin to calculate suggested selling price
                                                </span>
                                            )}
                                        </div>
                                        {hasMrp && suggestedPrice > (mrp || 0) && (
                                            <p className="text-[11px] text-amber-600">
                                                ⚠️ Suggested price (₹{suggestedPrice.toFixed(2)}) is higher than MRP (₹{mrp?.toFixed(2)}). Consider lowering margin target.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Group 3: Indian GST & Tax */}
                                <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Percent className="h-3.5 w-3.5 text-primary" /> 3. Indian GST & Tax Configuration
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Tax Classification</label>
                                            <select
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={formData.taxType}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== 'TAXABLE') {
                                                        setIsCustomGst(false);
                                                        setFormData({
                                                            ...formData,
                                                            taxType: val,
                                                            gstRate: '0',
                                                            customCgstRate: '0',
                                                            customSgstRate: '0'
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            taxType: val,
                                                            gstRate: '18',
                                                            customCgstRate: '9',
                                                            customSgstRate: '9'
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="TAXABLE">Taxable (Standard GST)</option>
                                                <option value="NIL_RATED">Nil-Rated (0% GST)</option>
                                                <option value="EXEMPT">Exempt from GST</option>
                                                <option value="NON_GST">Non-GST Supply</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">GST Rate (%)</label>
                                            <select
                                                disabled={formData.taxType !== 'TAXABLE'}
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                                value={isCustomGst ? 'custom' : (['0', '5', '12', '18', '28'].includes(formData.gstRate) ? formData.gstRate : 'custom')}
                                                onChange={(e) => {
                                                    if (e.target.value === 'custom') {
                                                        setIsCustomGst(true);
                                                        const curRate = parseFloat(formData.gstRate) || 0;
                                                        const half = curRate > 0 ? (curRate / 2).toFixed(2).replace(/\.00$/, '') : '0';
                                                        setFormData({
                                                            ...formData,
                                                            customCgstRate: formData.customCgstRate || half,
                                                            customSgstRate: formData.customSgstRate || half
                                                        });
                                                    } else {
                                                        setIsCustomGst(false);
                                                        const rateVal = parseFloat(e.target.value) || 0;
                                                        const half = rateVal > 0 ? (rateVal / 2).toFixed(2).replace(/\.00$/, '') : '0';
                                                        setFormData({
                                                            ...formData,
                                                            gstRate: e.target.value,
                                                            customCgstRate: half,
                                                            customSgstRate: half
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="0">0% (Nil / Exempt)</option>
                                                <option value="5">5% GST (CGST 2.5% + SGST 2.5%)</option>
                                                <option value="12">12% GST (CGST 6% + SGST 6%)</option>
                                                <option value="18">18% GST (CGST 9% + SGST 9%)</option>
                                                <option value="28">28% GST (CGST 14% + SGST 14%)</option>
                                                <option value="custom">Custom Rate...</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">Pricing Tax Mode</label>
                                            <div className="flex flex-col gap-1 pt-0.5">
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="taxMode"
                                                        checked={!formData.isInclusive}
                                                        onChange={() => setFormData({ ...formData, isInclusive: false })}
                                                    />
                                                    <span>GST Exclusive (+ tax)</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="taxMode"
                                                        checked={formData.isInclusive}
                                                        onChange={() => setFormData({ ...formData, isInclusive: true })}
                                                    />
                                                    <span>GST Inclusive (tax included)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom GST Rate Configuration */}
                                    {isCustom && formData.taxType === 'TAXABLE' && (
                                        <div className="p-3 rounded-lg border bg-background/70 space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground">Custom Tax Components</div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium">Total GST Rate (%)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="e.g. 7"
                                                        value={formData.gstRate}
                                                        onChange={(e) => {
                                                            const tot = parseFloat(e.target.value) || 0;
                                                            const half = tot > 0 ? (tot / 2).toFixed(2).replace(/\.00$/, '') : '0';
                                                            setFormData({
                                                                ...formData,
                                                                gstRate: e.target.value,
                                                                customCgstRate: half,
                                                                customSgstRate: half
                                                            });
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium">CGST Rate (%)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="e.g. 3.5"
                                                        value={formData.customCgstRate}
                                                        onChange={(e) => setFormData({ ...formData, customCgstRate: e.target.value })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium">SGST Rate (%)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="e.g. 3.5"
                                                        value={formData.customSgstRate}
                                                        onChange={(e) => setFormData({ ...formData, customSgstRate: e.target.value })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            {(() => {
                                                const tot = parseFloat(formData.gstRate) || 0;
                                                const cg = parseFloat(formData.customCgstRate) || 0;
                                                const sg = parseFloat(formData.customSgstRate) || 0;
                                                const isValid = Math.abs((cg + sg) - tot) < 0.01;
                                                return (
                                                    <div className={`text-[11px] font-medium flex items-center gap-1 ${isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                                        {isValid
                                                            ? `Valid split: CGST ${cg}% + SGST ${sg}% = Total ${tot}%`
                                                            : `Mismatch: CGST (${cg}%) + SGST (${sg}%) = ${(cg + sg).toFixed(2)}%, must equal Total (${tot}%)`}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Group 4: Live Pricing & Profit Summary */}
                                <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/20 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                        <Calculator className="h-3.5 w-3.5" /> 4. Product Pricing & Profit Summary
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Purchase Cost:</span>
                                            <span className="font-semibold text-foreground">
                                                {profitAvailable ? `₹${cost.toFixed(2)}` : 'Cost not available'}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Maximum Retail Price (MRP):</span>
                                            <span className="font-semibold text-foreground">
                                                {hasMrp ? `₹${mrp?.toFixed(2)}` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Discount from MRP:</span>
                                            <span className="font-semibold text-emerald-600">
                                                {hasMrp ? `₹${discountFromMrp.toFixed(2)} (${discountPercentage.toFixed(1)}%)` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Selling Price ({isInclusive ? 'Incl.' : 'Excl.'}):</span>
                                            <span className="font-semibold text-foreground">₹{sell.toFixed(2)}</span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Taxable Selling Value:</span>
                                            <span className="font-semibold text-foreground">₹{taxableSellingValue.toFixed(2)}</span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Output GST ({gstRate}%):</span>
                                            <span className="font-semibold text-foreground">
                                                ₹{outputGst.toFixed(2)}
                                                {gstRate > 0 && (
                                                    <span className="block text-[10px] text-muted-foreground">
                                                        (CGST: ₹{cgstAmount.toFixed(2)} | SGST: ₹{sgstAmount.toFixed(2)})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Customer Pays:</span>
                                            <span className="font-bold text-foreground">₹{customerPays.toFixed(2)}</span>
                                        </div>
                                        <div className="p-2 bg-background rounded border">
                                            <span className="text-muted-foreground block text-[11px]">Gross Profit per Unit:</span>
                                            <span className={`font-bold ${profitAvailable && profitPerUnit >= 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                {profitAvailable ? `₹${profitPerUnit.toFixed(2)}` : 'Cost not available'}
                                            </span>
                                            {profitAvailable && (
                                                <span className="block text-[10px] text-muted-foreground">
                                                    Margin: {profitMargin.toFixed(1)}% | Markup: {markup.toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Group 5: Inventory & Stock Control */}
                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">5. Inventory & Stock Control</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Initial / Current Stock Level</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Low Stock Alert Threshold</label>
                                <Input
                                    type="number"
                                    placeholder="10"
                                    value={formData.lowStockThreshold}
                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                />
                                <span className="text-[10px] text-muted-foreground">Alerts when sellable stock falls below this</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProduct}>{editingProduct ? "Update Product" : "Save Product"}</Button>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Bulk Product Upload"
                description="Upload a CSV file to add multiple products at once."
            >
                <div className="space-y-6 pt-4">
                    <div className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <FileUp className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">{importFile ? importFile.name : 'Click to select CSV file'}</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Instructions:</h4>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                            <li>File must be in **CSV** format.</li>
                            <li>SKU must be unique for every product.</li>
                            <li>Columns should match the sample template exactly.</li>
                        </ul>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={downloadSampleCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Sample Template
                    </Button>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleImport} disabled={!importFile || importing}>
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                            Start Upload
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
