-- Safely add 'role' column to public.users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN 
        ALTER TABLE public.users ADD COLUMN role text DEFAULT 'Producer'; 
    END IF; 
END $$;

-- Optional: Backfill existing users with a default role if needed (already handled by DEFAULT above for new empty cols, but good for clarity)
UPDATE public.users SET role = 'Producer' WHERE role IS NULL;
