-- Add rate_type column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS rate_type text DEFAULT 'flat';

-- Check if the column exists to be safe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'rate_type') THEN
        ALTER TABLE services ADD COLUMN rate_type text DEFAULT 'flat';
    END IF;
END $$;
