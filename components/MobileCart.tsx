import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, Trash2, ArrowRight, ArrowLeft, Music, Package, Mic } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import CheckoutPage from './CheckoutPage';
import { View } from '../types';

interface MobileCartProps {
    onNavigate: (view: View | string) => void;
}

const MobileCart: React.FC<MobileCartProps> = ({ onNavigate }) => {
    const { items, cartTotal, isOpen, setIsOpen, removeFromCart } = useCart();

    const [render, setRender] = useState(false);
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<'cart' | 'checkout'>('cart');

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            setView('cart');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            document.body.style.overflow = '';
            const timer = setTimeout(() => setRender(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!render) return null;

    return createPortal(
        <div className={`
            fixed inset-0 z-[130] lg:hidden flex flex-col bg-black 
            transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform
            ${visible ? 'translate-y-0' : 'translate-y-full'}
        `}>
            {/* Background Blur Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="relative h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    {view === 'checkout' ? (
                        <>
                            <button
                                onClick={() => setView('cart')}
                                className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-xl border border-white/5 active:scale-95 transition-all"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-wider">Checkout</h2>
                                <p className="text-[10px] font-mono text-neutral-500 uppercase">Secure Payment</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-wider">Your Cart</h2>
                                <p className="text-[10px] font-mono text-neutral-500 uppercase">{items.length} {items.length === 1 ? 'Item' : 'Items'}</p>
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all active:scale-95"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            {view === 'checkout' ? (
                <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar relative bg-black">
                    <CheckoutPage isEmbedded={true} />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar relative">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-700 border border-neutral-800">
                                <ShoppingBag size={40} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Your cart is empty</h3>
                                <p className="text-xs text-neutral-500 max-w-[180px] mx-auto mt-1">Add some fire beats or services to your cart to get started.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onNavigate('home');
                                }}
                                className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-widest"
                            >
                                Start Browsing
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-20">
                            {items.map((item) => {
                                let TypeIcon = Music;
                                if (item.type.includes('Sound Kit')) TypeIcon = Package;
                                if (item.type.includes('Service') || item.type.includes('Mixing')) TypeIcon = Mic;

                                return (
                                    <div
                                        key={item.id}
                                        className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex gap-4 animate-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center text-neutral-400 border border-white/5 shrink-0">
                                            <TypeIcon size={24} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-bold text-white truncate pr-2">{item.title}</h4>
                                                <span className="text-sm font-mono font-black text-primary">${item.price.toFixed(2)}</span>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[9px] font-black font-mono text-neutral-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                    {item.type}
                                                </span>
                                                {item.licenseType && (
                                                    <span className="text-[10px] text-neutral-500 font-medium truncate">
                                                        • {item.licenseType}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded bg-neutral-800 border border-white/10 overflow-hidden shrink-0">
                                                        {item.sellerAvatar ? (
                                                            <img src={item.sellerAvatar} alt={item.sellerName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-neutral-700 to-neutral-800"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-neutral-500 font-bold">{item.sellerName}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-red-400/70 hover:text-red-400 active:scale-90 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                    <span className="text-[10px] uppercase tracking-widest">Remove</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Footer / Summary */}
            {items.length > 0 && view === 'cart' && (
                <div className="p-6 border-t border-white/5 bg-black/80 backdrop-blur-2xl shrink-0 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Summary</span>
                            <div className="text-xs text-neutral-400">Subtotal ({items.length} items)</div>
                        </div>
                        <div className="text-2xl font-black text-white font-mono tracking-tighter">
                            <span className="text-primary mr-1">$</span>
                            {cartTotal.toFixed(2)}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setView('checkout');
                        }}
                        className="w-full py-4 bg-primary text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(var(--primary),0.2)]"
                    >
                        <span className="uppercase tracking-widest">Go to Checkout</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
};

export default MobileCart;
