-- Enable RLS on users table
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Anyone can view user profiles" ON "public"."users";
DROP POLICY IF EXISTS "Users can view all profiles" ON "public"."users";

-- 1. Allow users to insert their *own* profile row (JIT Provisioning)
-- This allows appropriate INSERTs where the row ID matches the authenticated user's ID
CREATE POLICY "Users can insert their own profile"
ON "public"."users"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 2. Allow users to update their *own* profile
CREATE POLICY "Users can update their own profile"
ON "public"."users"
FOR UPDATE
USING (auth.uid() = id);

-- 3. Allow viewing of user profiles
-- This is necessary for 'ensureUserExists' to check if a user exists, and for the app to display profiles.
CREATE POLICY "Anyone can view user profiles"
ON "public"."users"
FOR SELECT
USING (true);
