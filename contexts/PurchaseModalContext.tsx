import React, { createContext, useContext, useState, useCallback } from 'react';
import { Project, CartItem } from '../types';
import { useCart } from './CartContext';
import PurchaseModal from '../components/PurchaseModal';

interface PurchaseModalContextType {
    openPurchaseModal: (project: Project, cartItem?: CartItem | null) => void;
    closePurchaseModal: () => void;
    isOpen: boolean;
}

const PurchaseModalContext = createContext<PurchaseModalContextType | undefined>(undefined);

export const PurchaseModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [project, setProject] = useState<Project | null>(null);
    const [initialTrackId, setInitialTrackId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);

    const { addToCart, updateCartItem } = useCart();

    const openPurchaseModal = useCallback((projectToAdd: Project, cartItem: CartItem | null = null) => {
        setProject(projectToAdd);
        setEditingItem(cartItem || null); // Ensure null if undefined
        setInitialTrackId(cartItem?.trackId || null);
        setIsOpen(true);
    }, []);

    const closePurchaseModal = useCallback(() => {
        setIsOpen(false);
        // Delay clearing project to avoid flickering during close animation
        setTimeout(() => {
            setProject(null);
            setEditingItem(null);
            setInitialTrackId(null);
        }, 300);
    }, []);

    const handleAddToCart = (item: CartItem) => {
        if (editingItem) {
            // If we are editing, we replace the item. 
            // Ideally we check if IDs match, but item.id here comes from the Modal.
            // If the Modal preserved the ID (which I updated it to do), then we just update.
            updateCartItem(editingItem.id, item);
        } else {
            addToCart(item);
        }
        // The modal handles its own close delay usually but we expose closePurchaseModal to be safe
    };

    return (
        <PurchaseModalContext.Provider value={{ openPurchaseModal, closePurchaseModal, isOpen }}>
            {children}
            {project && (
                <PurchaseModal
                    isOpen={isOpen}
                    onClose={closePurchaseModal}
                    project={project}
                    initialTrackId={initialTrackId}
                    initialCartItem={editingItem}
                    onAddToCart={handleAddToCart}
                />
            )}
        </PurchaseModalContext.Provider>
    );
};

export const usePurchaseModal = () => {
    const context = useContext(PurchaseModalContext);
    if (context === undefined) {
        throw new Error('usePurchaseModal must be used within a PurchaseModalProvider');
    }
    return context;
};
