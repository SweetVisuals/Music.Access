-- Enable RLS on licenses table if not already enabled
ALTER TABLE IF EXISTS "licenses" ENABLE ROW LEVEL SECURITY;

-- Allow public read access to licenses
-- This is necessary so that users can see license details (name, features, price)
-- for projects created by other users.
CREATE POLICY "Enable read access for all users"
ON "licenses"
FOR SELECT
TO public
USING (true);
