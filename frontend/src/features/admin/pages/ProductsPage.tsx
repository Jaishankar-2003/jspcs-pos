import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    AlertCircle,
    FileDown,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/utils';
import { productsApi } from '@/api/products';
import type { Product } from '@/types';

export const ProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

    const handleCreateProduct = async () => {
        try {
            await productsApi.create({
                sku: formData.sku,
                name: formData.name,
                category: formData.category,
                sellingPrice: parseFloat(formData.price),
                gstRate: parseFloat(formData.gstRate),
                currentStock: parseInt(formData.stock),
                unitOfMeasure: formData.unit || 'unit'
            });
            setIsAddModalOpen(false);
            setFormData({ sku: '', name: '', category: '', price: '', stock: '', unit: '', gstRate: '18' });
            fetchProducts(); // Refresh list
        } catch (error) {
            console.error('Failed to create product', error);
            alert('Failed to create product. Please check logic/console.');
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productsApi.delete(id);
                fetchProducts();
            } catch (error) {
                console.error('Failed to delete product', error);
                alert('Failed to delete product.');
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                    <p className="text-muted-foreground">Manage your inventory, prices, and categories.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button onClick={() => {
                        setFormData({ sku: '', name: '', category: '', price: '', stock: '', unit: '', gstRate: '18' });
                        setIsAddModalOpen(true);
                    }}>
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
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">₹{(product.sellingPrice || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "font-medium",
                                                        (product.currentStock || 0) <= 10 ? "text-rose-500" : "text-foreground"
                                                    )}>
                                                        {product.currentStock} {product.unitOfMeasure}
                                                    </span>
                                                    {(product.currentStock || 0) <= 10 && (
                                                        <span className="flex items-center text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
                                                            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => {
                                                        setFormData({
                                                            sku: product.sku || '',
                                                            name: product.name || '',
                                                            category: product.category || '',
                                                            price: product.sellingPrice?.toString() || '',
                                                            stock: product.currentStock?.toString() || '',
                                                            unit: product.unitOfMeasure || '',
                                                            gstRate: product.gstRate?.toString() || '18'
                                                        });
                                                        // Note: We need a selectedProductId state to distinguish between Add and Edit
                                                        // But for now let's just implement delete to satisfy basic requirements.
                                                        alert('Edit feature coming in full deployment.');
                                                    }}>
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

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Product"
                description="Fill in the details to add a product to your catalog."
            >
                <div className="space-y-4">
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
                            <label className="text-sm font-medium">Initial Stock</label>
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
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateProduct}>Save Product</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

