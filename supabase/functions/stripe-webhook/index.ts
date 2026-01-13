
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
            const purchaseId = session.client_reference_id; // This is what we passed from frontend

            console.log(`Payment success for session: ${session.id}, purchaseId: ${purchaseId}`);

            if (purchaseId) {
                // 3. Update Supabase
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                // A. Mark Purchase as Completed
                const { error: updateError } = await supabase
                    .from('purchases')
                    .update({
                        status: 'Completed',
                        stripe_payment_id: session.payment_intent as string
                    })
                    .eq('id', purchaseId);

                if (updateError) {
                    console.error('Failed to update purchase:', updateError);
                    return new Response('Database update failed', { status: 500 });
                }

                // B. Handle Seller Transfers (90% to Seller)
                const { data: items, error: itemsError } = await supabase
                    .from('purchase_items')
                    .select('*, project:projects(user_id)')
                    .eq('purchase_id', purchaseId);

                if (itemsError) {
                    console.error('Failed to fetch items for transfer:', itemsError);
                } else if (items) {
                    for (const item of items) {
                        // Resolve seller ID (assuming project owner is seller)
                        // Note: We need to fetch the seller's Stripe Account ID from the 'users' table
                        const sellerUserId = item.project?.user_id; // or however you store seller relation

                        if (sellerUserId) {
                            const { data: sellerUser } = await supabase
                                .from('users')
                                .select('stripe_account_id, plan')
                                .eq('id', sellerUserId)
                                .single();

                            if (sellerUser?.stripe_account_id) {
                                // Calculate Seller Share (Default 98% -> 2% Fee)
                                // Premium Plans (Pro, Studio+) get 100% (0% Fee)
                                let feePercentage = 0.02; // 2%
                                if (sellerUser.plan === 'Pro' || sellerUser.plan === 'Studio+') {
                                    feePercentage = 0;
                                }

                                const amountTotal = Math.round(item.price * 100); // in cents
                                const sellerAmount = Math.round(amountTotal * (1 - feePercentage));
                                const feeAmount = amountTotal - sellerAmount;

                                try {
                                    console.log(`Transferring $${sellerAmount / 100} to seller ${sellerUser.stripe_account_id} (Fee: $${feeAmount / 100})`);

                                    await stripe.transfers.create({
                                        amount: sellerAmount,
                                        currency: 'usd',
                                        destination: sellerUser.stripe_account_id,
                                        transfer_group: purchaseId, // Links transfer to the purchase
                                        metadata: {
                                            purchaseItemId: item.id,
                                            originalPrice: item.price,
                                            platformFee: feeAmount
                                        }
                                    });
                                } catch (transferError) {
                                    console.error(`Failed to transfer to seller ${sellerUser.stripe_account_id}:`, transferError);
                                    // We don't rollback the purchase, but we log the error. 
                                    // In prod, you'd want a 'failed_transfers' table or queue.
                                }
                            }
                        }
                    }
                }
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
