import React, { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Replace with your real publishable key
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isKeyValid = STRIPE_KEY && STRIPE_KEY.startsWith('pk_');

const stripePromise = isKeyValid ? loadStripe(STRIPE_KEY) : null;

interface StripeWrapperProps {
    children: ReactNode;
}

export const StripeWrapper: React.FC<StripeWrapperProps> = ({ children }) => {
    if (!stripePromise) {
        // If no key, just render children without Stripe context to prevent crash
        // DirectPaymentForm has its own local error handling if user tries to pay
        return <>{children}</>;
    }

    return (
        <Elements stripe={stripePromise}>
            {children}
        </Elements>
    );
};
