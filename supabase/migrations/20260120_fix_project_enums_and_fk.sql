-- Ensure 'release' is in project_type enum
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'release';

-- Ensure contract_id is nullable in purchase_items (it seems it is, but to be safe)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_items' AND column_name = 'contract_id' AND is_nullable = 'NO') THEN
        ALTER TABLE purchase_items ALTER COLUMN contract_id DROP NOT NULL;
    END IF;
END $$;
