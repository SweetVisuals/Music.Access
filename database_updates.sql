-- 1. ADD PLAY COUNT TO TRACKS
-- Adds a counter column to the tracks table to store total plays efficiently.
alter table "public"."tracks" 
add column if not exists "play_count" bigint default 0;

-- 2. CREATE PLAYS TABLE (HISTORY)
-- Stores individual play events for analytics (who played what, when).
create table if not exists "public"."plays" (
    "id" uuid not null default gen_random_uuid(),
    "track_id" uuid not null references "public"."tracks"("id") on delete cascade,
    "user_id" uuid references "auth"."users"("id") on delete set null,
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON PLAYS
alter table "public"."plays" enable row level security;

-- Drop existing policies to ensure idempotency
drop policy if exists "Allow public insert on plays" on "public"."plays";
drop policy if exists "Users can view own plays" on "public"."plays";
drop policy if exists "Track owners can view plays of their tracks" on "public"."plays";

-- Allow anyone to insert plays (public listening)
create policy "Allow public insert on plays" 
on "public"."plays" for insert 
with check (true);

-- Allow users to view their own plays
create policy "Users can view own plays" 
on "public"."plays" for select 
using (auth.uid() = user_id);

-- Allow track owners to view plays of their tracks (Analytic view)
create policy "Track owners can view plays of their tracks" 
on "public"."plays" for select 
using (
    exists (
        select 1 from "public"."tracks" t
        join "public"."projects" p on t.project_id = p.id
        where t.id = "public"."plays".track_id
        and p.user_id = auth.uid()
    )
);

-- 4. CREATE INCREMENT_PLAY_COUNT FUNCTION (RPC)
-- Atomic function to increment counter and log history in one go.
create or replace function increment_play_count(track_id uuid)
returns void as $$
begin
  -- Increment the counter on the track
  update "public"."tracks"
  set "play_count" = coalesce("play_count", 0) + 1
  where "id" = track_id;

  -- Record the individual play event
  insert into "public"."plays" ("track_id", "user_id")
  values (track_id, auth.uid());
end;
$$ language plpgsql security definer;

-- 5. CREATE GEM TRANSACTIONS TABLE (OPTIONAL - FOR FUTURE HISTORY)
create table if not exists "public"."gem_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "amount" integer not null, -- Positive for gain, negative for spend
    "type" text not null, -- 'purchase', 'spend', 'reward', 'daily_login'
    "description" text,
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

alter table "public"."gem_transactions" enable row level security;

drop policy if exists "Users can view own gem transactions" on "public"."gem_transactions";

create policy "Users can view own gem transactions" 
on "public"."gem_transactions" for select 
using (auth.uid() = user_id);

-- 6. CREATE GOALS TABLE
create table if not exists "public"."goals" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "title" text not null,
    "type" text not null, -- 'revenue', 'followers', 'uploads', 'plays', 'sales', 'custom'
    "target" numeric not null default 0,
    "current" numeric not null default 0,
    "deadline" date not null,
    "status" text not null default 'active', -- 'active', 'completed', 'paused', 'failed'
    "description" text,
    "category" text not null default 'monthly', -- 'monthly', 'quarterly', 'yearly', 'custom'
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

alter table "public"."goals" enable row level security;

drop policy if exists "Users can view own goals" on "public"."goals";
drop policy if exists "Users can insert own goals" on "public"."goals";
drop policy if exists "Users can update own goals" on "public"."goals";
drop policy if exists "Users can delete own goals" on "public"."goals";

create policy "Users can view own goals" 
on "public"."goals" for select 
using (auth.uid() = user_id);

create policy "Users can insert own goals" 
on "public"."goals" for insert 
with check (auth.uid() = user_id);

create policy "Users can update own goals" 
on "public"."goals" for update 
using (auth.uid() = user_id);

create policy "Users can delete own goals" 
on "public"."goals" for delete 
using (auth.uid() = user_id);

-- 7. CREATE NOTES TABLE
create table if not exists "public"."notes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "title" text not null default 'Untitled Note',
    "content" text default '',
    "preview" text default '',
    "tags" text[] default array[]::text[],
    "attached_audio" text,
    "updated_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Force add columns if table already existed without them
alter table "public"."notes" add column if not exists "preview" text default '';
alter table "public"."notes" add column if not exists "attached_audio" text;
alter table "public"."notes" add column if not exists "tags" text[] default array[]::text[];

alter table "public"."notes" enable row level security;

drop policy if exists "Users can view own notes" on "public"."notes";
drop policy if exists "Users can insert own notes" on "public"."notes";
drop policy if exists "Users can update own notes" on "public"."notes";
drop policy if exists "Users can delete own notes" on "public"."notes";

create policy "Users can view own notes" 
on "public"."notes" for select 
using (auth.uid() = user_id);

create policy "Users can insert own notes" 
on "public"."notes" for insert 
with check (auth.uid() = user_id);

create policy "Users can update own notes" 
on "public"."notes" for update 
using (auth.uid() = user_id);

create policy "Users can delete own notes" 
on "public"."notes" for delete 
using (auth.uid() = user_id);

-- 8. RELOAD SCHEMA CACHE
notify pgrst, 'reload config';

-- 9. CREATE TASKS TABLE
create table if not exists "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null references "public"."projects"("id") on delete cascade,
    "text" text not null,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

alter table "public"."tasks" enable row level security;

create policy "Users can view own project tasks" 
on "public"."tasks" for select 
using (
    exists (
        select 1 from "public"."projects" p
        where p.id = "public"."tasks".project_id
        and p.user_id = auth.uid()
    )
);

create policy "Users can insert own project tasks" 
on "public"."tasks" for insert 
with check (
    exists (
        select 1 from "public"."projects" p
        where p.id = "public"."tasks".project_id
        and p.user_id = auth.uid()
    )
);

create policy "Users can update own project tasks" 
on "public"."tasks" for update 
using (
    exists (
        select 1 from "public"."projects" p
        where p.id = "public"."tasks".project_id
        and p.user_id = auth.uid()
    )
);

create policy "Users can delete own project tasks" 
on "public"."tasks" for delete 
using (
    exists (
        select 1 from "public"."projects" p
        where p.id = "public"."tasks".project_id
        and p.user_id = auth.uid()
    )
);

-- 10. UPDATE PROJECTS TABLE
alter table "public"."projects" add column if not exists "release_date" date;
alter table "public"."projects" add column if not exists "format" text default 'Album';
alter table "public"."projects" add column if not exists "progress" integer default 0;

-- 11. UPDATE TRACKS TABLE
alter table "public"."tracks" add column if not exists "note_id" uuid references "public"."notes"("id") on delete set null;
alter table "public"."tracks" add column if not exists "status_tags" jsonb default '[]'::jsonb;
alter table "public"."tracks" add column if not exists "assigned_file_id" text;

-- 12. RELOAD SCHEMA CACHE AGAIN
notify pgrst, 'reload config';
