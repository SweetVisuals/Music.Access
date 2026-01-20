
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id);
