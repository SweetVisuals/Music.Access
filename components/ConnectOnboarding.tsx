import React, { useState, useEffect } from 'react';
import { stripeService } from '../services/stripeService';
import { UserProfile } from '../types';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface ConnectOnboardingProps {
    userProfile: UserProfile;
    onStatusChange?: () => void;
}

const ConnectOnboarding: React.FC<ConnectOnboardingProps> = ({ userProfile, onStatusChange }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<{
        ready: boolean;
        onboardingComplete: boolean;
        details?: any;
    } | null>(null);

    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    useEffect(() => {
        if (userProfile.stripe_account_id) {
            checkStatus(userProfile.stripe_account_id);
        }
    }, [userProfile.stripe_account_id]);

    const checkStatus = async (accountId: string) => {
        setIsCheckingStatus(true);
        try {
            const data = await stripeService.getAccountStatus(accountId);
            setStatus({
                ready: data.readyToProcessPayments,
                onboardingComplete: data.onboardingComplete,
                details: data.details
            });
            if (onStatusChange) onStatusChange();
        } catch (err) {
            console.error(err);
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const handleOnboard = async () => {
        setLoading(true);
        setError(null);
        try {
            let accountId = userProfile.stripe_account_id;

            // 1. Create Account if doesn't exist
            if (!accountId) {
                const res = await stripeService.createAccount(
                    userProfile.username || 'Music User',
                    userProfile.email || 'user@example.com',
                    userProfile.id!
                );
                accountId = res.accountId;

                // Save to Supabase DB (Client-side update for immediate UI, assume DB handles it or webhook does)
                // For this demo, we assume the backend syncs or we locally update. 
                // We really should update the user profile in DB here.
                await supabase.from('users').update({ stripe_account_id: accountId }).eq('id', userProfile.id);
            }

            // 2. Create Onboarding Link
            const returnUrl = window.location.href; // Return to current page
            const { url } = await stripeService.onboardAccount(accountId!, returnUrl);

            // 3. Redirect
            window.location.href = url;

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start onboarding");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingStatus && !status) {
        return <div className="p-4 text-center text-neutral-400">Loading status...</div>;
    }

    const isReady = status?.ready;

    return (
        <div className="bg-[#111] border border-neutral-800 rounded-xl p-6 max-w-2xl">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Payout Settings</h2>
                    <p className="text-neutral-400 text-sm">
                        Connect with Stripe to receive payments directly to your bank account.
                    </p>
                </div>
                {isReady ? (
                    <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-xs font-bold border border-green-400/20">
                        <CheckCircle2 size={14} /> Active
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/20">
                        <AlertCircle size={14} /> Setup Required
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {!isReady ? (
                    <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                        <h3 className="text-white font-bold mb-2">Complete your setup</h3>
                        <p className="text-neutral-400 text-sm mb-4">
                            You need to provide some information to Stripe before you can start accepting payments.
                        </p>
                        <button
                            onClick={handleOnboard}
                            disabled={loading}
                            className="bg-primary text-black font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                            {userProfile.stripe_account_id ? 'Continue Onboarding' : 'Onboard to collect payments'}
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-bold text-sm">Stripe Account</h3>
                                <p className="text-neutral-500 text-xs font-mono mt-1">{userProfile.stripe_account_id}</p>
                            </div>
                            <a
                                href="https://dashboard.stripe.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-400 hover:text-white text-xs flex items-center gap-1"
                            >
                                View Dashboard <ExternalLink size={12} />
                            </a>
                        </div>

                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-blue-400 text-sm">
                            Your account is active and ready to process charges.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConnectOnboarding;
