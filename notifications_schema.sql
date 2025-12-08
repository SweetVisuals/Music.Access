-- Create Notifications Table
create table if not exists "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "type" text not null, -- 'sale', 'message', 'system', 'alert'
    "title" text not null,
    "message" text not null,
    "link" text, -- Optional URL to redirect to
    "read" boolean not null default false,
    "data" jsonb default '{}'::jsonb, -- Store extra metadata like related IDs
    "created_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."notifications" enable row level security;

-- Policies
drop policy if exists "Users can view own notifications" on "public"."notifications";
drop policy if exists "Users can update own notifications" on "public"."notifications";
drop policy if exists "System can insert notifications" on "public"."notifications";

create policy "Users can view own notifications" 
on "public"."notifications" for select 
using (auth.uid() = user_id);

create policy "Users can update own notifications" 
on "public"."notifications" for update 
using (auth.uid() = user_id);

-- Depending on your setup, you might want to allow anyone to insert if they are sending a message, 
-- or restrict it. For now, we'll keep insertion properly secured or open for specific triggers.
-- Usually, app logic handles insertion with service role, but for client-side triggered notifs (like messages):
create policy "Authenticated users can insert notifications" 
on "public"."notifications" for insert 
with check (auth.role() = 'authenticated');
