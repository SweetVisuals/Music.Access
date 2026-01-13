import React, { useState } from 'react';
import { CreditCard, Bitcoin, Lock, CheckCircle, Copy, QrCode, AlertTriangle, ShieldCheck, ArrowRight, Music, Package, Mic, ShoppingBag, Wallet, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { createPurchase } from '../services/supabaseService';
import * as stripeService from '../services/stripeService';
import { DirectPaymentForm } from './DirectPaymentForm';
import { getUserProfile } from '../services/supabaseService';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseService';

interface CheckoutPageProps {
    isEmbedded?: boolean;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ isEmbedded = false }) => {
    const { items, cartTotal, clearCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
    const [selectedCoin, setSelectedCoin] = useState('BTC');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [guestEmail, setGuestEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);

    React.useEffect(() => {
        const fetchUserAndInitialize = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const profile = await getUserProfile(user.id);
                setUserProfile(profile);
                setIsGuest(false);

                // Initialize a pending purchase record
                if (items.length > 0 && !pendingPurchaseId) {
                    try {
                        const purchase = await createPurchase(items, cartTotal, 'card', undefined, 'Processing');
                        if (purchase) setPendingPurchaseId(purchase.id);
                    } catch (e) {
                        console.error("Failed to init purchase record", e);
                    }
                }
            } else {
                setIsGuest(true);
            }
        };
        fetchUserAndInitialize();
    }, [items.length]);

    const handleInitGuestPurchase = async () => {
        if (!guestEmail || !guestEmail.includes('@')) {
            setEmailError("Please enter a valid email address.");
            return;
        }
        setEmailError(null);
        setIsProcessing(true);
        try {
            const purchase = await createPurchase(items, cartTotal, 'card', undefined, 'Processing', guestEmail);
            if (purchase) {
                setPendingPurchaseId(purchase.id);
            }
        } catch (e) {
            console.error("Failed to init guest purchase record", e);
            setError("Failed to initialize checkout. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const total = cartTotal;

    const handlePayment = async () => {
        // This is now handled by the DirectPaymentForm component for Card
        // For Gems/Crypto, we still need the logic
        if (paymentMethod === 'card') return; // Should not be called for card if using DirectPaymentForm cta

        setIsProcessing(true);
        setError(null);
        try {
            const purchase = await createPurchase(items, total, paymentMethod, undefined, 'Processing', guestEmail);
            if (!purchase || !purchase.id) throw new Error("Failed to initialize purchase");

            const result = await stripeService.processMarketplacePayment(items, total, paymentMethod, purchase.id);
            if (!result.success) throw new Error(result.error || "Payment failed");

            clearCart();
            setIsComplete(true);
        } catch (err: any) {
            setError(err.message || "Payment processing failed.");
            setIsProcessing(false);
        }
    };

    const handleCardSuccess = async () => {
        // The webhook will handle marking it as 'Completed' via Metadata
        // But we can optimistically clear and move to success screen
        clearCart();
        setIsComplete(true);
    };



    // Check for success URL param (returning from Stripe)
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            clearCart();
            setIsComplete(true);
        }
    }, [clearCart]);

    if (items.length === 0 && !isComplete) {
        return (
            <div className="w-full max-w-3xl mx-auto py-32 px-6 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-500">
                    <ShoppingBag size={40} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Your Cart is Empty</h1>
                <p className="text-neutral-500 mb-8">Go find some awesome beats!</p>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="w-full max-w-3xl mx-auto py-20 px-6 animate-in fade-in duration-500 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                    <CheckCircle size={40} className="text-green-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Payment Successful!</h1>
                <p className="text-neutral-500 mb-8">Your order has been processed. Check your email for receipt and download links.</p>
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 max-w-md mx-auto">
                    <p className="text-xs font-mono text-neutral-500 uppercase mb-4">Order #ORD-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000)}</p>
                    <div className="space-y-2 text-sm text-neutral-300 mb-6">
                        <div className="flex justify-between"><span>Total Paid:</span> <span className="text-white font-bold">${total.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Method:</span> <span className="text-white uppercase">{paymentMethod}</span></div>
                    </div>
                    <button onClick={() => window.location.href = '/dashboard/orders'} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg border border-white/10 transition-colors">
                        View Order History
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={isEmbedded ? "w-full pb-32 pt-2 px-1 animate-in fade-in duration-500" : "w-full max-w-[1600px] mx-auto pb-32 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500"}>
            <h1 className="text-3xl font-black text-white mb-8">Secure Checkout</h1>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Payment Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'card' ? 'bg-primary/10 border-primary text-white ring-1 ring-primary/50' : 'bg-[#0a0a0a] border-neutral-800 text-neutral-500 hover:bg-white/5'}`}
                        >
                            <CreditCard size={20} />
                            <span className="font-bold">Credit Card</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('crypto')}
                            className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'crypto' ? 'bg-primary/10 border-primary text-white ring-1 ring-primary/50' : 'bg-[#0a0a0a] border-neutral-800 text-neutral-500 hover:bg-white/5'}`}
                        >
                            <Bitcoin size={20} />
                            <span className="font-bold">Crypto</span>
                        </button>
                    </div>

                    {/* Payment Form */}
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8">
                        {paymentMethod === 'card' ? (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                {userProfile ? (
                                    <DirectPaymentForm
                                        userId={userProfile.id}
                                        mode="payment"
                                        items={items}
                                        purchaseId={pendingPurchaseId || undefined}
                                        total={total}
                                        onSuccess={handleCardSuccess}
                                    />
                                ) : isGuest ? (
                                    <div className="space-y-6">
                                        {/* Benefits Notice */}
                                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <ShieldCheck className="text-primary w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Checking out as Guest</h4>
                                                <p className="text-[11px] text-neutral-400 leading-relaxed">
                                                    Making an account allows you to <strong className="text-primary">view purchase history</strong>,
                                                    request <strong className="text-primary">refunds</strong>, and <strong className="text-primary">save purchased items</strong> to your library permanently.
                                                    Guests will not have access to these features after purchase.
                                                </p>
                                            </div>
                                        </div>

                                        {!pendingPurchaseId ? (
                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Receipt Email Address</label>
                                                    <input
                                                        type="email"
                                                        value={guestEmail}
                                                        onChange={(e) => setGuestEmail(e.target.value)}
                                                        placeholder="you@example.com"
                                                        className={`w-full bg-[#050505] border ${emailError ? 'border-red-500/50' : 'border-neutral-800'} rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:border-primary/50 transition-colors`}
                                                    />
                                                    {emailError && <p className="text-[10px] text-red-500 font-bold">{emailError}</p>}
                                                </div>
                                                <button
                                                    onClick={handleInitGuestPurchase}
                                                    disabled={isProcessing}
                                                    className="w-full py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <>Continue to Payment <ArrowRight size={16} /></>}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                                <div className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={14} className="text-green-500" />
                                                        <span className="text-xs text-neutral-400">Buying as guest: <span className="text-white font-bold">{guestEmail}</span></span>
                                                    </div>
                                                    <button onClick={() => setPendingPurchaseId(null)} className="text-[10px] text-primary hover:underline font-bold">Change</button>
                                                </div>
                                                <DirectPaymentForm
                                                    userId={null}
                                                    guestEmail={guestEmail}
                                                    mode="payment"
                                                    items={items}
                                                    purchaseId={pendingPurchaseId}
                                                    total={total}
                                                    onSuccess={handleCardSuccess}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                        <p className="text-neutral-500">Loading secure checkout...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-white">Pay with Crypto</h3>
                                    <div className="flex gap-1">
                                        {['BTC', 'ETH', 'USDC', 'SOL'].map(coin => (
                                            <button
                                                key={coin}
                                                onClick={() => setSelectedCoin(coin)}
                                                className={`px-3 py-1 rounded border text-xs font-bold ${selectedCoin === coin ? 'bg-white text-black border-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'}`}
                                            >
                                                {coin}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="w-48 h-48 bg-white p-2 rounded-lg mb-4">
                                        {/* Mock QR */}
                                        <div className="w-full h-full bg-black flex items-center justify-center text-white">
                                            <QrCode size={64} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-neutral-400 mb-1">Send <span className="text-white font-bold">{(total / 45000).toFixed(6)} {selectedCoin}</span> to:</p>

                                    <div className="flex items-center gap-2 bg-black border border-neutral-800 rounded px-3 py-2 w-full max-w-md">
                                        <span className="text-xs font-mono text-neutral-500 truncate flex-1">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</span>
                                        <button className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors">
                                            <Copy size={14} />
                                        </button>
                                    </div>

                                    <div className="mt-4 flex items-start gap-2 text-left p-3 bg-yellow-500/5 border border-yellow-500/10 rounded w-full">
                                        <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                                            Ensure you are sending <strong>{selectedCoin}</strong> on the correct network. Sending other assets may result in permanent loss.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {paymentMethod !== 'card' && (
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full py-4 bg-primary text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isProcessing ? (
                                <>Processing...</>
                            ) : (
                                <>Pay ${total.toFixed(2)} <ArrowRight size={16} /></>
                            )}
                        </button>
                    )}

                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 sticky top-24">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Order Summary</h3>

                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {items.map((item) => {
                                // Determine icon
                                let TypeIcon = Music;
                                if (item.type.includes('Sound Kit')) TypeIcon = Package;
                                if (item.type.includes('Service') || item.type.includes('Mixing')) TypeIcon = Mic;

                                return (
                                    <div key={item.id} className="flex gap-4 items-start group">
                                        <div className="w-12 h-12 bg-neutral-800 rounded border border-white/10 flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-primary group-hover:border-primary/30 transition-all">
                                            <TypeIcon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                                                <div className="text-sm font-mono font-bold text-white">${item.price.toFixed(2)}</div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-neutral-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                                    {item.type}
                                                </span>
                                                {item.licenseType && (
                                                    <span className="text-[10px] text-neutral-500">
                                                        {item.licenseType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-neutral-800 pt-4 space-y-2">
                            <div className="flex justify-between text-xs text-neutral-400">
                                <span>Subtotal</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-400">
                                <span>Taxes (Est.)</span>
                                <span>$0.00</span>
                            </div>
                        </div>

                        <div className="border-t border-white/10 mt-4 pt-4 flex justify-between items-end">
                            <span className="text-sm font-bold text-white">Total</span>
                            <span className="text-xl font-black text-primary font-mono">${total.toFixed(2)}</span>
                        </div>

                        <div className="mt-6 text-[10px] text-neutral-600 text-center leading-relaxed">
                            By completing this purchase, you agree to our Terms of Service and Licensing Agreements.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
