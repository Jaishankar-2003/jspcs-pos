import { useState } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    AlertCircle,
    FileDown
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

export const ProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Mock data for UI demonstration
    const mockProducts = [
        { id: 1, sku: "PROD-001", name: "Premium Coffee Beans", category: "Beverages", price: 850, stock: 45, unit: "kg" },
        { id: 2, sku: "PROD-002", name: "Organic Green Tea", category: "Beverages", price: 420, stock: 12, unit: "box" },
        { id: 3, sku: "PROD-003", name: "Whole Wheat Bread", category: "Bakery", price: 65, stock: 5, unit: "loaf" },
        { id: 4, sku: "PROD-004", name: "Salted Butter", category: "Dairy", price: 235, stock: 28, unit: "unit" },
        { id: 5, sku: "PROD-005", name: "Dark Chocolate 70%", category: "Snacks", price: 180, stock: 65, unit: "bar" },
    ];

    const filteredProducts = mockProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <Button onClick={() => setIsAddModalOpen(true)}>
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
                                            {product.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">₹{product.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={cn(
                                                "font-medium",
                                                product.stock <= 10 ? "text-rose-500" : "text-foreground"
                                            )}>
                                                {product.stock} {product.unit}
                                            </span>
                                            {product.stock <= 10 && (
                                                <span className="flex items-center text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
                                                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                                    Low Stock
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500">
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
                            <Input placeholder="PROD-000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Input placeholder="Beverages" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product Name</label>
                        <Input placeholder="Enter product name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price (₹)</label>
                            <Input type="number" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Initial Stock</label>
                            <Input type="number" placeholder="0" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsAddModalOpen(false)}>Save Product</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
