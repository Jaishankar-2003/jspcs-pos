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
import { salesApi } from '@/api/sales';

export const BillingPage = () => {
    const { items, addItem, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch products for search cache
    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoadingProducts(true);
                const data = await productsApi.getAll();
                setProducts(data);
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
            const invoiceRequest = {
                items: items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    discountPercent: 0 // Default 0 for now
                })),
                paymentMode: paymentMode,
                // Optional customer details can be added here later
                customerName: "Walk-in Customer"
            };

            await salesApi.createInvoice(invoiceRequest);
            clearCart();
            alert("Checkout Successful! Invoice Created.");
        } catch (error) {
            console.error("Checkout Failed", error);
            alert("Checkout Failed. Please try again.");
        } finally {
            setCheckoutLoading(false);
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
                                            <span className="font-semibold text-sm">{item.name}</span>
                                            <span className="text-xs text-muted-foreground">₹{item.sellingPrice.toLocaleString()} per unit</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-border rounded-lg bg-background">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 hover:bg-muted transition-colors rounded-l-lg"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1.5 hover:bg-muted transition-colors rounded-r-lg"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="w-20 text-right font-bold text-sm">
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
                    <div className="p-6 border-t border-border bg-muted/30">
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-2xl font-black mt-2">
                            <span>Total Amount</span>
                            <span className="text-primary font-outfit">₹{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Column: Search & Action */}
            <div className="w-[380px] flex flex-col gap-6 ">
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
                            {loadingProducts && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
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
                                                <span className="font-medium text-sm">{product.name}</span>
                                                <span className="text-xs text-muted-foreground">{product.sku}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-sm">₹{product.sellingPrice}</span>
                                                <span className={cn("text-[10px]", product.currentStock > 0 ? "text-green-600" : "text-red-500")}>
                                                    {product.currentStock > 0 ? `${product.currentStock} in stock` : 'Out of Stock'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        )}
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
        </div>
    );
};
