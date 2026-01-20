
-- Fix Notifications Constraints and RLS

-- 1. Drop existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add updated constraint with all necessary types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'sale', 'order', 'system', 'manage_order', 'collab_invite', 'comment', 'follow', 'like'));

-- 3. Update RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert notifications for ANY user (needed for Buyer -> Seller notifications)
DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Keep view/update policies restricted to own notifications
DROP POLICY IF EXISTS "view_own_notifications" ON public.notifications;
CREATE POLICY "view_own_notifications" ON public.notifications
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);
