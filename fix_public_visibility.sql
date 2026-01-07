-- FIX: Allow public access to tracks, licenses, and tags for PUBLISHED projects
-- Updated to use strictly quoted schema and table names to ensure correct resolution

-- 1. TRACKS POLICY UPDATE
DROP POLICY IF EXISTS "Users can view tracks of their projects" ON "public"."tracks";

CREATE POLICY "Users can view tracks of their projects"
ON "public"."tracks" FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."projects" p
        WHERE p.id = "public"."tracks".project_id
        AND (
            p.user_id = auth.uid() -- Owner can always see
            OR 
            p.status = 'published' -- Public can see if published
        )
    )
);

-- 2. PROJECT LICENSES POLICY UPDATE
DROP POLICY IF EXISTS "Users can view licenses of their projects" ON "public"."project_licenses";

CREATE POLICY "Users can view licenses of their projects"
ON "public"."project_licenses" FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."projects" p
        WHERE p.id = "public"."project_licenses".project_id
        AND (
            p.user_id = auth.uid() -- Owner can always see
            OR 
            p.status = 'published' -- Public can see if published
        )
    )
);

-- 3. PROJECT TAGS POLICY UPDATE
DROP POLICY IF EXISTS "Users can view tags of their projects" ON "public"."project_tags";

CREATE POLICY "Users can view tags of their projects"
ON "public"."project_tags" FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."projects" p
        WHERE p.id = "public"."project_tags".project_id
        AND (
            p.user_id = auth.uid() -- Owner can always see
            OR 
            p.status = 'published' -- Public can see if published
        )
    )
);

-- CONFIRMATION
SELECT 'Policies updated successfully. Unpublished projects remain private. Published projects are now visible.' as result;
