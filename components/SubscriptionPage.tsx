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
        <div className="w-full max-w-7xl mx-auto px-4 pt-0 pb-8 lg:px-6 lg:pt-0 lg:pb-[15px] animate-in fade-in duration-700 relative lg:[zoom:1.08] origin-top">
            {/* Header */}
            <div className="text-center pt-0 mb-6 lg:mb-8">
                <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4 uppercase">
                    Elevate Your <span className="text-primary">Sound</span>
                </h1>
                <p className="text-neutral-500 text-sm lg:text-lg max-w-2xl lg:max-w-none mx-auto font-medium">
                    Choose the plan that fits your workflow. From recording sketches to managing a professional studio.
                </p>

                {/* Billing Toggle */}
                <div className="mt-4 pb-[5px] flex items-center justify-center gap-4">
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
                            relative flex flex-col p-5 lg:p-6 rounded-3xl border transition-all duration-500 hover:scale-[1.02]
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

                        <div className="mb-4 lg:mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${plan.color === 'primary' ? 'bg-primary/10' : plan.color === 'premium' ? 'bg-amber-400/10' : 'bg-white/5'
                                }`}>
                                {plan.icon}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                            <p className="text-neutral-500 text-sm leading-relaxed">{plan.description}</p>
                        </div>

                        <div className="mb-4 lg:mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white font-mono">${plan.price}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 mb-6">
                            {plan.features.map((feature, idx) => {
                                const isCredits = feature.toLowerCase().includes('promotion credits') || feature.toLowerCase().includes('credits');
                                const isGems = feature.toLowerCase().includes('gem');

                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        {isCredits ? (
                                            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 border border-yellow-600/20">
                                                <Star size={10} className="text-neutral-900 fill-neutral-900" />
                                            </div>
                                        ) : isGems ? (
                                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                                <Gem size={16} className="text-primary" />
                                            </div>
                                        ) : (
                                            <div className={`p-0.5 rounded-full ${plan.color === 'primary' ? 'text-primary' : plan.color === 'premium' ? 'text-amber-400' : 'text-neutral-500'}`}>
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        )}
                                        <span className="text-sm text-neutral-300">{feature}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleUpgradeClick(plan.name)}
                                disabled={userProfile?.plan === plan.name}
                                className={`
                                    w-full py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all
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
                                    : (userProfile?.plan === plan.name)
                                        ? 'Current Plan'
                                        : plan.cta}
                            </button>

                            {userProfile?.plan === plan.name && (
                                <div className="mt-2 text-center space-y-2">
                                    <p className="text-[10px] text-neutral-400 font-mono">
                                        {userProfile.current_period_end ? (
                                            userProfile.cancel_at_period_end
                                                ? `Access until ${new Date(userProfile.current_period_end).toLocaleDateString()}`
                                                : `Renews on ${new Date(userProfile.current_period_end).toLocaleDateString()}`
                                        ) : (
                                            userProfile.cancel_at_period_end ? 'Cancellation Pending' : 'Subscription Active'
                                        )}
                                    </p>

                                    {!userProfile.cancel_at_period_end && (
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            disabled={cancelling}
                                            className="w-full py-2 text-[10px] uppercase font-bold tracking-widest text-neutral-500 hover:text-red-500 transition-colors"
                                        >
                                            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                                        </button>
                                    )}
                                    {userProfile.cancel_at_period_end && (
                                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                                            Cancellation Pending
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl bg-[#0a0a0a] border-0 sm:border border-neutral-800 rounded-none sm:rounded-3xl overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-[#0a0a0a] p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Upgrade to <span className={targetPlan.color === 'primary' ? 'text-primary' : 'text-amber-400'}>{targetPlan.name}</span>
                            </h3>
                            <button onClick={() => setSelectedPlan(null)} className="p-2 text-neutral-500 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0">
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
                title="Cancel Subscription"
                message={`Are you sure you want to cancel? You will keep access until ${new Date(userProfile?.current_period_end || Date.now()).toLocaleDateString()}. Your data will be preserved, but you'll lose access to premium features after this date.`}
                confirmLabel="Yes, Cancel Plan"
                cancelLabel="Keep Plan"
                isDestructive={true}
            />
        </div>
    );
};

// DirectPaymentForm is now a separate component


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
