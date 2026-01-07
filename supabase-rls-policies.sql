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

-- Enable RLS on projects table if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Create RLS policies for projects table
-- Allow users to view their own projects
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own projects
CREATE POLICY "Users can insert their own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own projects
CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own projects
CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on tracks table if not already enabled
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tracks of their projects" ON tracks;
DROP POLICY IF EXISTS "Users can insert tracks to their projects" ON tracks;
DROP POLICY IF EXISTS "Users can update tracks of their projects" ON tracks;
DROP POLICY IF EXISTS "Users can delete tracks of their projects" ON tracks;

-- Create RLS policies for tracks table
-- Allow users to view tracks of their own projects OR published projects
CREATE POLICY "Users can view tracks of their projects"
ON tracks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tracks.project_id
        AND (
            p.user_id = auth.uid()
            OR
            p.status = 'published'
        )
    )
);

-- Allow users to insert tracks to their own projects
CREATE POLICY "Users can insert tracks to their projects"
ON tracks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tracks.project_id
        AND p.user_id = auth.uid()
    )
);

-- Allow users to update tracks of their own projects
CREATE POLICY "Users can update tracks of their projects"
ON tracks FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tracks.project_id
        AND p.user_id = auth.uid()
    )
);

-- Allow users to delete tracks of their own projects
CREATE POLICY "Users can delete tracks of their projects"
ON tracks FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tracks.project_id
        AND p.user_id = auth.uid()
    )
);

-- Enable RLS on licenses table if not already enabled
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own licenses" ON licenses;
DROP POLICY IF EXISTS "Users can insert their own licenses" ON licenses;
DROP POLICY IF EXISTS "Users can update their own licenses" ON licenses;
DROP POLICY IF EXISTS "Users can delete their own licenses" ON licenses;

-- Create RLS policies for licenses table
-- Allow users to view their own licenses
CREATE POLICY "Users can view their own licenses"
ON licenses FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own licenses
CREATE POLICY "Users can insert their own licenses"
ON licenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own licenses
CREATE POLICY "Users can update their own licenses"
ON licenses FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own licenses
CREATE POLICY "Users can delete their own licenses"
ON licenses FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on project_licenses table if not already enabled
ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view licenses of their projects" ON project_licenses;
DROP POLICY IF EXISTS "Users can insert licenses to their projects" ON project_licenses;
DROP POLICY IF EXISTS "Users can update licenses of their projects" ON project_licenses;
DROP POLICY IF EXISTS "Users can delete licenses of their projects" ON project_licenses;

-- Create RLS policies for project_licenses table
-- Allow users to view licenses of their own projects OR published projects
CREATE POLICY "Users can view licenses of their projects"
ON project_licenses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_licenses.project_id
        AND (
            p.user_id = auth.uid() 
            OR 
            p.status = 'published'
        )
    )
);

-- Allow users to insert licenses to their own projects
CREATE POLICY "Users can insert licenses to their projects"
ON project_licenses FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_licenses.project_id
        AND p.user_id = auth.uid()
    )
);

-- Allow users to update licenses of their own projects
CREATE POLICY "Users can update licenses of their projects"
ON project_licenses FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_licenses.project_id
        AND p.user_id = auth.uid()
    )
);

-- Allow users to delete licenses of their projects
CREATE POLICY "Users can delete licenses of their projects"
ON project_licenses FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_licenses.project_id
        AND p.user_id = auth.uid()
    )
);

-- Enable RLS on tags table if not already enabled
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all tags" ON tags;
DROP POLICY IF EXISTS "Users can insert tags" ON tags;

-- Create RLS policies for tags table (tags are shared, so allow all authenticated users to view and insert)
-- Allow all users to view tags
CREATE POLICY "Users can view all tags"
ON tags FOR SELECT
USING (true);

-- Allow authenticated users to insert tags
CREATE POLICY "Users can insert tags"
ON tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on project_tags table if not already enabled
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tags of their projects" ON project_tags;
DROP POLICY IF EXISTS "Users can insert tags to their projects" ON project_tags;
DROP POLICY IF EXISTS "Users can delete tags from their projects" ON project_tags;

-- Create RLS policies for project_tags table
-- Allow users to view tags of their own projects OR published projects
CREATE POLICY "Users can view tags of their projects"
ON project_tags FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_tags.project_id
        AND (
            p.user_id = auth.uid()
            OR 
            p.status = 'published'
        )
    )
);

-- Allow users to insert tags to their own projects
CREATE POLICY "Users can insert tags to their projects"
ON project_tags FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_tags.project_id
        AND p.user_id = auth.uid()
    )
);

-- Allow users to delete tags from their projects
CREATE POLICY "Users can delete tags from their projects"
ON project_tags FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_tags.project_id
        AND p.user_id = auth.uid()
    )
);