-- Add new columns for profile stats
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS years_experience text DEFAULT '0',
ADD COLUMN IF NOT EXISTS satisfaction_rate text DEFAULT '100%',
ADD COLUMN IF NOT EXISTS avg_turnaround text DEFAULT '24h';
