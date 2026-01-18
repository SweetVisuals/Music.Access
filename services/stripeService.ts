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

// Set to false for production
const FORCE_MOCK = false;

// Helper to invoke Stripe Edge Functions (stripe-actions)
async function callStripeAction<T>(action: string, payload: any): Promise<T> {
    try {
        console.log(`[Stripe] Invoking ${action}...`);
        const { data, error } = await supabase.functions.invoke('stripe-actions', {
            body: { action, ...payload }
        });

        if (error) {
            console.error(`[Stripe] Backend Error for ${action}:`, error);
            // If it's a FunctionsHttpError, the message might be in the error object itself
            // but Supabase JS usually puts the response body in the error if it can.
            throw error;
        }
        return data as T;
    } catch (e: any) {
        console.error(`[Stripe] Request failed for ${action}. Details:`, {
            message: e.message,
            name: e.name,
            status: e.status,
            context: e.context
        });
        throw e;
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
 * ------------------------------------------------------------------
 * IN-HOUSE PAYMENTS (CUSTOMERS & PAYMENT METHODS)
 * ------------------------------------------------------------------
 */

export interface SavedPaymentMethod {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
}

/**
 * Fetches saved cards for the user.
 */
export const listPaymentMethods = async (userId: string): Promise<SavedPaymentMethod[]> => {
    const result = await callStripeAction<{ paymentMethods: SavedPaymentMethod[] }>('list-payment-methods', { userId });
    return result.paymentMethods;
};

/**
 * Gets a client secret for adding a new card securely.
 */
export const createSetupIntent = async (userId: string): Promise<string> => {
    const result = await callStripeAction<{ clientSecret: string }>('create-setup-intent', { userId });
    return result.clientSecret;
};

/**
 * Processes a subscription directly using a payment method ID.
 */
export const createDirectSubscription = async (
    userId: string,
    planName: string,
    billingCycle: 'monthly' | 'yearly',
    paymentMethodId?: string
): Promise<{ subscriptionId: string, clientSecret?: string, status: string }> => {
    return await callStripeAction<{ subscriptionId: string, clientSecret?: string, status: string }>('create-direct-subscription', {
        userId,
        planName,
        billingCycle,
        paymentMethodId
    });
};

/**
 * Creates a Stripe Connect Express account for the user and returns the onboarding URL.
 */
export const createConnectAccount = async (userId: string, email: string): Promise<string> => {
    const origin = window.location.origin;
    const result = await callStripeAction<{ url: string }>('create-connect-account', { userId, origin, email });
    return result.url;
};

/**
 * Creates a login link for the Express Dashboard (for users to view payouts/tax forms).
 */
export const createExpressLoginLink = async (stripeAccountId: string): Promise<string> => {
    const result = await callStripeAction<{ url: string }>('create-login-link', { accountId: stripeAccountId });
    return result.url;
};


/**
 * Fetches the latest status and wallet balance of the connected account.
 */
export const getAccountStatus = async (stripeAccountId: string): Promise<StripeAccountStatus> => {
    const result = await callStripeAction<StripeAccountStatus>('get-account-status', { stripeAccountId });
    return result;
};

/**
 * Triggers a payout from the Connect account to the user's bank.
 */
export const executePayout = async (stripeAccountId: string, amount: number): Promise<void> => {
    await callStripeAction<void>('execute-payout', { stripeAccountId, amount });
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
 * Handles both redirect (Checkout) and in-house (PaymentElement).
 */
export const processMarketplacePayment = async (
    items: any[],
    totalAmount: number,
    paymentMethod: 'card' | 'crypto' | 'gems',
    purchaseId?: string,
    useDirectFlow: boolean = false
): Promise<PaymentResult & { clientSecret?: string }> => {
    if (paymentMethod === 'gems') {
        return { success: true, transactionId: `txn_gem_${Date.now()}` };
    }
    if (paymentMethod === 'crypto') {
        // Crypto remains a manual placeholder until integrated
        return { success: true, transactionId: `0x${Date.now().toString(16)}` };
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (useDirectFlow) {
        const result = await callStripeAction<{ clientSecret: string }>('create-marketplace-payment-intent', {
            items,
            userId: user?.id || 'guest',
            email: user?.email || (items as any).guestEmail,
            purchaseId
        });
        return { success: true, clientSecret: result.clientSecret };
    }

    // Legacy Redirect Flow
    const result = await callStripeAction<{ sessionId: string, url: string }>('create-checkout-session', {
        items,
        userId: user?.id,
        purchaseId,
        successUrl: window.location.origin + '/checkout?success=true',
        cancelUrl: window.location.origin + '/checkout?canceled=true'
    });

    if (result.url) {
        window.location.href = result.url;
        return { success: true, transactionId: 'pending_redirect' };
    }

    throw new Error("No checkout URL returned from Stripe");
};

/**
 * Creates a subscription for a plan (Basic, Pro, Studio+).
 */
export const createSubscription = async (userId: string, planName: string, billingCycle: 'monthly' | 'yearly'): Promise<PaymentResult> => {
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

    throw new Error("No subscription URL returned from Stripe");
};

/**
 * Cancels a subscription at the end of the current period.
 */
export const cancelSubscription = async (userId: string, subscriptionId: string): Promise<PaymentResult> => {
    const result = await callStripeAction<PaymentResult>('cancel-subscription', {
        userId,
        subscriptionId
    });
    return result;
};
/**
 * Processes a test payment that bypasses Stripe.
 * For use in development/testing only.
 */
export const processTestPayment = async (
    type: 'subscription' | 'marketplace',
    payload: {
        userId: string | null;
        planName?: string;
        billingCycle?: 'monthly' | 'yearly';
        purchaseId?: string;
        guestEmail?: string;
    }
): Promise<PaymentResult> => {
    // Client-side simulation only - no Edge Function call
    console.log('[StripeService] Processing test payment client-side...', { type, payload });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        success: true,
        transactionId: `test_txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };
};
