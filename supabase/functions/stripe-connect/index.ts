import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    // This is needed to use the Fetch API rather than Node's http client
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2023-10-16',
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 0. Handle Webhooks (Priority check via Header)
        const signature = req.headers.get('Stripe-Signature');
        if (signature) {
            const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
            if (!webhookSecret) {
                console.error("Missing STRIPE_WEBHOOK_SECRET");
                return new Response("Config Error", { status: 500 });
            }

            const body = await req.text();
            let event;

            try {
                event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
            } catch (err) {
                console.error("Webhook Error", err);
                return new Response(`Webhook Error: ${err.message}`, { status: 400 });
            }

            console.log("Received event:", event.type);

            // Handle Standard Connect Webhooks
            switch (event.type) {
                case 'account.updated':
                    console.log("Account updated", event.data.object);
                    break;
                case 'capability.updated':
                    console.log("Capability updated", event.data.object);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return new Response(JSON.stringify({ received: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Standard API calls - Expect JSON body with 'action'
        let action, params;
        try {
            const body = await req.json();
            action = body.action;
            params = body; // params includes action but we destructure later
            console.log(`[Stripe Connect] Request received. Action: ${action}`);
        } catch (e) {
            console.error("[Stripe Connect] Failed to parse JSON body", e);
            throw new Error("Invalid JSON body");
        }

        const { ...paramData } = params; // redeclare to avoid conflict if I used let above differently, but actually let's just stick to the flow.

        // Debug Env
        if (!Deno.env.get('STRIPE_SECRET_KEY')) {
            console.error("[Stripe Connect] CRITICAL: STRIPE_SECRET_KEY is not set!");
        }

        // 1. Create Connected Account (Standard Express V1)
        if (action === 'create-account') {
            console.log("[Stripe Connect] Creating account with params:", JSON.stringify(params));
            const { display_name, contact_email, user_id } = params;

            if (!contact_email) throw new Error('Missing contact_email');

            try {
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'US',
                    email: contact_email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    metadata: {
                        user_id: user_id,
                        display_name: display_name,
                    },
                });
                console.log("[Stripe Connect] Account created:", account.id);
                return new Response(JSON.stringify({ accountId: account.id }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (stripeError) {
                console.error("[Stripe Connect] Stripe API Error (create-account):", stripeError);
                throw stripeError;
            }
        }

        // 2. Onboard Account (Account Link V1)
        if (action === 'onboard-account') {
            const { accountId, returnUrl } = params;
            if (!accountId) throw new Error('Missing accountId');

            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: returnUrl || 'https://example.com/error',
                return_url: returnUrl || `https://example.com/success`,
                type: 'account_onboarding',
            });

            return new Response(JSON.stringify({ url: accountLink.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Get Account Status (V1)
        if (action === 'account-status') {
            const { accountId } = params;
            if (!accountId) throw new Error('Missing accountId');

            const account = await stripe.accounts.retrieve(accountId);

            const readyToProcessPayments =
                account.payouts_enabled &&
                account.details_submitted;

            // For Express accounts, 'details_submitted' is a good proxy for onboarding complete
            const onboardingComplete = account.details_submitted;

            return new Response(JSON.stringify({
                readyToProcessPayments,
                onboardingComplete,
                details: account
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 4. Create Product
        if (action === 'create-product') {
            const { accountId, name, description, priceInCents, currency } = params;
            if (!accountId) throw new Error('Missing accountId');

            const product = await stripe.products.create({
                name: name,
                description: description,
                default_price_data: {
                    unit_amount: priceInCents,
                    currency: currency || 'usd',
                },
            }, { stripeAccount: accountId });

            return new Response(JSON.stringify(product), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 5. List Products
        if (action === 'list-products') {
            const { accountId } = params;
            if (!accountId) throw new Error('Missing accountId');

            const products = await stripe.products.list({
                limit: 20,
                active: true,
                expand: ['data.default_price'],
            }, { stripeAccount: accountId });

            return new Response(JSON.stringify(products), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 6. Checkout (Direct)
        if (action === 'create-checkout-session') {
            const { accountId, priceId, quantity, applicationFee, successUrl, cancelUrl } = params;
            if (!accountId || !priceId) throw new Error('Missing required params');

            const session = await stripe.checkout.sessions.create({
                line_items: [{ price: priceId, quantity: quantity || 1 }],
                payment_intent_data: { application_fee_amount: applicationFee || 100 },
                mode: 'payment',
                success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: cancelUrl,
            }, { stripeAccount: accountId });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 7. Subscription Checkout
        if (action === 'create-subscription-session') {
            const { customerAccountId, priceId, successUrl, cancelUrl } = params;
            if (!priceId) throw new Error('Missing Price ID');

            const session = await stripe.checkout.sessions.create({
                customer: customerAccountId, // If the customer is on the PLATFORM account but subscribing to a service? 
                // Wait, typically for platform subscriptions, we might not need 'customer_account' unless using specific Connect flows.
                // Assuming standard Direct Charge or Destination Charge.
                // If this is a subscription FOR the platform (like Spotify Premium), no stripeAccount header needed.
                // If this is a subscription TO a connected account, we need more context.
                // Keeping it vague as per original code, but 'customer_account' might be 'customer' if passed as ID.
                mode: 'subscription',
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: cancelUrl,
            });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 8. Billing Portal
        if (action === 'create-portal-session') {
            const { accountId, returnUrl } = params;
            // This assumes the customer is on the platform account.
            const session = await stripe.billingPortal.sessions.create({
                customer: accountId, // This param name 'accountId' suggests it might be a stripe Customer ID (`cus_...`) not a Connect Account ID (`acct_...`)
                return_url: returnUrl,
            });
            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }


        // 9. Get Balance
        if (action === 'get-balance') {
            const { accountId } = params;
            if (!accountId) throw new Error('Missing accountId');

            const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
            return new Response(JSON.stringify(balance), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 10. Payout
        if (action === 'payout') {
            const { accountId, amount } = params;
            if (!accountId || !amount) throw new Error('Missing params');

            const payout = await stripe.payouts.create({
                amount: amount,
                currency: 'usd',
            }, { stripeAccount: accountId });

            return new Response(JSON.stringify(payout), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

