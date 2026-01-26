
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
    CreditCard,
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    MoreHorizontal,
    ShieldCheck,
    Check,
    X,
    Globe,
    Lock,
    TrendingUp,
    Star,
    AlertCircle
} from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import { stripeService, listPaymentMethods, SavedPaymentMethod } from '../services/stripeService';
import { useToast } from '../contexts/ToastContext';
import ConnectOnboarding from './ConnectOnboarding';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import AddPaymentMethodForm from './AddPaymentMethodForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface WalletPageProps {
    userProfile: UserProfile | null;
}

const WalletPage: React.FC<WalletPageProps> = ({ userProfile }) => {
    const [activeTab, setActiveTab] = useState<'balance' | 'methods'>('balance');
    const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
    const [addMethodType, setAddMethodType] = useState<'card' | 'paypal'>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBuyPromoOpen, setIsBuyPromoOpen] = useState(false);
    const [exchangeLoading, setExchangeLoading] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [isBuyGemsOpen, setIsBuyGemsOpen] = useState(false);
    const [activeGemPack, setActiveGemPack] = useState<number | null>(null);

    // Form States
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardName, setCardName] = useState('');

    // Stripe Connect State
    const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
    const [isStripeLoading, setIsStripeLoading] = useState(false);

    // Payment Methods State
    const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
    const [isMethodsLoading, setIsMethodsLoading] = useState(false);
    const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);

    const { showToast } = useToast();

    // Track status from ConnectOnboarding
    const [isConnectReady, setIsConnectReady] = useState(false);

    useEffect(() => {
        if (userProfile?.stripe_account_id && isConnectReady) {
            loadBalance();
        }
    }, [userProfile?.stripe_account_id, isConnectReady]);

    const loadBalance = async () => {
        if (!userProfile?.stripe_account_id) return;
        try {
            const balanceData = await stripeService.getBalance(userProfile.stripe_account_id);
            // Balance object structure: available[0].amount, pending[0].amount
            const available = balanceData.available?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0;
            const pending = balanceData.pending?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0;
            setStripeBalance({ available, pending });
        } catch (e) {
            console.error("Failed to load stripe balance", e);
        }
    };

    const handleWithdraw = async () => {
        if (!userProfile?.stripe_account_id || !stripeBalance?.available) return;
        setIsStripeLoading(true);
        try {
            await stripeService.executePayout(userProfile.stripe_account_id, stripeBalance.available);
            showToast("Payout initiated! Funds will arrive in 2-3 business days.", "success");
            loadBalance(); // Refresh balance
        } catch (e) {
            console.error(e);
            showToast("Payout failed.", "error");
        } finally {
            setIsStripeLoading(false);
        }
    };

    const handleExchangeGems = async () => {
        if (!userProfile) return;
        if (userProfile.gems < 100) {
            setPurchaseError('Insufficient Gems. You need 100 Gems.');
            return;
        }

        setExchangeLoading(true);
        setPurchaseError(null);

        try {
            await supabaseService.exchangeGemsForCredits(userProfile.id!, 100, 10);
            setPurchaseSuccess(true);
            window.dispatchEvent(new CustomEvent('profile-updated'));

            setTimeout(() => {
                setIsBuyPromoOpen(false);
                setPurchaseSuccess(false);
            }, 2000);
        } catch (error: any) {
            setPurchaseError(error.message || 'Failed to exchange gems');
        } finally {
            setExchangeLoading(false);
        }
    };

    const handleBuyGems = (amount: number) => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setIsBuyGemsOpen(false);
            showToast(`Demo: Successfully purchased ${amount} Gems!`, 'success');
            window.dispatchEvent(new CustomEvent('profile-updated'));
        }, 1500);
    };

    const fetchPaymentMethods = async () => {
        if (!userProfile?.id) return;
        setIsMethodsLoading(true);
        try {
            const methods = await listPaymentMethods(userProfile.id);
            setPaymentMethods(methods);
        } catch (error) {
            console.error("Failed to fetch payment methods:", error);
            // Don't show toast on load error to avoid spam, just log it
        } finally {
            setIsMethodsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'methods' && userProfile?.id) {
            fetchPaymentMethods();
        }
    }, [activeTab, userProfile?.id]);

    const handleOpenAddMethod = async () => {
        setIsAddMethodOpen(true);
        setSetupIntentSecret(null); // Reset
        if (!userProfile?.id) return;

        try {
            const { clientSecret } = await stripeService.createSetupIntent(userProfile.id);
            setSetupIntentSecret(clientSecret);
        } catch (error) {
            console.error("Failed to create setup intent", error);
            showToast("Could not initialize payment form", "error");
            setIsAddMethodOpen(false);
        }
    };

    const handleMethodAdded = () => {
        setIsAddMethodOpen(false);
        fetchPaymentMethods(); // Refresh list
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Helper to format cents to dollars
    const formatCents = (cents: number) => formatCurrency(cents / 100);

    if (!userProfile) return null;

    return (
        <div className="w-full max-w-5xl mx-auto pb-32 pt-6 px-4 lg:px-8 animate-in fade-in duration-500 relative">

            {/* Header / Title */}
            <div className="flex items-center justify-between mb-6">
                <div className="hidden lg:block">
                    <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Wallet</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Manage balance & payment methods</p>
                </div>
                <button className="lg:hidden p-2 bg-neutral-900 rounded-full text-neutral-400 hover:text-white">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Mobile Tabs */}
            <div className="flex lg:hidden bg-neutral-900/50 p-1 rounded-xl mb-6 border border-transparent relative">
                <button
                    onClick={() => setActiveTab('balance')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'balance' ? 'bg-white text-black shadow-lg' : 'text-neutral-500'}`}
                >
                    Balance & Funds
                </button>
                <button
                    onClick={() => setActiveTab('methods')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'methods' ? 'bg-white text-black shadow-lg' : 'text-neutral-500'}`}
                >
                    Payment Methods
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* LEFT COLUMN: Balance Cards */}
                <div className={`lg:col-span-7 space-y-6 ${activeTab === 'balance' ? 'block' : 'hidden lg:block'}`}>

                    {/* Show Connect Onboarding if not ready or not connected */}
                    {/* If connected and ready, show the Balance Card */}

                    <ConnectOnboarding
                        userProfile={userProfile}
                        onStatusChange={() => {
                            // Re-fetch logic or just set state
                            // We can optimistically set ready
                            setIsConnectReady(true);
                            loadBalance();
                        }}
                    />

                    {/* Only show Withdrawal Card if Stripe is connected & ready */}
                    {userProfile.stripe_account_id && (
                        <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl border border-transparent bg-[#0a0a0a] group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-black to-black opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                            <div className="relative p-6 lg:p-8 flex flex-col justify-between h-auto min-h-[220px]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={16} className="text-emerald-500" />
                                            <span className="text-[10px] lg:text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">Seller Earnings</span>
                                        </div>
                                        <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                                            {stripeBalance ? formatCents(stripeBalance.available) : '$0.00'}
                                        </h2>
                                        {stripeBalance && stripeBalance.pending > 0 && (
                                            <p className="text-neutral-500 text-xs mt-1 font-mono">
                                                {formatCents(stripeBalance.pending)} pending
                                            </p>
                                        )}
                                    </div>
                                    <div className="hidden sm:block">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <ShieldCheck size={20} className="text-emerald-500" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={handleWithdraw}
                                        disabled={isStripeLoading || !stripeBalance || stripeBalance.available <= 0}
                                        className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm lg:text-base hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ArrowDownLeft size={18} />
                                        {isStripeLoading ? 'Processing...' : 'Withdraw to Bank'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gems Card */}
                    <div className="bg-neutral-900/50 border border-transparent rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{userProfile.gems || 0} Gems</h3>
                                <p className="text-neutral-500 text-xs">Approx. {formatCurrency((userProfile.gems || 0) * 0.01)} USD</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsBuyGemsOpen(true)}
                            className="px-4 py-2 bg-purple-500 text-white text-xs font-black rounded-lg hover:bg-purple-600 transition-all shadow-lg shadow-purple-900/20 uppercase tracking-wider"
                        >
                            Buy Gems
                        </button>
                    </div>

                    {/* Promotion Credits Card */}
                    <div className="bg-neutral-900/50 border border-transparent rounded-2xl p-5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                                    <Star size={10} strokeWidth={3} className="text-black fill-current" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm sm:text-lg">{userProfile.promo_credits || 0} Promotion Credits</h3>
                                <p className="text-neutral-500 text-xs">Used to boost visibility & ads</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsBuyPromoOpen(true)}
                            className="px-4 py-2 bg-amber-500 text-black text-xs font-black rounded-lg hover:bg-amber-400 transition-all shadow-lg shadow-amber-900/20 uppercase tracking-wider"
                        >
                            Buy Credits
                        </button>
                    </div>

                </div>

                {/* RIGHT COLUMN: Payment Methods */}
                <div className={`lg:col-span-5 ${activeTab === 'methods' ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-[#0a0a0a] border border-transparent rounded-2xl lg:h-full lg:min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-transparent flex items-center justify-between">
                            <h3 className="font-bold text-white">Payment Methods</h3>
                            <button
                                onClick={handleOpenAddMethod}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">

                            {/* Payment Methods List (Currently Empty) */}
                            {/* Payment Methods List */}
                            {isMethodsLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                    <p className="text-neutral-500 text-xs">Loading methods...</p>
                                </div>
                            ) : paymentMethods.length > 0 ? (
                                <div className="space-y-3">
                                    {paymentMethods.map((pm) => (
                                        <div key={pm.id} className="bg-neutral-900/50 p-4 rounded-xl flex items-center justify-between group hover:bg-neutral-900 transition-colors border border-transparent hover:border-neutral-800">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm capitalize">{pm.brand} •••• {pm.last4}</p>
                                                    <p className="text-neutral-500 text-xs">Expires {pm.exp_month}/{pm.exp_year}</p>
                                                </div>
                                            </div>
                                            {/* Could add delete button here later */}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-neutral-500">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">No Payment Methods</p>
                                        <p className="text-neutral-500 text-xs">Add a card to purchase items quickly.</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleOpenAddMethod}
                                className="w-full py-4 border border-dashed border-transparent rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-white hover:border-neutral-700 hover:bg-white/5 transition-all text-sm font-medium"
                            >
                                <Plus size={16} /> Add Payment Method
                            </button>
                        </div>

                        <div className="p-4 bg-neutral-900/30 text-[10px] text-neutral-500 text-center leading-relaxed">
                            <Lock size={10} className="inline mr-1" />
                            Payments are processed securely via Stripe. We do not store your full card details.
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD PAYMENT METHOD MODAL - Keeping Mock Logic for now as requested */}
            {isAddMethodOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-[#0a0a0a] border border-transparent rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header/Tabs/Content from original file... keeping brief for edit size */}
                        <div className="p-4 border-b border-transparent flex items-center justify-between">
                            <h3 className="font-bold text-white">Add Payment Method</h3>
                            <button onClick={() => setIsAddMethodOpen(false)} className="p-1 text-neutral-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            {setupIntentSecret ? (
                                <Elements stripe={stripePromise} options={{
                                    clientSecret: setupIntentSecret,
                                    appearance: {
                                        theme: 'night',
                                        variables: {
                                            colorPrimary: '#ffffff',
                                            colorBackground: '#171717',
                                            colorText: '#ffffff',
                                            colorDanger: '#ef4444',
                                            fontFamily: 'Instrument Sans, system-ui, sans-serif',
                                        }
                                    }
                                }}>
                                    <AddPaymentMethodForm
                                        onSuccess={handleMethodAdded}
                                        onCancel={() => setIsAddMethodOpen(false)}
                                    />
                                </Elements>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                    <p className="text-neutral-500 text-sm">Initializing secure connection...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BUY PROMOTION CREDITS MODAL */}
            {isBuyPromoOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-white">Buy Credits</h3><button onClick={() => setIsBuyPromoOpen(false)}><X size={20} className="text-neutral-500" /></button></div>
                        {!purchaseSuccess ? (
                            <>
                                <p className="text-neutral-400 text-sm mb-4">Exchange 100 Gems for 10 Credits.</p>
                                {purchaseError && <p className="text-red-500 text-xs mb-2">{purchaseError}</p>}
                                <button onClick={handleExchangeGems} disabled={exchangeLoading} className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl">{exchangeLoading ? 'Processing...' : 'Exchange 100 Gems'}</button>
                            </>
                        ) : (
                            <div className="text-center py-4"><Check size={40} className="text-green-500 mx-auto mb-2" /><p className="text-white font-bold">Success!</p></div>
                        )}
                    </div>
                </div>
            )}

            {/* BUY GEMS MODAL */}
            {isBuyGemsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsBuyGemsOpen(false)}>
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-white">Buy Gems</h3><button onClick={() => setIsBuyGemsOpen(false)}><X size={20} className="text-neutral-500" /></button></div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[100, 500, 1200, 2500].map(amt => (
                                <button key={amt} onClick={() => handleBuyGems(amt)} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg hover:border-purple-500 transition-colors">
                                    <div className="text-lg font-bold text-white">{amt}</div>
                                    <div className="text-xs text-neutral-500">Gems</div>
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-xs text-neutral-500">Demo Purchase</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
