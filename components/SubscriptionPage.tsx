import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Check,
    Zap,
    Crown,
    Layers,
    Shield,
    Database,
    Users,
    ArrowRight,
    CheckCircle,
    Copy,
    QrCode,
    AlertTriangle,
    ShieldCheck,
    CreditCard,
    Lock,
    X,
    Bitcoin,
    Layout,
    Star
} from 'lucide-react';
import { View, UserProfile } from '../types';
import { updateUserProfile } from '../services/supabaseService';
import { Gem } from 'lucide-react';

interface SubscriptionPageProps {
    onNavigate?: (view: View | string) => void;
    userProfile?: UserProfile | null;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate, userProfile }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const plans = [
        {
            name: 'Basic',
            price: billingCycle === 'monthly' ? 7.99 : 79.99,
            description: 'Perfect for upcoming artists and casual creators.',
            icon: <Layers size={24} className="text-neutral-400" />,
            features: [
                '5GB Cloud Storage',
                'Mobile Studio Access',
                'Basic Marketplace Tools',
                'Public Profile Page',
                'Standard Support'
            ],
            cta: 'Get Started',
            popular: false,
            color: 'neutral'
        },
        {
            name: 'Pro',
            price: billingCycle === 'monthly' ? 14.99 : 149.99,
            description: 'Advanced tools for the serious music professional.',
            icon: <Zap size={24} className="text-primary" />,
            features: [
                '15GB Cloud Storage',
                '0% Marketplace Fees',
                'Advanced Collaboration Tools',
                'Unlimited Project Drafts',
                'Verified Artist Badge',
                'Priority Support'
            ],
            cta: 'Upgrade to Pro',
            popular: true,
            color: 'primary'
        },
        {
            name: 'Studio+',
            price: billingCycle === 'monthly' ? 24.99 : 249.99,
            description: 'The ultimate suite for label-ready production workflows.',
            icon: <Crown size={24} className="text-amber-400" />,
            features: [
                '25GB Cloud Storage',
                'Enhanced Workflow (Notes+)',
                '100 Promotion Credits / mo',
                'Contract Automation',
                'Early Access Features',
                'Concierge Support',
                'Custom Profile Themes'
            ],
            cta: 'Go Studio+',
            popular: false,
            color: 'premium'
        }
    ];

    const handleUpgradeClick = (planName: string) => {
        if (!userProfile?.id) {
            // Trigger auth if needed
            return;
        }
        setSelectedPlan(planName);
    };

    const handlePaymentConfirm = async () => {
        if (!userProfile?.id || !selectedPlan) return;

        try {
            await updateUserProfile(userProfile.id, { plan: selectedPlan as any });
            setSuccess(selectedPlan);
            window.dispatchEvent(new CustomEvent('profile-updated'));
            setTimeout(() => setSuccess(null), 5000);
            setSelectedPlan(null);
        } catch (err) {
            console.error('Failed to upgrade plan:', err);
        }
    };

    const targetPlan = plans.find(p => p.name === selectedPlan);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pt-0 pb-8 lg:px-6 lg:pt-0 lg:pb-[15px] animate-in fade-in duration-700 relative lg:[zoom:1.08] origin-top">
            {/* Header */}
            <div className="text-center pt-[20px] mb-10 lg:mb-12">
                <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter mb-4 uppercase">
                    Elevate Your <span className="text-primary">Sound</span>
                </h1>
                <p className="text-neutral-500 text-sm lg:text-lg max-w-2xl lg:max-w-none mx-auto font-medium">
                    Choose the plan that fits your workflow. From recording sketches to managing a professional studio.
                </p>

                {/* Billing Toggle */}
                <div className="mt-6 flex items-center justify-center gap-4">
                    <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-neutral-500'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="w-12 h-6 bg-neutral-800 rounded-full p-1 relative transition-colors hover:bg-neutral-700"
                    >
                        <div className={`w-4 h-4 bg-primary rounded-full transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                    <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-neutral-500'}`}>
                        Yearly <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">SAVE 20%</span>
                    </span>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`
                            relative flex flex-col p-6 lg:p-8 rounded-3xl border transition-all duration-500 hover:scale-[1.02]
                            ${plan.popular
                                ? 'bg-[#0a0a0a] border-primary/30 shadow-[0_20px_40px_rgba(var(--primary),0.05)]'
                                : plan.color === 'premium'
                                    ? 'bg-gradient-to-b from-amber-500/5 to-transparent border-amber-500/20 shadow-[0_20px_40px_rgba(245,158,11,0.05)]'
                                    : 'bg-neutral-900/30 border-white/5 shadow-xl hover:border-white/10'
                            }
                        `}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-6 lg:mb-8">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${plan.color === 'primary' ? 'bg-primary/10' : plan.color === 'premium' ? 'bg-amber-400/10' : 'bg-white/5'
                                }`}>
                                {plan.icon}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                            <p className="text-neutral-500 text-sm leading-relaxed">{plan.description}</p>
                        </div>

                        <div className="mb-6 lg:mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white font-mono">${plan.price}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 mb-8">
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className={`p-0.5 rounded-full ${plan.color === 'primary' ? 'text-primary' : plan.color === 'premium' ? 'text-amber-400' : 'text-neutral-500'}`}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                    <span className="text-sm text-neutral-300">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleUpgradeClick(plan.name)}
                            disabled={userProfile?.plan === plan.name}
                            className={`
                                w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all
                                ${userProfile?.plan === plan.name
                                    ? 'bg-neutral-800 text-neutral-500 cursor-default'
                                    : plan.color === 'primary'
                                        ? 'bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20'
                                        : plan.color === 'premium'
                                            ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                }
                            `}
                        >
                            {success === plan.name
                                ? 'Subscribed!'
                                : userProfile?.plan === plan.name
                                    ? 'Current Plan'
                                    : plan.cta}
                        </button>
                    </div>
                ))}
            </div>

            {/* FAQ / Trust Badges */}
            <div className="mt-12 lg:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
                <TrustBadge
                    icon={<Shield size={20} />}
                    title="Secure Payments"
                    desc="Encrypted stripe transactions."
                />
                <TrustBadge
                    icon={<Database size={20} />}
                    title="Cloud Sync"
                    desc="Auto-sync across all devices."
                />
                <TrustBadge
                    icon={<Users size={20} />}
                    title="Collab Ready"
                    desc="built for creative teams."
                />
                <TrustBadge
                    icon={<Layout size={20} />}
                    title="Customizable"
                    desc="Your studio, your style."
                />
            </div>

            {/* Bottom Callout */}
            <div className="mt-12 lg:mt-16 p-6 lg:p-12 rounded-[2rem] bg-gradient-to-r from-neutral-900 to-black border border-white/5 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl lg:text-3xl font-black text-white mb-4">Questions about Enterprise solutions?</h2>
                    <p className="text-neutral-500 mb-8 max-w-lg mx-auto">Scaling a label or a large team? Contact us for custom storage limits and white-label options.</p>
                    <button className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
                        Talk to Support
                    </button>
                </div>
                <Star className="absolute top-1/2 right-10 -translate-y-1/2 text-white/5 w-40 h-40 rotate-12 group-hover:rotate-[30deg] transition-transform duration-1000" />
            </div>

            {/* Payment Modal */}
            {selectedPlan && targetPlan && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full h-full sm:h-auto max-w-2xl bg-[#0a0a0a] border-0 sm:border border-neutral-800 rounded-none sm:rounded-3xl overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-[#0a0a0a] p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Upgrade to <span className={targetPlan.color === 'primary' ? 'text-primary' : 'text-amber-400'}>{targetPlan.name}</span>
                            </h3>
                            <button onClick={() => setSelectedPlan(null)} className="p-2 text-neutral-500 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0">
                            <PaymentForm
                                total={targetPlan.price}
                                planName={targetPlan.name}
                                billingCycle={billingCycle}
                                onConfirm={handlePaymentConfirm}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// Internal Payment Form Component
const PaymentForm = ({ total, planName, billingCycle, onConfirm }: { total: number, planName: string, billingCycle: string, onConfirm: () => void }) => {
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedCoin, setSelectedCoin] = useState('BTC');

    const handlePay = async () => {
        setIsProcessing(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        await onConfirm();
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col md:flex-row min-h-[500px] md:min-h-0">
            {/* Payment Methods */}
            <div className="w-full md:w-1/3 border-r border-white/5 bg-neutral-900/30 p-4 space-y-2">
                <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'card' ? 'bg-primary/10 border-primary text-white' : 'bg-transparent border-transparent text-neutral-500 hover:bg-white/5'}`}
                >
                    <CreditCard size={20} />
                    <span className="font-bold text-sm">Credit Card</span>
                </button>
                <button
                    onClick={() => setPaymentMethod('crypto')}
                    className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${paymentMethod === 'crypto' ? 'bg-primary/10 border-primary text-white' : 'bg-transparent border-transparent text-neutral-500 hover:bg-white/5'}`}
                >
                    <Bitcoin size={20} />
                    <span className="font-bold text-sm">Crypto</span>
                </button>
            </div>

            {/* Form Area */}
            <div className="flex-1 p-6 md:p-8 flex flex-col">
                <div className="flex-1">
                    <div className="mb-6 pb-6 border-b border-white/5">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Total due today</span>
                            <span className="text-2xl font-black text-white font-mono">${total}</span>
                        </div>
                        <p className="text-xs text-neutral-600">Billed {billingCycle}</p>
                    </div>

                    {paymentMethod === 'card' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Card Number</label>
                                <div className="relative">
                                    <input type="text" className="w-full bg-black border border-neutral-800 rounded-lg p-3 pl-10 text-white text-sm focus:border-primary/50 focus:outline-none font-mono placeholder-neutral-700" placeholder="0000 0000 0000 0000" />
                                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Expiry</label>
                                    <input type="text" className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-primary/50 focus:outline-none font-mono placeholder-neutral-700" placeholder="MM/YY" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">CVC</label>
                                    <div className="relative">
                                        <input type="text" className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-primary/50 focus:outline-none font-mono placeholder-neutral-700" placeholder="123" />
                                        <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-2">
                                <ShieldCheck size={12} className="text-green-500" />
                                Fully encrypted & secure transaction.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex gap-1 mb-4">
                                {['BTC', 'ETH', 'USDC', 'SOL'].map(coin => (
                                    <button
                                        key={coin}
                                        onClick={() => setSelectedCoin(coin)}
                                        className={`px-3 py-1 rounded border text-[10px] font-bold ${selectedCoin === coin ? 'bg-white text-black border-white' : 'bg-black border-neutral-800 text-neutral-500 hover:text-white'}`}
                                    >
                                        {coin}
                                    </button>
                                ))}
                            </div>

                            <div className="text-center p-4 bg-black border border-neutral-800 rounded-xl relative overflow-hidden group cursor-pointer hover:border-white/20 transition-colors">
                                <QrCode size={80} className="mx-auto text-white mb-2" />
                                <p className="text-[10px] text-neutral-500">Scan to Pay</p>
                            </div>

                            <div className="flex items-center gap-2 bg-black border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-500">
                                <span className="truncate flex-1">0x71C7...B5f6d8976F</span>
                                <Copy size={12} className="shrink-0 hover:text-white cursor-pointer" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 mt-2">
                    <button
                        onClick={handlePay}
                        disabled={isProcessing}
                        className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? 'Processing Payment...' : `Confirm Upgrade ($${total})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TrustBadge = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 mb-3">
            {icon}
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{title}</h4>
        <p className="text-[9px] text-neutral-600 leading-tight">{desc}</p>
    </div>
);

export default SubscriptionPage;
