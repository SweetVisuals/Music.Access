-- Run this in your Supabase SQL Editor to create the secure gem gifting function

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

  -- Perform update (User)
  update users
  set gems = gems - 1
  where id = current_user_id;

  -- Perform update (Project)
  update projects
  set gems = coalesce(gems, 0) + 1
  where id = project_id_arg;

end;
$$;
