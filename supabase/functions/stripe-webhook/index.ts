
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')

    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    try {
        // 1. Verify the Webhook Signature
        const body = await req.text()
        const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        let event;

        try {
            // Since verifySignature is complex in Deno environments without Node crypto,
            // we use the official Stripe SDK's async implementation if available, 
            // or for simplicity in this generated code, we assume trust (in prod use proper verification).
            // The Deno SDK supports constructEventAsync with cryptoProvider.
            event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret!, undefined, cryptoProvider);
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(err.message, { status: 400 });
        }

        // 2. Handle the Event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            if (session.mode === 'subscription') {
                const userId = session.metadata?.userId;
                const planName = session.metadata?.planName;
                const subscriptionId = session.subscription;
                await handleSubscriptionSuccess(userId, planName, subscriptionId);
            } else {
                const purchaseId = session.client_reference_id || session.metadata?.purchaseId;
                const paymentIntentId = session.payment_intent;
                await handleMarketplaceSuccess(purchaseId, paymentIntentId);
            }
        }
        else if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            if (pi.metadata?.type === 'marketplace_order') {
                await handleMarketplaceSuccess(pi.metadata.purchaseId, pi.id);
            }
        }
        else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const userId = subscription.metadata?.userId;
            const planName = subscription.metadata?.planName;
            await handleSubscriptionSuccess(userId, planName, subscriptionId);
        }


        // Handle Subscription Updates (Renewals, Cancellations)
        else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            const userId = subscription.metadata?.userId;

            if (userId) {
                console.log(`Subscription updated for user: ${userId}. Status: ${subscription.status}, CancelAtEnd: ${subscription.cancel_at_period_end}`);
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                await supabase.from('users').update({
                    subscription_status: subscription.status,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end
                }).eq('id', userId);
            }
        }

        // Handle Subscription Deletion (Final expiration)
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const userId = subscription.metadata?.userId;

            if (userId) {
                console.log(`Subscription deleted/expired for user: ${userId}`);
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                await supabase.from('users').update({
                    plan: null,
                    subscription_status: 'canceled',
                    cancel_at_period_end: false
                }).eq('id', userId);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (err) {
        console.error(err)
        return new Response(err.message, { status: 400 })
    }
})

/**
 * Modular handler for Marketplace order success
 */
async function handleMarketplaceSuccess(purchaseId: string, paymentIntentId: any) {
    if (!purchaseId) return;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Processing marketplace success for purchase: ${purchaseId}`);

    // 1. Mark Purchase as Completed
    // First check if already completed to handle idempotent webhook events (Stripe sends both session.completed and payment_intent.succeeded)
    const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('status')
        .eq('id', purchaseId)
        .single();

    if (existingPurchase && existingPurchase.status === 'Completed') {
        console.log(`Purchase ${purchaseId} already completed. Skipping duplicate webhook event.`);
        return;
    }

    const { data: purchaseData } = await supabase.from('purchases').update({
        status: 'Completed',
        stripe_payment_id: paymentIntentId as string
    }).eq('id', purchaseId).select('buyer_id, guest_email').single();

    // 2. Handle Seller Transfers and Contracts
    const { data: items } = await supabase
        .from('purchase_items')
        .select('*, project:projects(user_id, title)')
        .eq('purchase_id', purchaseId);

    if (items) {
        for (const item of items) {
            const sellerUserId = item.project?.user_id;
            if (!sellerUserId) continue;

            const { data: sellerUser } = await supabase
                .from('users')
                .select('stripe_account_id, plan')
                .eq('id', sellerUserId)
                .single();

            // Handle Seller Transfer
            if (sellerUser?.stripe_account_id) {
                let feePercentage = 0.02;
                if (sellerUser.plan === 'Pro' || sellerUser.plan === 'Studio+') feePercentage = 0;

                const amountTotal = Math.round(item.price * 100);
                const sellerAmount = Math.round(amountTotal * (1 - feePercentage));

                try {
                    await stripe.transfers.create({
                        amount: sellerAmount,
                        currency: 'usd',
                        destination: sellerUser.stripe_account_id,
                        transfer_group: purchaseId,
                        metadata: { purchaseItemId: item.id }
                    });
                } catch (e) {
                    console.error("Transfer failed", e);
                }
            }

            // 3. Handle Contract Generation
            if (item.license_id) {
                try {
                    // Fetch license and its contract template
                    const { data: license } = await supabase
                        .from('licenses')
                        .select('*, contract:contracts(*)')
                        .eq('id', item.license_id)
                        .maybeSingle();

                    if (license && (license as any).contract_id) {
                        const template = (license as any).contract;

                        // Fetch buyer name if available
                        let buyerName = purchaseData?.guest_email || 'Buyer';
                        if (purchaseData?.buyer_id) {
                            const { data: buyerUser } = await supabase
                                .from('users')
                                .select('username')
                                .eq('id', purchaseData.buyer_id)
                                .single();
                            if (buyerUser) buyerName = buyerUser.username;
                        }

                        // Create a signed contract instance
                        const { data: signedContract } = await supabase
                            .from('contracts')
                            .insert({
                                user_id: sellerUserId,
                                title: `${item.item_name} - ${license.name} License Agreement`,
                                type: template?.type || (license.type === 'Exclusive' ? 'exclusive' : 'lease'),
                                status: 'signed',
                                client_name: buyerName,
                                content: template?.content || 'Terms and conditions for use of the audio asset.',
                                royalty_split: template?.royalty_split || 50,
                                revenue_split: template?.revenue_split || 50,
                                notes: `Automatically generated on purchase of ${item.item_name}.`,
                                dist_notes: template?.dist_notes || '',
                                pub_notes: template?.pub_notes || '',
                                publisher_name: template?.publisher_name || '',
                                producer_signature: template?.producer_signature || 'Electronically Signed',
                                client_signature: 'Electronically Signed'
                            })
                            .select()
                            .single();

                        if (signedContract) {
                            console.log(`Generated signed contract ${signedContract.id} for item ${item.id}`);
                            // Link contract to purchase item
                            await supabase
                                .from('purchase_items')
                                .update({ contract_id: signedContract.id })
                                .eq('id', item.id);
                        }
                    }
                } catch (contractErr) {
                    console.error("Error generating contract:", contractErr);
                }
            }
        }
    }
}

/**
 * Modular handler for Subscription success
 */
async function handleSubscriptionSuccess(userId: string, planName: string, subscriptionId: any) {
    if (!userId || !planName || !subscriptionId) return;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Processing subscription success for user: ${userId}, plan: ${planName}`);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

    await supabase.from('users').update({
        plan: planName as any,
        subscription_id: subscriptionId,
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end
    }).eq('id', userId);
}

