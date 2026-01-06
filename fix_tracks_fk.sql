ALTER TABLE tracks
DROP CONSTRAINT IF EXISTS tracks_mp3_asset_id_fkey;

-- Ensure assigned_file_id is UUID compatible
UPDATE tracks SET assigned_file_id = NULL WHERE assigned_file_id = '';
ALTER TABLE tracks ALTER COLUMN assigned_file_id TYPE UUID USING assigned_file_id::uuid;

-- Add the foreign key constraint
ALTER TABLE tracks
ADD CONSTRAINT tracks_mp3_asset_id_fkey
FOREIGN KEY (assigned_file_id)
REFERENCES assets(id);
