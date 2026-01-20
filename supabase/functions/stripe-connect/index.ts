import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
                try {
                    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
                } catch (err) {
                    // Try thin event parsing
                    const thinEvent = stripe.parseThinEvent(body, signature, webhookSecret);
                    event = await stripe.v2.core.events.retrieve(thinEvent.id);
                }
            } catch (err) {
                console.error("Webhook Error", err);
                return new Response(`Webhook Error: ${err.message}`, { status: 400 });
            }

            console.log("Received event:", event.type);

            switch (event.type) {
                case 'v2.core.account.requirements.updated':
                case 'v2.core.account.capability_status_updated':
                    console.log("Account status updated", event);
                    break;
                case 'customer.subscription.updated':
                    console.log("Subscription updated", event);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return new Response(JSON.stringify({ received: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Standard API calls - Expect JSON body with 'action'
        const { action, ...params } = await req.json();

        // 1. Create Connected Account (V2)
        if (action === 'create-account') {
            const { display_name, contact_email, user_id } = params;
            if (!display_name || !contact_email) throw new Error('Missing display_name or contact_email');

            const account = await stripe.v2.core.accounts.create({
                display_name: display_name,
                contact_email: contact_email,
                identity: { country: 'us' },
                dashboard: 'full',
                defaults: {
                    responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
                },
                configuration: {
                    customer: {},
                    merchant: { capabilities: { card_payments: { requested: true } } },
                },
            });

            return new Response(JSON.stringify({ accountId: account.id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Onboard Account
        if (action === 'onboard-account') {
            const { accountId, returnUrl } = params;
            if (!accountId) throw new Error('Missing accountId');

            const accountLink = await stripe.v2.core.accountLinks.create({
                account: accountId,
                use_case: {
                    type: 'account_onboarding',
                    account_onboarding: {
                        configurations: ['merchant', 'customer'],
                        refresh_url: returnUrl || 'https://example.com/error',
                        return_url: returnUrl || `https://example.com/success`,
                    },
                },
            });

            return new Response(JSON.stringify({ url: accountLink.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Get Account Status
        if (action === 'account-status') {
            const { accountId } = params;
            if (!accountId) throw new Error('Missing accountId');

            const account = await stripe.v2.core.accounts.retrieve(accountId, {
                include: ["configuration.merchant", "requirements"],
            });

            const readyToProcessPayments = account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";
            const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
            const onboardingComplete = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

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
                customer_account: customerAccountId,
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
            const session = await stripe.billingPortal.sessions.create({
                customer_account: accountId,
                return_url: returnUrl,
            });
            return new Response(JSON.stringify({ url: session.url }), {
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
