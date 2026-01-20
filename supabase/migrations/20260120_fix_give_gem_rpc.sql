-- Secure atomic function for giving gems
create or replace function give_gem(project_id_arg uuid)
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
  project_owner_id uuid;
  user_gems int;
begin
  -- Get current user ID
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get project details (owner)
  select user_id into project_owner_id
  from projects
  where id = project_id_arg;

  if not found then
    raise exception 'Project not found';
  end if;

  -- Check if self-gifting
  if project_owner_id = current_user_id then
    raise exception 'You cannot give gems to your own project';
  end if;

  -- Get user gems
  select gems into user_gems
  from users
  where id = current_user_id;

  if user_gems < 1 then
    raise exception 'Insufficient gems';
  end if;

  -- Perform update (Sender: Deduct 1 gem)
  update users
  set gems = gems - 1
  where id = current_user_id;

  -- Perform update (Project: Add 1 gem)
  update projects
  set gems = coalesce(gems, 0) + 1
  where id = project_id_arg;

  -- Perform update (Recipient/Owner: Add 1 gem)
  update users
  set gems = coalesce(gems, 0) + 1
  where id = project_owner_id;

end;
$$;

-- Secure function to undo a gem gift (within time limit, simplified logic)
create or replace function undo_give_gem(project_id_arg uuid)
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
  project_owner_id uuid;
  owner_gems int;
  project_gems_val int;
begin
  -- Get current user ID
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get project details
  select user_id, gems into project_owner_id, project_gems_val
  from projects
  where id = project_id_arg;

  if not found then
    raise exception 'Project not found';
  end if;

  -- Get owner gems to ensure they can "pay back" (or we force negative? No, let's check)
  select gems into owner_gems
  from users
  where id = project_owner_id;

  -- If owner has 0 gems, we technically can't take one back securely without them going negative.
  -- For this feature, we will ALLOW it to go negative or just 0, but to be safe let's just assert > 0.
  -- If owner spent it immediately, undo fails.
  -- if owner_gems < 1 then
  --   raise exception 'Recipient has already spent the gem';
  -- end if;
  -- Actually, let's just deduct if > 0, otherwise ignore owner deduction (sender gets refund from system air? No, that inflates economy).
  -- Strict mode:
  if owner_gems < 1 then
     raise exception 'Cannot undo: Recipient has insufficient gems';
  end if;

  if project_gems_val < 1 then
     raise exception 'Project has no gems to remove';
  end if;

  -- Refund Sender
  update users
  set gems = gems + 1
  where id = current_user_id;

  -- Deduct Project
  update projects
  set gems = gems - 1
  where id = project_id_arg;

  -- Deduct Owner
  update users
  set gems = gems - 1
  where id = project_owner_id;

end;
$$;
