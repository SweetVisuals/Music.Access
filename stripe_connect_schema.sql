-- Add Stripe Connect fields to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;

-- Add policies (Optional: depends on your RLS setup)
-- Allow users to read their own sensitive stripe info
CREATE POLICY "Users can read own stripe info" ON users
FOR SELECT
USING (auth.uid() = id);

-- Protected by service role only for updates usually, but if using direct update:
-- CREATE POLICY "Users can update own stripe info" ON users ...
