
-- Create table to track who gave gems to which project
CREATE TABLE IF NOT EXISTS project_gem_givers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- Enable RLS
ALTER TABLE project_gem_givers ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own given gems (or public if needed for "Who liked this?", but for now just own)
CREATE POLICY "Users can view their own given gems" ON project_gem_givers
  FOR SELECT USING (auth.uid() = user_id);

-- Computed relationship for "Has Given Gem" - handled via direct query usually

-- Update give_gem to record the giver
CREATE OR REPLACE FUNCTION give_gem(project_id_arg uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  project_owner_id uuid;
  user_gems int;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already given
  IF EXISTS (SELECT 1 FROM project_gem_givers WHERE user_id = current_user_id AND project_id = project_id_arg) THEN
    RAISE EXCEPTION 'You have already given a gem to this project';
  END IF;

  -- Get project details (owner)
  SELECT user_id INTO project_owner_id
  FROM projects
  WHERE id = project_id_arg;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Check if self-gifting
  IF project_owner_id = current_user_id THEN
    RAISE EXCEPTION 'You cannot give gems to your own project';
  END IF;

  -- Get user gems
  SELECT gems INTO user_gems
  FROM users
  WHERE id = current_user_id;

  IF user_gems < 1 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  -- 1. Insert record (will fail if PK exists, double safety)
  INSERT INTO project_gem_givers (user_id, project_id)
  VALUES (current_user_id, project_id_arg);

  -- 2. Deduct from Sender
  UPDATE users
  SET gems = gems - 1
  WHERE id = current_user_id;

  -- 3. Add to Project
  UPDATE projects
  SET gems = coalesce(gems, 0) + 1
  WHERE id = project_id_arg;

  -- 4. Add to Owner
  UPDATE users
  SET gems = coalesce(gems, 0) + 1
  WHERE id = project_owner_id;

END;
$$;

-- Update undo_give_gem to remove the record
CREATE OR REPLACE FUNCTION undo_give_gem(project_id_arg uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  project_owner_id uuid;
  owner_gems int;
  project_gems_val int;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if record exists
  IF NOT EXISTS (SELECT 1 FROM project_gem_givers WHERE user_id = current_user_id AND project_id = project_id_arg) THEN
    RAISE EXCEPTION 'You have not given a gem to this project';
  END IF;

  -- Get project details
  SELECT user_id, gems INTO project_owner_id, project_gems_val
  FROM projects
  WHERE id = project_id_arg;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Get owner gems
  SELECT gems INTO owner_gems
  FROM users
  WHERE id = project_owner_id;

  IF owner_gems < 1 THEN
     RAISE EXCEPTION 'Cannot undo: Recipient has insufficient gems';
  END IF;

  IF project_gems_val < 1 THEN
     RAISE EXCEPTION 'Project has no gems to remove';
  END IF;

  -- 1. Remove record
  DELETE FROM project_gem_givers
  WHERE user_id = current_user_id AND project_id = project_id_arg;

  -- 2. Refund Sender
  UPDATE users
  SET gems = gems + 1
  WHERE id = current_user_id;

  -- 3. Deduct Project
  UPDATE projects
  SET gems = gems - 1
  WHERE id = project_id_arg;

  -- 4. Deduct Owner
  UPDATE users
  SET gems = gems - 1
  WHERE id = project_owner_id;

END;
$$;
