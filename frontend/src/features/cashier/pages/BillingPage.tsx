import { useState, useRef, useEffect } from 'react';
import {
    Search,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Smartphone,
    ShoppingCart,
    Search as SearchIcon,
    X,
    Keyboard,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/utils';
import { useCartStore } from '@/store/cartSlice';
import type { Product } from '@/types';
import { productsApi } from '@/api/products';
import { usersApi } from '@/api/users';
import { salesApi } from '@/api/sales';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export const BillingPage = () => {
    const { items, addItem, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [amountGiven, setAmountGiven] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        category: '',
        subCategory: '',
        price: '',
        stock: '1',
        unit: 'unit'
    });
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [masterCategories, setMasterCategories] = useState<{ id: string, name: string }[]>([]);
    const [masterSubCategories, setMasterSubCategories] = useState<{ id: string, name: string, categoryId: string }[]>([]);
    const [masterUnits, setMasterUnits] = useState<{ id: string, name: string }[]>([]);

    // Fetch products for search cache
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

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoadingProducts(true);
                const [prodData, cats, subcats, uns] = await Promise.all([
                    productsApi.getAll(),
                    fetch('/api/masters/categories', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
                    fetch('/api/masters/subcategories', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
                    fetch('/api/masters/units', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json())
                ]);
                setProducts(prodData);
                setMasterCategories(Array.isArray(cats) ? cats : []);
                setMasterSubCategories(Array.isArray(subcats) ? subcats : []);
                setMasterUnits(Array.isArray(uns) ? uns : []);
            } catch (error) {
                console.error("Failed to load products", error);
            } finally {
                setLoadingProducts(false);
            }
        };
        loadProducts();
    }, []);

    // Focus search input on mount and on 'F1' key
    useEffect(() => {
        searchInputRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleProductSelect = (product: Product) => {
        addItem(product);
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const handleCheckout = async () => {
        if (items.length === 0) return;

        try {
            setCheckoutLoading(true);

            // Fetch current user
            await usersApi.getMe();

            const finalCustomerName = customerName.trim() || `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const invoiceRequest = {
                items: items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    discountPercent: 0 // Default 0 for now
                })),
                paymentMode: paymentMode,
                customerName: finalCustomerName
            };

            await salesApi.createInvoice(invoiceRequest);
            
            clearCart();
            setAmountGiven('');
            setCustomerName('');
            setShowCalculator(false);
            toast.success("Checkout Successful! Invoice Created.");
        } catch (error) {
            console.error("Checkout Failed", error);
            toast.error("Checkout Failed. Please try again.");
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleSaveCustomProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            toast.error("Name and Price are required");
            return;
        }

        try {
            const payload = {
                sku: `CUSTOM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                name: newProduct.name,
                category: newProduct.category || 'General',
                subCategory: newProduct.subCategory || 'General',
                sellingPrice: parseFloat(newProduct.price),
                currentStock: parseInt(newProduct.stock) || 1,
                unitOfMeasure: newProduct.unit || 'unit',
                gstRate: 0,
                isTaxable: false
            };

            const savedProduct = await productsApi.create(payload);
            addItem(savedProduct);

            // Update local products list
            setProducts([...products, savedProduct]);

            setIsAddModalOpen(false);
            setNewProduct({ name: '', category: '', price: '', stock: '1', unit: 'unit' });
            toast.success("Product added and added to cart!");
        } catch (error) {
            console.error("Failed to add product", error);
            toast.error("Failed to add product");
        }
    };

    const grandTotal = subtotal;

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6 antialiased">
            {/* Left Column: Cart & Payment */}
            <div className="flex flex-col flex-1 gap-6 overflow-hidden">
                <Card className="flex flex-col flex-1 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle>Current Order</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-rose-500">
                            Clear All
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                                <ShoppingCart className="h-12 w-12" />
                                <p>Cart is empty. Start scanning or search products.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-base">{item.name}</span>
                                            <span className="text-base text-muted-foreground">₹{item.sellingPrice.toLocaleString()} per unit</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-border rounded-lg bg-background px-4 py-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 hover:bg-muted transition-colors rounded-l-lg"
                                                >
                                                    <Minus className="h-6 w-6" />
                                                </button>
                                                <span className="w-8 text-center text-base font-bold">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1.5 hover:bg-muted transition-colors rounded-r-lg"
                                                >
                                                    <Plus className="h-6 w-6" />
                                                </button>
                                            </div>
                                            <div className="w-20 text-right font-bold text-lg">
                                                ₹{item.total.toLocaleString()}
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-1.5 text-muted-foreground hover:text-rose-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <div className="p-6 border-t border-border bg-muted/30 space-y-4">
                        <div>
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-2xl font-black mt-2">
                                <span>Total Amount</span>
                                <span className="text-primary font-outfit">₹{grandTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Cash Calculator Feature */}
                        <div className="pt-2 border-t border-border/50">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-primary justify-between"
                                onClick={() => setShowCalculator(!showCalculator)}
                            >
                                <span className="font-medium">Change Calculator</span>
                                {showCalculator ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>

                            {showCalculator && (
                                <div className="mt-3 p-4 bg-background rounded-xl border border-border shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Received (₹)</label>
                                        <Input
                                            type="number"
                                            placeholder="Enter cash given..."
                                            value={amountGiven}
                                            onChange={(e) => setAmountGiven(e.target.value)}
                                            className="text-lg font-semibold h-12"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                        <span className="text-sm font-semibold">Balance to Return:</span>
                                        <span className={cn(
                                            "text-2xl font-black tracking-tight",
                                            (parseFloat(amountGiven || '0') - grandTotal) >= 0 ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            ₹{Math.max(0, parseFloat(amountGiven || '0') - grandTotal).toLocaleString()}
                                        </span>
                                    </div>
                                    {(parseFloat(amountGiven || '0') > 0 && parseFloat(amountGiven || '0') < grandTotal) && (
                                        <p className="text-xs font-medium text-rose-500 text-right animate-pulse">Insufficient amount</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Column: Search & Action */}
            <div className="w-[380px] flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                <Card className="shadow-lg border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <SearchIcon className="h-4 w-4 text-primary" />
                            Quick Search (F1)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder={loadingProducts ? "Loading products..." : "Name or SKU..."}
                                className="pl-9 bg-muted/50 focus-visible:ring-primary shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={loadingProducts}
                            />
                            {loadingProducts ? (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={() => setIsAddModalOpen(true)}
                                    title="Add New Product"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {searchTerm && (
                            <div className="border border-border rounded-lg max-h-[300px] overflow-auto shadow-sm">
                                {products
                                    .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .slice(0, 10) // Limit to 10 results
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductSelect(product)}
                                            className="w-full flex items-center justify-between p-3 text-left hover:bg-primary/5 transition-colors border-b last:border-0"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium text-base">{product.name}</span>
                                                <span className="text-base font-medium text-muted-foreground">{product.sku}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-sm">₹{product.sellingPrice}</span>
                                                <span className={cn("text-[15px]", product.currentStock > 0 ? "text-green-600" : "text-red-500")}>
                                                    {product.currentStock > 0 ? `${product.currentStock} in stock` : 'Out of Stock'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Customer Details (Optional)</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <Input
                            placeholder="Enter customer name or phone..."
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-10 text-sm bg-muted/50"
                        />
                    </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                variant={paymentMode === 'CASH' ? 'default' : 'outline'}
                                className={cn("justify-start h-14", paymentMode === 'CASH' && "shadow-lg shadow-primary/20")}
                                onClick={() => setPaymentMode('CASH')}
                            >
                                <Banknote className="mr-3 h-5 w-5" />
                                Cash Payment
                            </Button>
                            <Button
                                variant={paymentMode === 'CARD' ? 'default' : 'outline'}
                                className={cn("justify-start h-14", paymentMode === 'CARD' && "shadow-lg shadow-primary/20")}
                                onClick={() => setPaymentMode('CARD')}
                            >
                                <CreditCard className="mr-3 h-5 w-5" />
                                Card Payment
                            </Button>
                            <Button
                                variant={paymentMode === 'UPI' ? 'default' : 'outline'}
                                className={cn("justify-start h-14", paymentMode === 'UPI' && "shadow-lg shadow-primary/20")}
                                onClick={() => setPaymentMode('UPI')}
                            >
                                <Smartphone className="mr-3 h-5 w-5" />
                                UPI / QR Code
                            </Button>
                        </div>

                        <div className="mt-auto space-y-4 pt-6">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600">
                                <div className="flex items-center gap-2">
                                    <Keyboard className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Alt + Enter</span>
                                </div>
                                <span className="text-xs font-medium">Process Checkout</span>
                            </div>

                            <Button
                                className="w-full h-16 text-lg font-bold shadow-xl shadow-primary/20"
                                disabled={items.length === 0 || checkoutLoading}
                                onClick={handleCheckout}
                            >
                                {checkoutLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                                {checkoutLoading ? 'Processing...' : 'Confirm Checkout'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Manual Product Addition Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Custom Product"
                description="Manually add a product that is not in the system."
            >
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product Name</label>
                        <Input
                            placeholder="Enter product name"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Input
                                placeholder="e.g. Beverages"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                list="billing-category-list"
                            />
                            <datalist id="billing-category-list">
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Sub Category (Optional)</label>
                            <Input
                                placeholder="e.g. Soft Drinks"
                                value={newProduct.subCategory}
                                onChange={(e) => setNewProduct({ ...newProduct, subCategory: e.target.value })}
                                list="billing-subcategory-list"
                            />
                            <datalist id="billing-subcategory-list">
                                {uniqueSubCategories.map(sub => (
                                    <option key={sub} value={sub} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Unit</label>
                            <Input
                                placeholder="unit, kg, etc."
                                value={newProduct.unit}
                                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                list="billing-unit-list"
                            />
                            <datalist id="billing-unit-list">
                                {uniqueUnits.map(unit => (
                                    <option key={unit} value={unit} />
                                ))}
                                <option value="kg" />
                                <option value="gram" />
                                <option value="unit" />
                                <option value="box" />
                            </datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock Count</label>
                            <Input
                                type="number"
                                placeholder="1"
                                value={newProduct.stock}
                                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCustomProduct}>Add to Cart</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
