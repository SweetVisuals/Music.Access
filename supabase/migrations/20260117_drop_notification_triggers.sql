-- Drop triggers that might be creating "New Sale" or "New Order Assignment" notifications

-- 1. Drop trigger on purchases table (likely source of "New Sale" and "New Order")
DROP TRIGGER IF EXISTS on_purchase_created ON public.purchases;
DROP TRIGGER IF EXISTS handle_new_sale ON public.purchases;
DROP TRIGGER IF EXISTS on_sale_created ON public.purchases;

-- 2. Drop potential trigger functions
DROP FUNCTION IF EXISTS public.handle_new_purchase();
DROP FUNCTION IF EXISTS public.handle_new_sale();
DROP FUNCTION IF EXISTS public.notify_seller_on_sale();

-- 3. Drop trigger on orders table if it exists (for "New Order Assignment")
-- Note: 'orders' might be the same as 'purchases' or a separate table for services
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
DROP TRIGGER IF EXISTS handle_new_order ON public.orders;

DROP FUNCTION IF EXISTS public.handle_new_order();
DROP FUNCTION IF EXISTS public.notify_service_provider();
