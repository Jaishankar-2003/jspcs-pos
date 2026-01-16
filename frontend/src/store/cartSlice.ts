import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem } from '@/types';

interface CartState {
    items: CartItem[];
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;

    // Computed properties
    subtotal: number;

    // Helper to recompute totals (optional if we use derived state in components)
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            subtotal: 0,

            addItem: (product, quantity = 1) => {
                const items = get().items;
                const existingItem = items.find((item) => item.id === product.id);

                let newItems;
                if (existingItem) {
                    newItems = items.map((item) =>
                        item.id === product.id
                            ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.sellingPrice }
                            : item
                    );
                } else {
                    newItems = [
                        ...items,
                        { ...product, quantity, discount: 0, total: product.sellingPrice * quantity },
                    ];
                }

                const subtotal = newItems.reduce((acc, item) => acc + item.total, 0);
                set({ items: newItems, subtotal });
            },

            removeItem: (productId) => {
                const newItems = get().items.filter((item) => item.id !== productId);
                const subtotal = newItems.reduce((acc, item) => acc + item.total, 0);
                set({ items: newItems, subtotal });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                const newItems = get().items.map((item) =>
                    item.id === productId
                        ? { ...item, quantity, total: quantity * item.sellingPrice }
                        : item
                );

                const subtotal = newItems.reduce((acc, item) => acc + item.total, 0);
                set({ items: newItems, subtotal });
            },

            clearCart: () => set({ items: [], subtotal: 0 }),
        }),
        {
            name: 'cart-storage',
        }
    )
);
