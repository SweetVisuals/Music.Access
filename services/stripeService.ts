import { supabase } from './supabaseService';

export const stripeService = {
    createAccount: async (display_name: string, contact_email: string, user_id: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'create-account', display_name, contact_email, user_id }
        });
        if (error) throw error;
        return data;
    },

    onboardAccount: async (accountId: string, returnUrl: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'onboard-account', accountId, returnUrl }
        });
        if (error) throw error;
        return data;
    },

    getAccountStatus: async (accountId: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'account-status', accountId }
        });
        if (error) throw error;
        return data; // { readyToProcessPayments, onboardingComplete, details }
    },

    createProduct: async (accountId: string, product: { name: string, description?: string, priceInCents: number, currency: string }) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'create-product', accountId, ...product }
        });
        if (error) throw error;
        return data;
    },

    listProducts: async (accountId: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'list-products', accountId }
        });
        if (error) throw error;
        return data;
    },

    createCheckoutSession: async (params: { accountId: string, priceId: string, quantity?: number, applicationFee?: number, successUrl: string, cancelUrl: string }) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'create-checkout-session', ...params }
        });
        if (error) throw error;
        return data;
    },

    createSubscriptionSession: async (params: { customerAccountId: string, priceId: string, successUrl: string, cancelUrl: string }) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'create-subscription-session', ...params }
        });
        if (error) throw error;
        return data;
    },

    createPortalSession: async (accountId: string, returnUrl: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
            body: { action: 'create-portal-session', accountId, returnUrl }
        });
        if (error) throw error;
        return data;
    },

    createSetupIntent: async (userId: string) => {
        const { data, error } = await supabase.functions.invoke('stripe-actions', {
            body: { action: 'create-setup-intent', userId }
        });
        if (error) throw error;
        return data;
    }
};

// Types for Payment Methods
export interface SavedPaymentMethod {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
}

// Direct Payment Helper Functions
export const listPaymentMethods = async (userId: string): Promise<SavedPaymentMethod[]> => {
    const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'list-payment-methods', userId }
    });
    if (error) throw error;
    return data || [];
};

export const createDirectSubscription = async (
    userId: string,
    planName: string,
    billingCycle: string,
    paymentMethodId?: string
) => {
    const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
            action: 'create-subscription',
            userId,
            planName,
            billingCycle,
            paymentMethodId
        }
    });
    if (error) throw error;
    return data;
};

export const processMarketplacePayment = async (
    items: any[],
    total: number,
    type: string,
    purchaseId?: string,
    isDirect?: boolean,
    guestEmail?: string
) => {
    const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
            action: 'create-payment-intent',
            items,
            total,
            type,
            purchaseId,
            isDirect,
            guestEmail
        }
    });
    if (error) throw error;
    return data;
};
