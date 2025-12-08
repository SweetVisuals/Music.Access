-- Enable RLS on assets table if not already enabled
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert their own assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;

-- Create RLS policies for assets table

-- Allow users to view their own assets
CREATE POLICY "Users can view their own assets" 
ON assets FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own assets
CREATE POLICY "Users can insert their own assets" 
ON assets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own assets
CREATE POLICY "Users can update their own assets" 
ON assets FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own assets
CREATE POLICY "Users can delete their own assets" 
ON assets FOR DELETE 
USING (auth.uid() = user_id);

-- Also enable RLS and create policies for storage objects
-- NOTE: storage.objects is a BUILT-IN Supabase table (you don't create it)
-- This table manages all files in your storage buckets

-- Allow authenticated users to upload files to the assets bucket
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'assets' AND auth.role() = 'authenticated');

-- Allow users to view files in the assets bucket (if they're the owner)
CREATE POLICY "Users can view their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own files
CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);