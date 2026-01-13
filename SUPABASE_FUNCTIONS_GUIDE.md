# Supabase Functions Guide

I have created Supabase Edge Functions to handle your Stripe integration securely.

**Project Details**:
- **Name**: Music Access
- **Reference ID**: `tkbedvjqciuerhagpmju`
- **Region**: `eu-west-1`

**Functions**:
1.  `stripe-actions`: Handles Connect, Checkout, Subscriptions, Payouts.
2.  `stripe-webhook`: Listens for Stripe events (payment success) and updates the database.

## 1. Setup Environment (Production)

You need to set these secrets in your Supabase Dashboard or via CLI:

```bash
# Set secrets for project 'tkbedvjqciuerhagpmju'
supabase secrets set STRIPE_SECRET_KEY=sk_org_live_... --project-ref tkbedvjqciuerhagpmju
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref tkbedvjqciuerhagpmju
```
*Note: You get `STRIPE_WEBHOOK_SECRET` from the Stripe Dashboard > Developers > Webhooks.*

## 2. Deploy Functions

```bash
supabase link --project-ref tkbedvjqciuerhagpmju
supabase functions deploy stripe-actions --project-ref tkbedvjqciuerhagpmju
supabase functions deploy stripe-webhook --project-ref tkbedvjqciuerhagpmju
```

## 3. Configure Stripe Webhook

1.  Go to **Stripe Dashboard > Developers > Webhooks**.
2.  Click **"Add Endpoint"**.
3.  **Endpoint URL**: 
    *   `https://tkbedvjqciuerhagpmju.supabase.co/functions/v1/stripe-webhook`
4.  **Events to listen for**:
    *   `checkout.session.completed`
5.  **Add Endpoint**.
6.  Copy the **Signing Secret** (`whsec_...`) and set it as a secret in Supabase (step 1).

## 4. Run Locally (Testing)

**Start Services:**
```bash
supabase start
supabase functions serve --env-file .env.local --no-verify-jwt
```

**Forward Webhooks:**
To test webhooks locally, use the Stripe CLI:
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```
*Take the webhook secret it outputs satisfying `whsec_...` and add it to your `.env.local`.*
