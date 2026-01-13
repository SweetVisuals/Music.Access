-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- Purchases Policies
DROP POLICY IF EXISTS "View own purchases" ON purchases;
CREATE POLICY "View own purchases" ON purchases
FOR SELECT USING (
  auth.uid() = buyer_id 
  OR buyer_id IS NULL
  OR EXISTS (
    SELECT 1 FROM purchase_items pi
    WHERE pi.purchase_id = purchases.id
    AND pi.seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Create purchases" ON purchases;
CREATE POLICY "Create purchases" ON purchases
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update own purchases" ON purchases;
CREATE POLICY "Update own purchases" ON purchases
FOR UPDATE USING (auth.uid() = buyer_id);


-- Purchase Items Policies
DROP POLICY IF EXISTS "View own purchase items" ON purchase_items;
CREATE POLICY "View own purchase items" ON purchase_items
FOR SELECT USING (
  seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM purchases p
    WHERE p.id = purchase_items.purchase_id
    AND (p.buyer_id = auth.uid() OR p.buyer_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Create purchase items" ON purchase_items;
CREATE POLICY "Create purchase items" ON purchase_items
FOR INSERT WITH CHECK (true);
