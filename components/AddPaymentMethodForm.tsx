import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface AddPaymentMethodFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const AddPaymentMethodForm: React.FC<AddPaymentMethodFormProps> = ({ onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { showToast } = useToast();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard/wallet`,
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'An error occurred.');
            setIsLoading(false);
        } else {
            // Setup succeeded
            showToast("Payment method added successfully!", "success");
            setIsLoading(false);
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                        paymentMethodOrder: ['card', 'paypal'],
                    }}
                />
            </div>

            {errorMessage && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!stripe || isLoading}
                    className="flex-1 py-3 px-4 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Lock size={16} />
                            Save Method
                        </>
                    )}
                </button>
            </div>

            <p className="text-center text-[10px] text-neutral-500 flex items-center justify-center gap-1.5 opacity-70">
                <Lock size={10} />
                Encrypted & Secured by Stripe
            </p>
        </form>
    );
};

export default AddPaymentMethodForm;
