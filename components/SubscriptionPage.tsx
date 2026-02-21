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
    ShieldCheck,
    Lock,
    X,
    Layout,
    Star
} from 'lucide-react';
import { View, UserProfile } from '../types';
import { updateUserProfile } from '../services/supabaseService';
import * as stripeService from '../services/stripeService';
import { Gem } from 'lucide-react';
import { DirectPaymentForm } from './DirectPaymentForm';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

interface SubscriptionPageProps {
    onNavigate?: (view: View | string) => void;
    userProfile?: UserProfile | null;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate, userProfile }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const { showToast } = useToast();

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
            // Mocking the data that would usually come from a Webhook
            const now = new Date();
            const nextPeriod = new Date();
            if (billingCycle === 'yearly') {
                nextPeriod.setFullYear(now.getFullYear() + 1);
            } else {
                nextPeriod.setMonth(now.getMonth() + 1);
            }

            await updateUserProfile(userProfile.id, {
                plan: selectedPlan as any,
                subscription_status: 'active',
                subscription_id: `sub_${Math.random().toString(36).substr(2, 9)}`,
                current_period_end: nextPeriod.toISOString(),
                cancel_at_period_end: false
            });
            setSuccess(selectedPlan);
            window.dispatchEvent(new CustomEvent('profile-updated'));
            setTimeout(() => setSuccess(null), 5000);
            setSelectedPlan(null);
        } catch (err) {
            console.error('Failed to upgrade plan:', err);
        }
    };

    const [cancelling, setCancelling] = useState(false);

    const handleCancelPlan = async () => {
        if (!userProfile?.id) return;

        const isCancelling = userProfile.cancel_at_period_end;
        if (isCancelling) {
            // Logic to Resume would go here if we supported it
            return;
        }

        setCancelling(true);
        try {
            const subId = userProfile.subscription_id || 'sub_mock_fallback';
            const isTest = subId.startsWith('sub_test_') || subId.includes('_mock');

            if (isTest) {
                console.log("Cancelling test subscription instantly");
                // For test subscriptions, we cancel immediately
                await updateUserProfile(userProfile.id, {
                    plan: null,
                    subscription_status: 'canceled',
                    subscription_id: null,
                    current_period_end: null,
                    cancel_at_period_end: false
                });
            } else {
                // Real Stripe subscription
                await stripeService.cancelSubscription(userProfile.id, subId);
                // Optimistic update for UI
                await updateUserProfile(userProfile.id, { cancel_at_period_end: true });
            }

            window.dispatchEvent(new CustomEvent('profile-updated'));
            showToast(isTest ? 'Subscription cancelled instantly.' : 'Subscription set to cancel at period end.', 'success');
        } catch (err) {
            console.error('Failed to cancel plan:', err);
            showToast('Failed to cancel plan. Please try again.', 'error');
        } finally {
            setCancelling(false);
            setShowCancelModal(false);
        }
    };

    const targetPlan = plans.find(p => p.name === selectedPlan);

    return (
        <div className="w-full max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 pt-12 lg:pt-24 pb-32 animate-in fade-in duration-1000 relative">
            {/* Massive Header Hero */}
            <div className="text-center mb-16 lg:mb-24 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[400px] bg-primary/20 blur-[150px] rounded-[100%] pointer-events-none -z-10"></div>

                <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black text-white mb-6 tracking-tighter drop-shadow-2xl">
                    Command Your <span className="text-transparent bg-clip-text bg-gradient-to-tr from-primary via-emerald-400 to-amber-400">Empire.</span>
                </h1>
                <p className="text-neutral-400 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed font-medium mb-12">
                    Supercharge your sonic distribution, eliminate marketplace friction, and claim your rightful place in the industry hierarchy. Choose the architecture that fits your ambition.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center justify-center gap-6 p-2 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-white text-black shadow-lg scale-105' : 'text-neutral-500 hover:text-white'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-8 py-3 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-primary text-black shadow-[0_0_30px_rgba(var(--primary)/0.4)] scale-105' : 'text-neutral-500 hover:text-white'}`}
                    >
                        Yearly <span className={`px-2 py-0.5 rounded ${billingCycle === 'yearly' ? 'bg-black/20' : 'bg-primary/20 text-primary'} text-[9px] font-black`}>SAVE 20%</span>
                    </button>
                </div>
            </div>

            {/* Plans Grid (Expanded) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-12 relative z-10 w-full max-w-[1700px] mx-auto">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`
                            relative flex flex-col p-8 lg:p-12 rounded-[3rem] border transition-all duration-700 hover:-translate-y-2
                            ${plan.popular
                                ? 'bg-[#0a0a0a] border-primary/40 shadow-[0_30px_80px_rgba(var(--primary),0.15)] ring-1 ring-primary/20'
                                : plan.color === 'premium'
                                    ? 'bg-gradient-to-b from-amber-500/10 to-[#0a0a0a] border-amber-500/30 ring-1 ring-amber-500/10 shadow-[0_30px_80px_rgba(245,158,11,0.15)]'
                                    : 'bg-white/[0.02] backdrop-blur-3xl border-white/5 shadow-2xl hover:border-white/10'
                            }
                        `}
                    >
                        {plan.popular && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-black text-[12px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_10px_30px_rgba(var(--primary),0.4)] border border-primary/20 backdrop-blur-md whitespace-nowrap">
                                The Industry Standard
                            </div>
                        )}

                        <div className="mb-8 lg:mb-12">
                            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ${plan.color === 'primary' ? 'bg-primary/20 text-primary' : plan.color === 'premium' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 text-white'
                                }`}>
                                {plan.icon}
                            </div>
                            <h3 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">{plan.name}</h3>
                            <p className="text-neutral-400 text-sm lg:text-base leading-relaxed font-medium min-h-[50px]">{plan.description}</p>
                        </div>

                        <div className="mb-8 lg:mb-12">
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl lg:text-7xl font-black text-white tracking-tighter">
                                    <span className="text-3xl lg:text-4xl text-neutral-500 mr-2 -translate-y-4 inline-block">$</span>
                                    {plan.price}
                                </span>
                                <span className="text-neutral-500 text-sm font-black uppercase tracking-[0.2em]">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                            {billingCycle === 'yearly' && (
                                <div className="text-primary text-xs font-black uppercase tracking-widest mt-4 bg-primary/10 inline-block px-3 py-1 rounded-md">Billed annually (${(plan.price * 12).toFixed(2)})</div>
                            )}
                        </div>

                        <div className="flex-1 space-y-5 mb-12">
                            {plan.features.map((feature, idx) => {
                                const isCredits = feature.toLowerCase().includes('promotion credits') || feature.toLowerCase().includes('credits');
                                const isGems = feature.toLowerCase().includes('gem');

                                return (
                                    <div key={idx} className="flex items-center gap-4 group/feature overflow-hidden">
                                        {isCredits ? (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                                <Star size={14} className="text-black fill-black" />
                                            </div>
                                        ) : isGems ? (
                                            <div className="w-8 h-8 flex items-center justify-center shrink-0 drop-shadow-[0_0_10px_rgba(var(--primary)/0.5)]">
                                                <Gem size={24} className="text-primary" />
                                            </div>
                                        ) : (
                                            <div className={`p-1.5 rounded-full bg-white/5 group-hover/feature:bg-white/10 transition-colors shrink-0 ${plan.color === 'primary' ? 'text-primary' : plan.color === 'premium' ? 'text-amber-400' : 'text-neutral-400'}`}>
                                                <Check size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                        <span className="text-base text-neutral-300 font-medium">{feature}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-4 mt-auto">
                            <button
                                onClick={() => handleUpgradeClick(plan.name)}
                                disabled={userProfile?.plan === plan.name}
                                className={`
                                    w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all duration-300
                                    ${userProfile?.plan === plan.name
                                        ? 'bg-neutral-900/50 text-neutral-600 cursor-default border border-neutral-800'
                                        : plan.color === 'primary'
                                            ? 'bg-primary text-black hover:bg-white shadow-[0_15px_40px_rgba(var(--primary)/0.3)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-[1.02]'
                                            : plan.color === 'premium'
                                                ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:from-amber-300 hover:to-amber-500 shadow-[0_15px_40px_rgba(245,158,11,0.3)] hover:scale-[1.02]'
                                                : 'bg-white/[0.03] text-white hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-[1.02]'
                                    }
                                `}
                            >
                                {success === plan.name
                                    ? 'Subscription Activated'
                                    : (userProfile?.plan === plan.name)
                                        ? 'Active Architecture'
                                        : plan.cta}
                            </button>

                            {userProfile?.plan === plan.name && (
                                <div className="mt-4 text-center space-y-3">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-xs text-neutral-400 font-mono">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        {userProfile.current_period_end ? (
                                            userProfile.cancel_at_period_end
                                                ? `Access locked until ${new Date(userProfile.current_period_end).toLocaleDateString()}`
                                                : `Cycle renews on ${new Date(userProfile.current_period_end).toLocaleDateString()}`
                                        ) : (
                                            userProfile.cancel_at_period_end ? 'Termination Sequence Initiated' : 'Subsystem Active'
                                        )}
                                    </div>

                                    {!userProfile.cancel_at_period_end && (
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            disabled={cancelling}
                                            className="w-full py-3 text-[10px] uppercase font-black tracking-[0.2em] text-neutral-600 hover:text-red-500 bg-transparent hover:bg-red-500/10 rounded-2xl transition-all"
                                        >
                                            {cancelling ? 'Initiating...' : 'Terminate Subscription'}
                                        </button>
                                    )}
                                    {userProfile.cancel_at_period_end && (
                                        <div className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] py-2">
                                            Termination Pending
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Expansive ROI Section & Features Break-out */}
            <div className="mt-24 lg:mt-40">
                <div className="text-center mb-16 lg:mb-24">
                    <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter mb-6 drop-shadow-lg">The Return Is Undeniable.</h2>
                    <p className="text-neutral-500 text-lg font-medium max-w-2xl mx-auto">See why the top 1% of creators and labels deploy exclusively on our infrastructure.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 max-w-[1700px] mx-auto">
                    <TrustBadge
                        icon={<Shield size={28} />}
                        title="Quantum Security"
                        desc="Bank-level encryption secures every stem, beat, and transaction across the entire global network. Unbreachable."
                    />
                    <TrustBadge
                        icon={<Database size={28} />}
                        title="Omni-Sync Storage"
                        desc="Instantaneous cloud propagation. Start in the massive desktop studio, finish on the mobile app instantly."
                    />
                    <TrustBadge
                        icon={<Users size={28} />}
                        title="Hyper Collaboration"
                        desc="Split sheets natively integrated. Revenue disperses automatically to all contributing sound architects."
                    />
                    <TrustBadge
                        icon={<Layout size={28} />}
                        title="Bespoke Storefronts"
                        desc="White-label your empire. Remove friction, establish dominance, and convert listeners into buyers rapidly."
                    />
                </div>
            </div>

            {/* Massive Bottom Callout - Selling Enterprise */}
            <div className="mt-24 lg:mt-40 p-10 lg:p-24 rounded-[4rem] bg-gradient-to-br from-[#0a0a0a] via-black to-[#0a0a0a] border border-white/5 text-center relative overflow-hidden group shadow-2xl mx-auto max-w-[1700px] flex items-center justify-center flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50"></div>

                {/* Decorative floating elements */}
                <div className="absolute top-10 left-10 w-48 h-48 bg-primary/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-[120px]"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <h2 className="text-4xl lg:text-7xl font-black text-white mb-8 tracking-tighter drop-shadow-2xl">Running an Empire?</h2>
                    <p className="text-neutral-400 text-lg lg:text-2xl mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
                        Deploy a custom instance of our architecture. White-label solutions, unlimited terabyte pipelines, and dedicated tier-one engineering support.
                    </p>
                    <button className="px-12 py-6 bg-white text-black rounded-full text-sm font-black uppercase tracking-[0.2em] hover:bg-neutral-200 hover:scale-[1.03] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)] ring-4 ring-white/10 inline-flex items-center gap-4">
                        Initialize Enterprise Contact <ArrowRight size={20} />
                    </button>
                </div>
                <Crown className="absolute -bottom-10 -left-10 text-white/5 w-64 h-64 -rotate-12 group-hover:-rotate-[5deg] transition-transform duration-[3000ms]" />
                <Star className="absolute -top-20 -right-20 text-white/5 w-96 h-96 rotate-12 group-hover:rotate-[25deg] transition-transform duration-[3000ms]" />
            </div>

            {/* Payment Modal */}
            {selectedPlan && targetPlan && createPortal(
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl bg-black border border-white/5 sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                Initialize <span className={targetPlan.color === 'primary' ? 'text-primary' : 'text-amber-400'}>{targetPlan.name}</span> Protocol
                            </h3>
                            <button onClick={() => setSelectedPlan(null)} className="p-3 text-neutral-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                            <DirectPaymentForm
                                userId={userProfile.id}
                                mode="subscription"
                                total={targetPlan.price}
                                planName={targetPlan.name}
                                billingCycle={billingCycle}
                                onSuccess={handlePaymentConfirm}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Cancel Confirmation Modal */}
            <ConfirmationModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelPlan}
                title="Terminate Subscription"
                message={`Are you sure you want to abort? You will retain access until ${new Date(userProfile?.current_period_end || Date.now()).toLocaleDateString()}. Your data will be preserved, but you'll lose access to premium pipelines after this date.`}
                confirmLabel="Yes, Terminate Plan"
                cancelLabel="Keep Architecture Active"
                isDestructive={true}
            />
        </div>
    );
};

// DirectPaymentForm is now a separate component


const TrustBadge = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex flex-col items-center text-center group/badge p-6 lg:p-10 bg-white/[0.02] border border-transparent hover:border-white/5 rounded-[3rem] transition-all hover:-translate-y-2 cursor-default">
        <div className="w-20 h-20 rounded-[2rem] bg-white/5 group-hover/badge:bg-primary/20 group-hover/badge:text-primary transition-colors flex items-center justify-center text-neutral-400 mb-8 shadow-inner">
            {icon}
        </div>
        <h4 className="text-sm font-black uppercase tracking-widest text-white mb-4">{title}</h4>
        <p className="text-sm text-neutral-500 leading-relaxed font-medium">{desc}</p>
    </div>
);

export default SubscriptionPage;
