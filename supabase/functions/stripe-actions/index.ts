
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, ...data } = await req.json()

        let result;

        switch (action) {
            case 'get-or-create-customer': {
                const { userId, email } = data;
                const { customerId } = await getOrCreateCustomer(userId, email);
                result = { customerId };
                break;
            }

            case 'list-payment-methods': {
                const { userId } = data;
                console.log(`[list-payment-methods] Fetching for userId: ${userId}`);
                try {
                    const { customerId } = await getOrCreateCustomer(userId);

                    const paymentMethods = await stripe.paymentMethods.list({
                        customer: customerId,
                        type: 'card',
                    });

                    result = {
                        paymentMethods: paymentMethods.data.map(pm => ({
                            id: pm.id,
                            brand: pm.card?.brand,
                            last4: pm.card?.last4,
                            exp_month: pm.card?.exp_month,
                            exp_year: pm.card?.exp_year,
                        }))
                    };
                } catch (e: any) {
                    console.error(`[list-payment-methods] Error:`, e.message);
                    throw e;
                }
                break;
            }

            case 'create-setup-intent': {
                const { userId } = data;
                const { customerId } = await getOrCreateCustomer(userId);

                const setupIntent = await stripe.setupIntents.create({
                    customer: customerId,
                    payment_method_types: ['card', 'paypal'],
                    usage: 'off_session',
                });

                result = { clientSecret: setupIntent.client_secret };
                break;
            }

            case 'create-direct-subscription': {
                const { planName, userId, billingCycle, paymentMethodId } = data;
                const { customerId } = await getOrCreateCustomer(userId);

                // 1. Attach payment method if provided (saved card)
                if (paymentMethodId) {
                    try {
                        await stripe.paymentMethods.attach(paymentMethodId, {
                            customer: customerId,
                        });
                        // Set as default
                        await stripe.customers.update(customerId, {
                            invoice_settings: {
                                default_payment_method: paymentMethodId,
                            },
                        });
                    } catch (e) {
                        // Might already be attached
                        console.log("PM attach skip/fail:", e.message);
                    }
                }

                // 3. Map Plan to Price ID
                const priceMap: Record<string, string> = {
                    'Basic_monthly': 'price_1Sp5lmBSQA5JBjNFZlcFaKxs',
                    'Basic_yearly': 'price_1Sp5lmBSQA5JBjNF1r3KqUAl',
                    'Pro_monthly': 'price_1Sp5muBSQA5JBjNF17k7RyQH',
                    'Pro_yearly': 'price_1Sp5nKBSQA5JBjNF3DOGMv1i',
                    'Studio+_monthly': 'price_1Sp5ntBSQA5JBjNFNU2Xx5OE',
                    'Studio+_yearly': 'price_1Sp5otBSQA5JBjNFOF4VmwfL'
                };

                const priceId = priceMap[`${planName}_${billingCycle}`];
                if (!priceId) throw new Error(`Invalid plan: ${planName}_${billingCycle}`);

                // 4. Create Subscription
                const subscription = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: priceId }],
                    payment_behavior: 'default_incomplete',
                    payment_settings: {
                        save_default_payment_method: 'on_subscription',
                        payment_method_types: ['card', 'paypal'] // Explicitly allow PayPal
                    },
                    expand: ['latest_invoice.payment_intent'],
                    metadata: {
                        userId: userId,
                        planName: planName
                    }
                });

                const paymentIntent = (subscription.latest_invoice as any).payment_intent;

                result = {
                    subscriptionId: subscription.id,
                    clientSecret: paymentIntent?.client_secret,
                    status: subscription.status
                };
                break;
            }

            case 'create-connect-account': {
                const { userId, email, country, type } = data;

                // First, check if user already has an account to avoid duplicates
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                const { data: user } = await supabase
                    .from('users')
                    .select('stripe_account_id')
                    .eq('id', userId)
                    .single();

                let accountId = user?.stripe_account_id;

                // Validate the account ID with Stripe if it exists (Handle stale IDs)
                if (accountId) {
                    try {
                        const account = await stripe.accounts.retrieve(accountId);
                        if (account.deleted) {
                            accountId = null; // Account was deleted, create new one
                        }
                    } catch (e) {
                        console.log(`Stale or invalid account ID ${accountId}, creating new one.`);
                        accountId = null;
                    }
                }

                if (!accountId) {
                    try {
                        const account = await stripe.accounts.create({
                            type: type || 'express',
                            country: country || 'US', // Default to US if not specified
                            email: email,
                            capabilities: {
                                card_payments: { requested: true },
                                transfers: { requested: true },
                            },
                            metadata: { supabase_user_id: userId }
                        });
                        accountId = account.id;

                        await supabase
                            .from('users')
                            .update({ stripe_account_id: accountId })
                            .eq('id', userId);
                    } catch (e: any) {
                        console.error('Failed to create Stripe Connect account:', e);
                        // Provide a clearer error if it's likely a configuration issue
                        if (e.message?.includes('Connect')) {
                            throw new Error(`Stripe Connect configuration error: ${e.message}`);
                        }
                        throw e;
                    }
                }

                try {
                    const accountLink = await stripe.accountLinks.create({
                        account: accountId,
                        refresh_url: `${data.origin}/dashboard/wallet?connect_refresh=true`,
                        return_url: `${data.origin}/dashboard/wallet?connect_success=true&account_id=${accountId}`,
                        type: 'account_onboarding',
                    });

                    result = { url: accountLink.url, accountId: accountId };
                } catch (e: any) {
                    console.error('Failed to create Account Link:', e);
                    throw new Error(`Failed to generate onboarding link: ${e.message}`);
                }
                break;
            }

            case 'get-account-status': {
                const { stripeAccountId } = data;
                const account = await stripe.accounts.retrieve(stripeAccountId);
                const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId });

                result = {
                    charges_enabled: account.charges_enabled,
                    payouts_enabled: account.payouts_enabled,
                    details_submitted: account.details_submitted,
                    balance: {
                        available: balance.available[0]?.amount || 0,
                        pending: balance.pending[0]?.amount || 0,
                        currency: balance.available[0]?.currency || 'gbp'
                    }
                };
                break;
            }

            case 'create-checkout-session': {
                const { items, userId, purchaseId, successUrl, cancelUrl } = data;

                // Calculate Subtotal in cents
                const subtotal = items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100), 0);
                const platformFee = Math.round(subtotal * 0.02);

                const lineItems = items.map((item: any) => ({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: item.title,
                            description: item.type,
                            metadata: { sellerId: item.sellerId }
                        },
                        unit_amount: Math.round(item.price * 100),
                    },
                    quantity: 1,
                }));

                // Add Processing Fee as a separate line item if it's > 0
                if (platformFee > 0) {
                    lineItems.push({
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Processing Fee',
                                description: '2% Service Fee',
                            },
                            unit_amount: platformFee,
                        },
                        quantity: 1,
                    });
                }

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    client_reference_id: purchaseId,
                    metadata: {
                        userId: userId,
                        type: 'marketplace_order',
                        purchaseId: purchaseId,
                        platformFee: platformFee.toString()
                    }
                });

                result = { sessionId: session.id, url: session.url };
                break;
            }

            case 'create-marketplace-payment-intent': {
                const { items, userId, purchaseId, email } = data;
                const { customerId } = await getOrCreateCustomer(userId, email);

                const subtotal = items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100), 0);
                const platformFee = Math.round(subtotal * 0.02);
                const totalAmount = subtotal + platformFee;

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: totalAmount,
                    currency: 'usd',
                    customer: customerId,
                    metadata: {
                        userId,
                        purchaseId,
                        type: 'marketplace_order',
                        platformFee: platformFee.toString()
                    },
                    // Enable automatic payment methods (Card, Apple Pay, Google Pay)
                    automatic_payment_methods: { enabled: true }
                });

                result = { clientSecret: paymentIntent.client_secret };
                break;
            }

            case 'execute-payout': {
                const { amount, stripeAccountId } = data;
                const payout = await stripe.payouts.create({
                    amount: amount,
                    currency: 'gbp',
                }, {
                    stripeAccount: stripeAccountId,
                });

                result = { success: true, payoutId: payout.id };
                break;
            }

            case 'process-test-payment': {
                const { type, userId, planName, billingCycle, purchaseId } = data;
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                if (type === 'subscription') {
                    if (!userId || !planName) throw new Error("Missing userId or planName");

                    const now = new Date();
                    const nextPeriod = new Date();
                    if (billingCycle === 'yearly') {
                        nextPeriod.setFullYear(now.getFullYear() + 1);
                    } else {
                        nextPeriod.setMonth(now.getMonth() + 1);
                    }

                    const { error } = await supabase.from('users').update({
                        plan: planName as any,
                        subscription_status: 'active',
                        subscription_id: `sub_test_${Math.random().toString(36).substr(2, 9)}`,
                        current_period_end: nextPeriod.toISOString(),
                        cancel_at_period_end: false
                    }).eq('id', userId);

                    if (error) throw error;
                } else if (type === 'marketplace') {
                    if (!purchaseId) throw new Error("Missing purchaseId");

                    // 1. Mark Purchase as Completed
                    const { data: purchaseData, error: pError } = await supabase.from('purchases').update({
                        status: 'Completed',
                        stripe_payment_id: `test_pay_${Date.now()}`
                    }).eq('id', purchaseId).select('buyer_id, guest_email').single();

                    if (pError) throw pError;

                    // 2. Handle items (Library access, etc.)
                    // We call handleMarketplaceSuccess if it were accessible, 
                    // but here we just need to make sure the user sees it in their library.
                    // Usually, 'Completed' status is enough for the frontend to show download links,
                    // but contracts and transfers won't happen. For "Test Pay", that's usually fine.
                }

                result = { success: true };
                break;
            }

            case 'cancel-subscription': {
                const { userId, subscriptionId } = data;
                const subscription = await stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
                result = { success: true, subscription };
                break;
            }

            default:
                throw new Error('Invalid action');
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})

async function getOrCreateCustomer(userId: string, email?: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`[getOrCreateCustomer] userId: ${userId}, email: ${email}`);

    // Handle Guest Checkout
    if (userId === 'guest' || !userId || userId === 'null' || userId === 'undefined') {
        if (!email) throw new Error("Email required for guest checkout");

        // Check if customer with this email already exists to avoid duplicates
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });
        if (existingCustomers.data.length > 0) {
            console.log(`[getOrCreateCustomer] Found existing guest customer: ${existingCustomers.data[0].id}`);
            return { customerId: existingCustomers.data[0].id };
        }

        const customer = await stripe.customers.create({
            email: email,
            metadata: { type: 'guest' }
        });
        console.log(`[getOrCreateCustomer] Created new guest customer: ${customer.id}`);
        return { customerId: customer.id };
    }

    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('stripe_customer_id, email, username')
        .eq('id', userId)
        .maybeSingle();

    if (fetchError || !user) {
        console.log(`[getOrCreateCustomer] User not found in public.users: ${userId}. Error: ${fetchError?.message}`);

        // Check if customer already exists metadata-wise to avoid duplicates
        const existingByMeta = await stripe.customers.search({
            query: `metadata['supabase_user_id']:'${userId}'`,
        });

        if (existingByMeta.data.length > 0) {
            return { customerId: existingByMeta.data[0].id };
        }

        // Create new one if we have an email, else it might fail Stripe validation if email is empty but we should try
        const customer = await stripe.customers.create({
            email: email || undefined,
            metadata: { supabase_user_id: userId }
        });
        console.log(`[getOrCreateCustomer] Created fallback customer: ${customer.id}`);
        return { customerId: customer.id };
    }

    if (user.stripe_customer_id) {
        console.log(`[getOrCreateCustomer] Found existing customer in DB: ${user.stripe_customer_id}`);
        return { customerId: user.stripe_customer_id };
    }

    const customer = await stripe.customers.create({
        email: email || user.email || undefined,
        name: user.username || undefined,
        metadata: { supabase_user_id: userId }
    });

    console.log(`[getOrCreateCustomer] Created new customer and updating DB: ${customer.id}`);
    await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

    return { customerId: customer.id };
}
