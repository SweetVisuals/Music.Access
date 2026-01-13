
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

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

        // Simple mock user check - in production verify JWT
        // const authHeader = req.headers.get('Authorization')
        // if (!authHeader) throw new Error('Missing Authorization header')

        let result;

        switch (action) {
            case 'create-connect-account': {
                const { userId, email } = data;
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'GB', // UK Platform
                    email: email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    metadata: { supabase_user_id: userId }
                });

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${data.origin}/wallet?connect_refresh=true`,
                    return_url: `${data.origin}/wallet?connect_success=true&account_id=${account.id}`,
                    type: 'account_onboarding',
                });

                result = { url: accountLink.url, accountId: account.id };
                break;
            }

            case 'get-account-status': {
                const { stripeAccountId } = data;
                const account = await stripe.accounts.retrieve(stripeAccountId);

                // Fetch balance
                const balance = await stripe.balance.retrieve({
                    stripeAccount: stripeAccountId
                });

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

                // Logic to construct line items and destination charges
                // Note: Stripe Checkout with "Destination Charges" (split payment) 
                // usually requires creating a session on behalf of the connected account 
                // OR using 'transfer_data' on each line item or the session.
                // For a cart with mixed sellers, we might need 'payment_intent_data.transfer_group' and separate transfers later,
                // OR simple destination charges if 1 seller.
                // Assuming single seller per item is tricky in one checkout unless we use simple destination charge logic per item 
                // BUT Stripe Checkout doesn't support different destinations per line item easily in one session unless using 'subscription_data' or specialized flows.
                // SIMPLIFICATION for now: We assume single-seller checkout or we just take payment to Platform and transfer later (Separate Charges and Transfers).

                // Let's use "Separate Charges and Transfers" model:
                // 1. Platform takes full payment.
                // 2. We use 'transfer_group' to tag the payment.
                // 3. Webhook later splits the money to sellers.

                const lineItems = items.map((item: any) => ({
                    price_data: {
                        currency: 'usd', // Or gbp
                        product_data: {
                            name: item.title,
                            description: item.type,
                            metadata: { sellerId: item.sellerId }
                        },
                        unit_amount: Math.round(item.price * 100),
                    },
                    quantity: 1,
                }));

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    client_reference_id: purchaseId, // CRITICAL: Links Stripe Session to Supabase Purchase ID
                    metadata: {
                        userId: userId,
                        type: 'marketplace_order',
                        purchaseId: purchaseId
                    }
                });

                result = { sessionId: session.id, url: session.url };
                break;
            }

            case 'create-subscription': {
                const { planName, userId, billingCycle, successUrl, cancelUrl } = data;

                // Map plans to Stripe Price IDs (You should put your real Price IDs here)
                // Real Price IDs provided by user
                const priceMap: Record<string, string> = {
                    'Basic_monthly': 'price_1Sp5lmBSQA5JBjNFZlcFaKxs',
                    'Basic_yearly': 'price_1Sp5lmBSQA5JBjNF1r3KqUAl',
                    'Pro_monthly': 'price_1Sp5muBSQA5JBjNF17k7RyQH',
                    'Pro_yearly': 'price_1Sp5nKBSQA5JBjNF3DOGMv1i',
                    'Studio+_monthly': 'price_1Sp5ntBSQA5JBjNFNU2Xx5OE',
                    'Studio+_yearly': 'price_1Sp5otBSQA5JBjNFOF4VmwfL'
                };

                const priceId = priceMap[`${planName}_${billingCycle}`];
                if (!priceId) {
                    throw new Error(`Invalid plan or billing cycle: ${planName} / ${billingCycle}`);
                }

                // If we don't have real price IDs, we can use ad-hoc prices for testing
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                product_data: {
                                    name: `${planName} Plan (${billingCycle})`,
                                },
                                unit_amount: planName === 'Pro' ? 1499 : (planName === 'Studio+' ? 2499 : 799),
                                recurring: {
                                    interval: billingCycle === 'yearly' ? 'year' : 'month'
                                }
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'subscription',
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    metadata: {
                        userId: userId,
                        planName: planName
                    }
                });

                result = { sessionId: session.id, url: session.url };
                break;
            }

            case 'execute-payout': {
                const { amount, stripeAccountId } = data;

                // Initiate a payout from the connected account to their bank
                const payout = await stripe.payouts.create({
                    amount: amount,
                    currency: 'gbp',
                }, {
                    stripeAccount: stripeAccountId,
                });

                result = { success: true, payoutId: payout.id };
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
