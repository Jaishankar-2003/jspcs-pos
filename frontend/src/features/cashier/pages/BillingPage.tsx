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
    Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/utils';
import { useCartStore } from '@/store/cartSlice';
import type { Product } from '@/types';

export const BillingPage = () => {
    const { items, addItem, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Mock products for search
    const mockProducts: Partial<Product>[] = [
        { id: "1", sku: "PROD-001", name: "Premium Coffee Beans", sellingPrice: 850, currentStock: 45, unitOfMeasure: "kg" },
        { id: "2", sku: "PROD-002", name: "Organic Green Tea", sellingPrice: 420, currentStock: 12, unitOfMeasure: "box" },
        { id: "3", sku: "PROD-003", name: "Whole Wheat Bread", sellingPrice: 65, currentStock: 5, unitOfMeasure: "loaf" },
        { id: "4", sku: "PROD-004", name: "Salted Butter", sellingPrice: 235, currentStock: 28, unitOfMeasure: "unit" },
        { id: "5", sku: "PROD-005", name: "Dark Chocolate 70%", sellingPrice: 180, currentStock: 65, unitOfMeasure: "bar" },
    ];

    const handleProductSelect = (product: Product) => {
        addItem(product);
        setSearchTerm('');
        searchInputRef.current?.focus();
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
                                placeholder="Name or SKU..."
                                className="pl-9 bg-muted/50 focus-visible:ring-primary shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {searchTerm && (
                            <div className="border border-border rounded-lg max-h-[300px] overflow-auto shadow-sm">
                                {mockProducts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleProductSelect(product)}
                                        className="w-full flex items-center justify-between p-3 text-left hover:bg-primary/5 transition-colors border-b last:border-0"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{product.name}</span>
                                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                                        </div>
                                        <span className="font-bold text-sm">₹{product.sellingPrice}</span>
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
                                disabled={items.length === 0}
                            >
                                Confirm Checkout
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
