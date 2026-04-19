import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    AlertCircle,
    FileDown,
    FileUp,
    Loader2,
    Download
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '',
        price: '',
        stock: '',
        unit: '',
        gstRate: '18'
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await productsApi.getAll();
            setProducts(data);
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
        setFormData({ sku: '', name: '', category: '', price: '', stock: '', unit: '', gstRate: '18' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            sku: product.sku || '',
            name: product.name || '',
            category: product.category || '',
            price: product.sellingPrice?.toString() || '0',
            stock: product.currentStock?.toString() || '0',
            unit: product.unitOfMeasure || '',
            gstRate: product.gstRate?.toString() || '18'
        });
        setIsModalOpen(true);
    };

    const handleSaveProduct = async () => {
        try {
            const payload = {
                sku: formData.sku,
                name: formData.name,
                category: formData.category,
                sellingPrice: parseFloat(formData.price),
                gstRate: parseFloat(formData.gstRate),
                currentStock: parseInt(formData.stock),
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
        } catch (error) {
            console.error('Failed to save product', error);
            toast.error('Failed to save product.');
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
        const headers = "sku,name,category,brand,unitOfMeasure,sellingPrice,gstRate,hsnCode,isTaxable,currentStock,lowStockThreshold\n";
        const sample = "SKU-101,Sample Product,Groceries,BrandX,kg,150.00,18,HSN123,true,50,10\nSKU-102,Another Product,Electronics,BrandY,unit,2500.00,12,HSN456,true,5,2";
        const blob = new Blob([headers + sample], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products_sample.csv';
        a.click();
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                    <p className="text-muted-foreground">Manage your inventory, prices, and categories.</p>
                </div>
                <div className="flex items-center gap-2">
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
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
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
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">S.No</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Unit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProducts.map((product, index) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="text-muted-foreground font-medium">
                                                {startIndex + index + 1}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">₹{(product.sellingPrice || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={cn(
                                                    (product.currentStock || 0) <= 10 ? "text-rose-500" : "text-foreground"
                                                )}>
                                                    {product.currentStock}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
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
                description={editingProduct ? "Update product information." : "Fill in the details to add a product to your catalog."}
            >
                <div className="space-y-4">
                    {/* ... form content ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SKU/Barcode</label>
                            <Input
                                placeholder="PROD-000"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Input
                                placeholder="Beverages"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product Name</label>
                        <Input
                            placeholder="Enter product name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock Level</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Unit of Measure</label>
                            <Input
                                placeholder="kg, box, unit..."
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
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
