import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, ExpressCheckoutElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { listPaymentMethods, SavedPaymentMethod, createDirectSubscription, processMarketplacePayment } from '../services/stripeService';
import { CreditCard, Plus, Check, Loader2, ArrowRight, Lock, AlertCircle } from 'lucide-react';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
// Check if key is present and looks valid (starts with pk_)
const isKeyValid = STRIPE_KEY && STRIPE_KEY.startsWith('pk_');

const stripePromise = isKeyValid ? loadStripe(STRIPE_KEY) : null;
console.log(`[DirectPaymentForm] Key status: Present=${!!STRIPE_KEY}, ValidPrefix=${isKeyValid}, Value=${STRIPE_KEY ? STRIPE_KEY.substring(0, 8) + '...' : 'undefined'}`);

interface DirectPaymentFormProps {
    userId: string | null;
    guestEmail?: string;
    mode: 'subscription' | 'payment';
    planName?: string;
    billingCycle?: 'monthly' | 'yearly';
    items?: any[];
    purchaseId?: string;
    total: number;
    onSuccess: (txnId?: string) => void;
}

// Sub-component that actually uses the hooks
const DirectPaymentContent: React.FC<DirectPaymentFormProps> = ({
    userId,
    guestEmail,
    mode,
    planName,
    billingCycle,
    items = [],
    purchaseId,
    total,
    onSuccess
}) => {
    const stripe = useStripe();
    const elements = useElements();

    const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string | 'new' | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadMethods = async () => {
            if (!userId) {
                setSelectedMethodId('new');
                setLoading(false);
                return;
            }
            try {
                const methods = await listPaymentMethods(userId);
                setSavedMethods(methods);
                if (methods.length > 0) {
                    setSelectedMethodId(methods[0].id);
                } else {
                    setSelectedMethodId('new');
                }
            } catch (err) {
                console.error("Failed to load methods", err);
                setSelectedMethodId('new');
            } finally {
                setLoading(false);
            }
        };
        loadMethods();
    }, [userId]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!stripe || !elements || !selectedMethodId) return;

        setProcessing(true);
        setError(null);

        try {
            // Very important for modern PaymentElement:
            // We must trigger validation and let Stripe handle the rest if it's a new card
            if (selectedMethodId === 'new') {
                const { error: submitError } = await elements.submit();
                if (submitError) throw submitError;
            }

            let clientSecret: string | undefined;

            if (mode === 'subscription') {
                if (!planName || !billingCycle) throw new Error("Missing subscription details");
                const result = await createDirectSubscription(
                    userId || 'guest',
                    planName,
                    billingCycle,
                    selectedMethodId === 'new' ? undefined : selectedMethodId
                );
                clientSecret = result.clientSecret;
            } else {
                // For marketplace payment, we pass guestEmail if userId is null
                const itemsWithEmail = guestEmail ? { ...items, guestEmail } : items;
                const result = await processMarketplacePayment(itemsWithEmail as any, total, 'card', purchaseId, true);
                clientSecret = result.clientSecret;
            }

            if (clientSecret) {
                const { error: stripeError } = await stripe.confirmPayment({
                    elements,
                    clientSecret,
                    confirmParams: {
                        payment_method: selectedMethodId === 'new' ? undefined : selectedMethodId,
                        return_url: window.location.origin + (mode === 'subscription' ? '/dashboard?subscription_success=true' : '/checkout?success=true'),
                    },
                    redirect: 'if_required',
                });

                if (stripeError) throw stripeError;
                onSuccess();
            } else {
                onSuccess();
            }
        } catch (err: any) {
            console.error(`${mode} error:`, err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setProcessing(false);
        }
    };

    const handleExpressPayment = async (event: any) => {
        setSelectedMethodId('new');
        // The confirm() call is handled by the Element usually
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-neutral-500 font-medium text-sm">Preparing secure checkout...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-8 bg-[#0a0a0a]">
            {/* Express Checkout (Apple/Google Pay) */}
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Express Checkout</p>
                    <div className="flex gap-2">
                        <div className="h-4 w-6 bg-neutral-900 rounded border border-white/5 opacity-50 flex items-center justify-center"><span className="text-[8px] font-black">GPay</span></div>
                        <div className="h-4 w-6 bg-neutral-900 rounded border border-white/5 opacity-50 flex items-center justify-center"><span className="text-[10px]"></span></div>
                    </div>
                </div>
                <ExpressCheckoutElement onConfirm={handleExpressPayment} options={{
                    buttonType: {
                        applePay: 'buy',
                        googlePay: 'buy'
                    },
                    buttonHeight: 48
                }} />
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[10px] font-black text-neutral-600 uppercase">Legacy Payment Methods</span></div>
                </div>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center p-4 bg-neutral-900/50 rounded-2xl border border-white/5">
                <div>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">
                        {mode === 'subscription' ? 'Subscription' : 'Order Summary'}
                    </p>
                    <p className="text-white font-bold">
                        {mode === 'subscription' ? `${planName} (${billingCycle})` : `${items.length} Items`}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">Total Due</p>
                    <p className="text-xl font-black text-white font-mono">${total.toFixed(2)}</p>
                </div>
            </div>

            {/* Saved Methods */}
            {savedMethods.length > 0 && (
                <div className="space-y-4">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Saved Payment Methods</p>
                    <div className="grid grid-cols-1 gap-2">
                        {savedMethods.map((pm) => (
                            <button
                                key={pm.id}
                                type="button"
                                onClick={() => setSelectedMethodId(pm.id)}
                                className={`
                                    flex items-center justify-between p-4 rounded-xl border transition-all
                                    ${selectedMethodId === pm.id
                                        ? 'bg-primary/10 border-primary text-white'
                                        : 'bg-neutral-900 border-white/5 text-neutral-400 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard size={18} className={selectedMethodId === pm.id ? 'text-primary' : 'text-neutral-500'} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold capitalize">{pm.brand} •••• {pm.last4}</p>
                                        <p className="text-[10px] opacity-60">Expires {pm.exp_month}/{pm.exp_year}</p>
                                    </div>
                                </div>
                                {selectedMethodId === pm.id && <Check size={16} className="text-primary" />}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSelectedMethodId('new')}
                            className={`
                                flex items-center gap-3 p-4 rounded-xl border transition-all
                                ${selectedMethodId === 'new'
                                    ? 'bg-primary/10 border-primary text-white'
                                    : 'bg-neutral-900 border-white/5 text-neutral-400 hover:border-white/10'
                                }
                            `}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMethodId === 'new' ? 'bg-primary text-black' : 'bg-neutral-800'}`}>
                                <Plus size={12} strokeWidth={3} />
                            </div>
                            <span className="text-sm font-bold">Use a different card</span>
                        </button>
                    </div>
                </div>
            )}

            {/* New Card Section */}
            {(selectedMethodId === 'new' || savedMethods.length === 0) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Payment Method</p>
                    <div className="p-4 bg-neutral-900 rounded-xl border border-white/5">
                        <PaymentElement options={{
                            layout: 'tabs',
                        }} />
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in shake duration-300">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-500 leading-relaxed font-medium">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                <button
                    disabled={!stripe || processing || !selectedMethodId}
                    type="submit"
                    className="w-full py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(var(--primary),0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <span>{mode === 'subscription' ? 'Authorize & Subscribe' : `Pay $${total.toFixed(2)} Now`}</span>
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-600 font-bold uppercase tracking-tighter">
                    <Lock size={10} />
                    <span>SSL Encrypted • PCI DSS Compliant</span>
                </div>
            </div>
        </form>
    );
};

// Main Exported Component (Wrapper)
export const DirectPaymentForm: React.FC<DirectPaymentFormProps> = (props) => {
    const options = {
        mode: props.mode === 'subscription' ? 'subscription' as const : 'payment' as const,
        amount: Math.round(props.total * 100),
        currency: 'usd',
        appearance: {
            theme: 'night' as const,
            variables: {
                colorPrimary: '#00ffa3', // primary color
                colorBackground: '#171717',
                colorText: '#ffffff',
                borderRadius: '12px',
            },
        },
    };

    if (!stripePromise) {
        return (
            <div className="p-8 text-center border border-red-500/20 bg-red-500/10 rounded-xl animate-in fade-in duration-300">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">Stripe Configuration Error</h3>
                <p className="text-sm text-neutral-400 mb-4 px-4">
                    The Stripe Publishable Key is missing or invalid. Payments are currently disabled.
                </p>
                <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-neutral-500 text-left overflow-x-auto">
                    MISSING: VITE_STRIPE_PUBLISHABLE_KEY
                </div>
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise} options={options}>
            <DirectPaymentContent {...props} />
        </Elements>
    );
};
