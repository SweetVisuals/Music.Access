-- Add parent_id to assets table for folder hierarchy
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES assets(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_parent_id ON assets(parent_id);

-- Update RLS policies if needed (optional, assuming basic CRUD allows updating own assets)
