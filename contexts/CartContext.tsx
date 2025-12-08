import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: number) => void;
    clearCart: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    toggleCart: () => void;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('music_access_cart');
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart from local storage", e);
            }
        }
    }, []);

    // Save to local storage whenever items change
    useEffect(() => {
        localStorage.setItem('music_access_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (item: CartItem) => {
        setItems(prev => {
            // Check if item already exists to prevent duplicates if needed, or allow multiple
            // For now, let's assume we can have duplicates or we check by ID
            if (prev.some(i => i.id === item.id)) {
                // Determine behavior: ignore or show toast? For now, just return
                return prev;
            }
            return [...prev, item];
        });
        setIsOpen(true); // Auto open cart when adding
    };

    const removeFromCart = (itemId: number) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const toggleCart = () => setIsOpen(prev => !prev);

    const cartTotal = items.reduce((sum, item) => sum + item.price, 0);

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            clearCart,
            isOpen,
            setIsOpen,
            toggleCart,
            cartTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
