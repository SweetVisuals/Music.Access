
import React, { useState } from 'react';
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
    Smartphone,
    Globe,
    Lock,
    Zap,
    TrendingUp
} from 'lucide-react';
import * as supabaseService from '../services/supabaseService';

interface WalletPageProps {
    userProfile: UserProfile | null;
}

// Mock Payment Methods for UI demo
const MOCK_PAYMENT_METHODS = [
    { id: '1', type: 'visa', last4: '4242', expiry: '12/28', isDefault: true },
    { id: '2', type: 'paypal', email: 'user@example.com', isDefault: false }
];

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

    const handleExchangeGems = async () => {
        if (!userProfile) return;
        if (userProfile.gems < 100) {
            setPurchaseError('Insufficient Gems. You need 100 Gems.');
            return;
        }

        setExchangeLoading(true);
        setPurchaseError(null);

        try {
            // Use the atomic RPC function
            await supabaseService.exchangeGemsForCredits(userProfile.id!, 100, 10);

            setPurchaseSuccess(true);

            // Dispatch custom event to notify App.tsx to refresh profile
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
        // Simulate API call to stripe/provider
        setTimeout(() => {
            setIsProcessing(false);
            setIsBuyGemsOpen(false);
            // In a real app, this would redirect to checkout or refresh gems
            alert(`Demo: Successfully purchased ${amount} Gems!`);
            window.dispatchEvent(new CustomEvent('profile-updated'));
        }, 1500);
    };

    const handleAddMethod = () => {
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            setIsAddMethodOpen(false);
            // In a real app, this would refresh the payment methods list
        }, 1500);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-4 lg:pb-32 pt-6 px-4 lg:px-8 animate-in fade-in duration-500 relative">

            {/* Header / Title */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Wallet</h1>
                    <p className="text-neutral-500 text-xs lg:text-sm">Manage balance & payment methods</p>
                </div>
                <button className="lg:hidden p-2 bg-neutral-900 rounded-full text-neutral-400 hover:text-white">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Mobile Tabs */}
            <div className="flex lg:hidden bg-neutral-900/50 p-1 rounded-xl mb-6 border border-white/5 relative">
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

                {/* LEFT COLUMN: Balance Cards (Always visible on Desktop, Tabbed on Mobile) */}
                <div className={`lg:col-span-7 space-y-6 ${activeTab === 'balance' ? 'block' : 'hidden lg:block'}`}>

                    {/* Main Balance Card */}
                    <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl border border-white/10 bg-[#0a0a0a] group">
                        {/* Abstract Background Art */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="relative p-6 lg:p-8 flex flex-col justify-between h-auto min-h-[220px]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wallet size={16} className="text-primary" />
                                        <span className="text-[10px] lg:text-xs font-mono uppercase tracking-widest text-neutral-400">Total Balance</span>
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                                        {formatCurrency(userProfile?.balance || 0)}
                                    </h2>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <ShieldCheck size={20} className="text-emerald-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm lg:text-base hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5">
                                    <ArrowDownLeft size={18} /> Withdraw
                                </button>
                                <button className="flex-1 bg-white/5 text-white border border-white/10 py-3 rounded-xl font-bold text-sm lg:text-base hover:bg-white/10 transition-colors flex items-center justify-center gap-2 backdrop-blur-md">
                                    <Plus size={18} /> Add Funds
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Gems Card */}
                    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{userProfile?.gems || 0} Gems</h3>
                                <p className="text-neutral-500 text-xs">Approx. {formatCurrency((userProfile?.gems || 0) * 0.01)} USD</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsBuyGemsOpen(true)}
                            className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 transition-colors shadow-lg shadow-purple-900/20 font-black uppercase tracking-wider"
                        >
                            Buy Gems
                        </button>
                    </div>

                    {/* Promotion Credits Card */}
                    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                                <Zap size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{userProfile?.promo_credits || 0} Promotion Credits</h3>
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

                    {/* Recent Transactions Placeholder */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <ArrowUpRight size={16} className="text-neutral-500" /> Recent Activity
                        </h3>
                        <div className="space-y-2">
                            {/* Empty State */}
                            <div className="p-8 border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-center bg-neutral-900/20">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                                    <ArrowUpRight size={18} className="text-neutral-600" />
                                </div>
                                <p className="text-neutral-400 text-sm font-medium">No recent transactions</p>
                                <p className="text-neutral-600 text-xs mt-1">Your detailed history will appear here.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Payment Methods (Always visible on Desktop, Tabbed on Mobile) */}
                <div className={`lg:col-span-5 ${activeTab === 'methods' ? 'block' : 'hidden lg:block'}`}>
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl lg:h-full lg:min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white">Payment Methods</h3>
                            <button
                                onClick={() => setIsAddMethodOpen(true)}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            {MOCK_PAYMENT_METHODS.map(method => (
                                <div key={method.id} className="group relative p-4 rounded-xl border border-white/5 bg-neutral-900/50 hover:bg-neutral-900 hover:border-white/10 transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-7 bg-white rounded flex items-center justify-center shadow-sm">
                                                {method.type === 'visa' ? (
                                                    <CreditCard size={16} className="text-blue-600" />
                                                ) : (
                                                    <Globe size={16} className="text-[#003087]" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                                    {method.type === 'visa' ? `•••• ${method.last4}` : 'PayPal'}
                                                    {method.isDefault && (
                                                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">DEFAULT</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                                    {method.type === 'visa' ? `Expires ${method.expiry}` : method.email}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            ))}

                            <button
                                onClick={() => setIsAddMethodOpen(true)}
                                className="w-full py-4 border border-dashed border-neutral-800 rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-white hover:border-neutral-700 hover:bg-white/5 transition-all text-sm font-medium"
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

            {/* ADD PAYMENT METHOD MODAL */}
            {isAddMethodOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white">Add Payment Method</h3>
                            <button
                                onClick={() => setIsAddMethodOpen(false)}
                                className="p-1 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex p-2 gap-2 border-b border-white/5 bg-neutral-900/30">
                            <button
                                onClick={() => setAddMethodType('card')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${addMethodType === 'card' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <CreditCard size={14} /> Credit Card
                            </button>
                            <button
                                onClick={() => setAddMethodType('paypal')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${addMethodType === 'paypal' ? 'bg-[#003087] text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Globe size={14} /> PayPal
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {addMethodType === 'card' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Card Number</label>
                                        <div className="relative">
                                            <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                            <input
                                                type="text"
                                                placeholder="0000 0000 0000 0000"
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-neutral-700 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Expiry</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={expiry}
                                                onChange={(e) => setExpiry(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-neutral-700 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">CVC</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="123"
                                                    value={cvc}
                                                    onChange={(e) => setCvc(e.target.value)}
                                                    className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-neutral-700 font-mono"
                                                />
                                                <ShieldCheck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cardholder Name</label>
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-neutral-700"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-[#003087]/10 rounded-full flex items-center justify-center text-[#003087] border border-[#003087]/20">
                                        <Globe size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Connect PayPal</h4>
                                        <p className="text-neutral-500 text-xs max-w-[200px] mx-auto">You will be redirected to PayPal to verify your account.</p>
                                    </div>
                                </div>
                            )}

                            {/* Secure Badge */}
                            <div className="flex items-center justify-center gap-1.5 mt-6 mb-2">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span className="text-[10px] text-neutral-500 font-medium">Bank-grade 256-bit encryption</span>
                            </div>

                            <button
                                onClick={handleAddMethod}
                                disabled={isProcessing}
                                className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 mt-2
                                    ${addMethodType === 'card'
                                        ? 'bg-primary text-black hover:bg-primary/90'
                                        : 'bg-[#003087] text-white hover:bg-[#002570]'
                                    } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isProcessing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        {addMethodType === 'card' ? 'Securely Add Card' : 'Continue to PayPal'} <ArrowUpRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* BUY PROMOTION CREDITS MODAL */}
            {isBuyPromoOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white">Buy Promotion Credits</h3>
                            <button
                                onClick={() => setIsBuyPromoOpen(false)}
                                className="p-1 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {!purchaseSuccess ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                                            <Zap size={32} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-xl">10 Promotion Credits</h4>
                                            <p className="text-neutral-500 text-sm mt-1">Boost your tracks and profile</p>
                                        </div>
                                    </div>

                                    <div className="bg-neutral-900/50 rounded-xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-neutral-400 text-xs font-medium">Price</span>
                                            <div className="flex items-center gap-1.5 font-bold text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                                                100 Gems
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-neutral-400 text-xs font-medium">Your Balance</span>
                                            <div className="flex items-center gap-1.5 font-bold text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                                                {userProfile?.gems || 0} Gems
                                            </div>
                                        </div>
                                    </div>

                                    {purchaseError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium flex items-center gap-2">
                                            <X size={14} /> {purchaseError}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleExchangeGems}
                                        disabled={exchangeLoading || (userProfile?.gems || 0) < 100}
                                        className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 uppercase
                                            ${(userProfile?.gems || 0) < 100
                                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                                : 'bg-white text-black hover:bg-neutral-200'
                                            } ${exchangeLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {exchangeLoading ? 'Processing...' : 'Confirm Exchange'}
                                    </button>
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                        <Check size={32} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-xl">Purchase Successful!</h4>
                                        <p className="text-neutral-500 text-sm mt-1">Your credits are now available.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BUY GEMS MODAL */}
            {isBuyGemsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsBuyGemsOpen(false)}>
                    <div
                        className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white">Purchase Gems</h3>
                            <button
                                onClick={() => setIsBuyGemsOpen(false)}
                                className="p-1 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { amount: 100, price: 0.99 },
                                        { amount: 500, price: 4.49, popular: true },
                                        { amount: 1200, price: 9.99 },
                                        { amount: 2500, price: 19.99 }
                                    ].map((pack) => (
                                        <button
                                            key={pack.amount}
                                            onClick={() => setActiveGemPack(pack.amount)}
                                            className={`relative p-4 rounded-xl border text-center transition-all ${activeGemPack === pack.amount ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                                        >
                                            {pack.popular && (
                                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">Popular</span>
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                                                <span className="text-lg font-black text-white">{pack.amount}</span>
                                                <span className="text-[10px] text-neutral-500 font-bold">${pack.price}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => activeGemPack && handleBuyGems(activeGemPack)}
                                    disabled={!activeGemPack || isProcessing}
                                    className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 uppercase mt-4
                                        ${!activeGemPack || isProcessing
                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                            : 'bg-white text-black hover:bg-neutral-200'}`}
                                >
                                    {isProcessing ? 'Connecting...' : 'Secure Checkout'}
                                </button>

                                <div className="text-center">
                                    <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">Secure payment by Stripe</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
