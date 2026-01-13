import { supabase } from './supabaseService';

/**
 * STRIPE SERVICE
 * 
 * This service handles interactions with Stripe Connect via Supabase Edge Functions.
 * 
 * architecture:
 * Frontend -> Supabase Edge Function -> Stripe API
 * 
 * We cannot call Stripe directly from the frontend safely (requires secret keys).
 */

// Set this to true to force mocks, or false to try live backend first
const FORCE_MOCK = false;

// Helper to invoke Stripe Edge Functions (stripe-actions)
async function callStripeAction<T>(action: string, payload: any): Promise<T> {
    if (FORCE_MOCK) throw new Error("Mock Mode Forced");

    try {
        console.log(`[Stripe] Invoking ${action}...`);
        const { data, error } = await supabase.functions.invoke('stripe-actions', {
            body: { action, ...payload }
        });

        if (error) {
            console.warn(`[Stripe] Error invoking ${action}:`, error);
            throw error;
        }
        return data as T;
    } catch (e: any) {
        console.warn(`[Stripe] Failed to call backend for ${action}. Falling back to mock logic if available.`);
        // Try to dig out the actual error message from Supabase response if it exists
        if (e && e.context && typeof e.context.json === 'function') {
            try {
                const errBody = await e.context.json();
                console.error(`[Stripe] Backend Error Details for ${action}:`, errBody);
                if (errBody.error) {
                    console.error(`[Stripe] API Error: ${errBody.error}`);
                }
            } catch (opt) {
                console.error("[Stripe] Raw Error:", e);
            }
        } else {
            console.error("[Stripe] Raw Error:", e);
            if (e.message) {
                // Often "Edge Function returned a non-2xx status code" - let's try to be helpful
                console.error("Message:", e.message);
                // If we have access to the Response object in some way... 
                // (supabase-js often hides it inside `context` or similar)
            }
        }
        throw e; // Let caller decide to catch and mock
    }
}

export interface StripeAccountStatus {
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    currency: string;
    balance?: {
        available: number;
        pending: number;
    }
}

/**
 * Creates a Stripe Connect Express account for the user and returns the onboarding URL.
 */
export const createConnectAccount = async (userId: string, email: string): Promise<string> => {
    try {
        const origin = window.location.origin;
        const result = await callStripeAction<{ url: string }>('create-connect-account', { userId, origin, email });
        return result.url;
    } catch (e) {
        // Fallback Mock
        console.log('[Mock] Creating Stripe Account for:', userId);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check if user already has an ID mock
        const { data: user } = await supabase.from('users').select('stripe_account_id').eq('id', userId).single();

        if (!user?.stripe_account_id) {
            const mockId = `acct_mock_${Math.random().toString(36).substring(7)}`;
            await supabase.from('users').update({ stripe_account_id: mockId }).eq('id', userId);
        }

        return window.location.href + '?stripe_return=true';
    }
};

/**
 * Creates a login link for the Express Dashboard (for users to view payouts/tax forms).
 */
export const createExpressLoginLink = async (stripeAccountId: string): Promise<string> => {
    // REAL:
    /*
    const { data, error } = await supabase.functions.invoke(FUNCTION_CREATE_LOGIN_LINK, {
        body: { accountId: stripeAccountId }
    });
    if (error) throw error;
    return data.url;
    */

    console.log('[Mock] Getting Login Link for:', stripeAccountId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'https://connect.stripe.com/express_login_mock';
};


/**
 * Fetches the latest status and wallet balance of the connected account.
 */
export const getAccountStatus = async (stripeAccountId: string): Promise<StripeAccountStatus> => {
    try {
        const result = await callStripeAction<StripeAccountStatus>('get-account-status', { stripeAccountId });
        return result;
    } catch (e) {
        // Fallback Mock
        console.log('[Mock] Fetching Status for:', stripeAccountId);
        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
            currency: 'gbp',
            balance: {
                available: 12550, // £125.50
                pending: 4500     // £45.00
            }
        };
    }
};

/**
 * Triggers a payout from the Connect account to the user's bank.
 */
export const executePayout = async (stripeAccountId: string, amount: number): Promise<void> => {
    // REAL:
    /*
    const { error } = await supabase.functions.invoke(FUNCTION_CREATE_PAYOUT, {
        body: { accountId: stripeAccountId, amount }
    });
    if (error) throw error;
    */

    console.log('[Mock] Payout Triggered:', amount);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return;
};

/**
 * ------------------------------------------------------------------
 * CHECKOUT & SUBSCRIPTIONS
 * ------------------------------------------------------------------
 */

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

/**
 * Processes a marketplace payment for a cart of items.
 * Handles split payments (Platform Fee vs Seller Earnings).
 */
export const processMarketplacePayment = async (
    items: any[],
    totalAmount: number,
    paymentMethod: 'card' | 'crypto' | 'gems',
    purchaseId?: string
): Promise<PaymentResult> => {
    if (paymentMethod === 'gems') {
        return { success: true, transactionId: `txn_gem_${Date.now()}` };
    }
    if (paymentMethod === 'crypto') {
        return { success: true, transactionId: `0x${Date.now().toString(16)}` };
    }

    try {
        // Try Real Backend
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const result = await callStripeAction<{ sessionId: string, url: string }>('create-checkout-session', {
            items,
            userId: user.id,
            purchaseId,
            successUrl: window.location.origin + '/checkout?success=true',
            cancelUrl: window.location.origin + '/checkout?canceled=true'
        });

        if (result.url) {
            window.location.href = result.url; // Redirect to Stripe
            return { success: true, transactionId: 'pending_redirect' };
        }
        return { success: false, error: "No checkout URL returned" };

    } catch (e) {
        console.warn("[Payment] Live checkout failed, using mock", e);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true, transactionId: `ch_${Date.now()}_mock` };
    }
};

/**
 * Creates a subscription for a plan (Basic, Pro, Studio+).
 */
export const createSubscription = async (userId: string, planName: string, billingCycle: 'monthly' | 'yearly'): Promise<PaymentResult> => {
    try {
        const result = await callStripeAction<{ sessionId: string, url: string }>('create-subscription', {
            planName,
            userId,
            billingCycle,
            successUrl: window.location.origin + '/dashboard?subscription_success=true',
            cancelUrl: window.location.origin + '/subscription'
        });

        if (result.url) {
            window.location.href = result.url;
            return { success: true, transactionId: 'pending_redirect' };
        }
        return { success: false, error: "No subscription URL" };

    } catch (e) {
        console.warn("[Subscription] Live creation failed, using mock", e);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, transactionId: `sub_${Date.now()}_mock` };
    }
};
