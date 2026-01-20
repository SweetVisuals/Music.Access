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
    }
};
