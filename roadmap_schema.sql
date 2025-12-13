-- 1. Create STRATEGIES table
create table if not exists "public"."strategies" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "stage_id" text not null, -- e.g. 'stage-1', 'stage-4'
    "data" jsonb not null default '{}'::jsonb,
    "status" text not null default 'not_started', -- 'not_started', 'in_progress', 'completed'
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id"),
    unique ("user_id", "stage_id") -- One entry per stage per user
);

alter table "public"."strategies" enable row level security;

create policy "Users can view own strategies" on "public"."strategies" for select using (auth.uid() = user_id);
create policy "Users can insert own strategies" on "public"."strategies" for insert with check (auth.uid() = user_id);
create policy "Users can update own strategies" on "public"."strategies" for update using (auth.uid() = user_id);
create policy "Users can delete own strategies" on "public"."strategies" for delete using (auth.uid() = user_id);

-- 2. Create CALENDAR_EVENTS table
create table if not exists "public"."calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "title" text not null,
    "description" text,
    "start_date" timestamp with time zone not null,
    "end_date" timestamp with time zone, -- If null, it's a point-in-time event
    "type" text not null, -- 'campaign', 'content', 'meeting', 'milestone', 'era'
    "platform" text, -- 'instagram', 'youtube', etc.
    "status" text default 'pending', -- 'pending', 'completed', 'cancelled'
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

alter table "public"."calendar_events" enable row level security;

create policy "Users can view own events" on "public"."calendar_events" for select using (auth.uid() = user_id);
create policy "Users can insert own events" on "public"."calendar_events" for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on "public"."calendar_events" for update using (auth.uid() = user_id);
create policy "Users can delete own events" on "public"."calendar_events" for delete using (auth.uid() = user_id);

-- 3. Notify reload
notify pgrst, 'reload config';
