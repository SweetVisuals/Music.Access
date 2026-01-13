-- Add subscription tracking fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Create an index for performance if querying by status often
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
