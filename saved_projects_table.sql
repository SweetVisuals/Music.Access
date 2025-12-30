-- Create saved_projects table
create table if not exists "public"."saved_projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "project_id" uuid not null references "public"."projects"("id") on delete cascade,
    "created_at" timestamp with time zone default now(),
    primary key ("id"),
    unique("user_id", "project_id")
);

-- Enable RLS
alter table "public"."saved_projects" enable row level security;

-- Policies
drop policy if exists "Users can view own saved projects" on "public"."saved_projects";
create policy "Users can view own saved projects" 
on "public"."saved_projects" for select 
using (auth.uid() = user_id);

drop policy if exists "Users can save projects" on "public"."saved_projects";
create policy "Users can save projects" 
on "public"."saved_projects" for insert 
with check (auth.uid() = user_id);

drop policy if exists "Users can unsave projects" on "public"."saved_projects";
create policy "Users can unsave projects" 
on "public"."saved_projects" for delete 
using (auth.uid() = user_id);

-- Reload config
notify pgrst, 'reload config';
