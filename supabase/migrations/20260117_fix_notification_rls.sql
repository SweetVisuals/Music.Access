-- Disable and Re-enable RLS to be sure
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clear duplicates
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Create clean policies
CREATE POLICY "view_own_notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "update_own_notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "insert_own_notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
