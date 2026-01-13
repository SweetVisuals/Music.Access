-- Fix infinite recursion by using SECURITY DEFINER functions to break the cycle

-- Function to check if current user is a seller in a purchase
CREATE OR REPLACE FUNCTION is_seller_of_purchase(_purchase_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_items
    WHERE purchase_id = _purchase_id
    AND seller_id = (select auth.uid())
  );
$$;

-- Function to check if current user is the buyer of a purchase item
CREATE OR REPLACE FUNCTION is_buyer_of_item(_purchase_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchases
    WHERE id = _purchase_id
    AND (buyer_id = (select auth.uid()) OR buyer_id IS NULL)
  );
$$;

-- Re-apply policies using the functions

DROP POLICY IF EXISTS "View own purchases" ON purchases;
CREATE POLICY "View own purchases" ON purchases
FOR SELECT USING (
  auth.uid() = buyer_id 
  OR buyer_id IS NULL
  OR is_seller_of_purchase(id)
);

DROP POLICY IF EXISTS "View own purchase items" ON purchase_items;
CREATE POLICY "View own purchase items" ON purchase_items
FOR SELECT USING (
  seller_id = auth.uid()
  OR is_buyer_of_item(purchase_id)
);
