
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ShoppingBag, ArrowRight, Loader2, Music, Check, ArrowLeft } from 'lucide-react';
import { stripeService } from '../services/stripeService';
import { getUserProfileByHandle } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';

interface ConnectStorefrontProps {
    handle: string;
    currentUser: UserProfile | null;
    onNavigate: (view: string) => void;
}

interface Product {
    id: string;
    name: string;
    description: string;
    active: boolean;
    default_price: {
        id: string;
        unit_amount: number;
        currency: string;
    };
    images: string[];
}

const ConnectStorefront: React.FC<ConnectStorefrontProps> = ({ handle, currentUser, onNavigate }) => {
    const [seller, setSeller] = useState<UserProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Seller Profile
                const sellerProfile = await getUserProfileByHandle(handle);
                if (!sellerProfile) {
                    throw new Error("Store not found");
                }
                setSeller(sellerProfile);

                // 2. Fetch Products if connected
                if (sellerProfile.stripe_account_id) {
                    const productsData = await stripeService.listProducts(sellerProfile.stripe_account_id);
                    setProducts(productsData.data || []);
                }
            } catch (err) {
                console.error(err);
                showToast("Failed to load store.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (handle) {
            loadData();
        }
    }, [handle]);

    const handleBuy = async (product: Product) => {
        if (!seller?.stripe_account_id) return;
        setPurchasing(product.id);

        try {
            // Create Checkout Session (Direct Charge)
            const { url } = await stripeService.createCheckoutSession({
                accountId: seller.stripe_account_id,
                priceId: product.default_price.id,
                quantity: 1,
                applicationFee: Math.round(product.default_price.unit_amount * 0.1), // 10% Platform Fee
                successUrl: window.location.origin + `/dashboard/orders?success=true`,
                cancelUrl: window.location.href
            });

            if (url) {
                window.location.href = url;
            }
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Purchase failed", "error");
            setPurchasing(null);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-primary mb-4" size={32} />
                <p className="text-neutral-500 text-sm">Loading store...</p>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-white mb-2">Store Not Found</h2>
                <button onClick={() => onNavigate('home')} className="text-primary hover:underline">Return Home</button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1900px] mx-auto min-h-screen bg-black text-white relative">
            {/* Simple Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => onNavigate(`@${handle}`)}
                    className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Profile
                </button>
                <div className="flex items-center gap-3">
                    <img src={seller.avatar || ''} alt={seller.username} className="w-8 h-8 rounded-full border border-white/10" />
                    <span className="font-bold">{seller.username}'s Store</span>
                </div>
                <div className="w-20"></div> {/* Spacer for center alignment */}
            </div>

            <main className="px-4 lg:px-10 py-10 animate-in fade-in duration-500">

                {/* Hero / Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-white/5 mb-12">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20"></div>
                    <div className="relative p-8 lg:p-16 text-center">
                        <ShoppingBag size={48} className="mx-auto mb-6 text-primary" />
                        <h1 className="text-4xl lg:text-7xl font-black mb-4 tracking-tighter">
                            Official Store
                        </h1>
                        <p className="text-neutral-400 max-w-xl mx-auto text-lg">
                            Exclusive products, sound kits, and merchandise directly from {seller.username}.
                        </p>
                    </div>
                </div>

                {/* Products Grid */}
                {products.length === 0 ? (
                    <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800">
                        <Music size={40} className="mx-auto mb-4 text-neutral-600" />
                        <h3 className="text-xl font-bold text-neutral-400">No products available yet.</h3>
                        <p className="text-neutral-600 mt-2">Check back soon for new drops.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1 relative">
                                {/* Image Placeholder */}
                                <div className="aspect-square bg-neutral-900 relative overflow-hidden">
                                    {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                                            <Music size={40} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                                        {formatCurrency(product.default_price.unit_amount, product.default_price.currency)}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-2 line-clamp-1">{product.name}</h3>
                                    <p className="text-neutral-500 text-sm mb-6 line-clamp-2 min-h-[40px]">{product.description || 'No description'}</p>

                                    <button
                                        onClick={() => handleBuy(product)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        {purchasing === product.id ? (
                                            <>Processing...</>
                                        ) : (
                                            <>Buy Now <ArrowRight size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ConnectStorefront;
