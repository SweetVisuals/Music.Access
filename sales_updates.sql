-- Create purchases table if it doesn't exist
create table if not exists "public"."purchases" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid references "public"."users"("id"), -- Buyer (references public profile)
    "seller_id" uuid references "public"."users"("id"), -- Seller (references public profile)
    "item" text not null, -- Title of the item
    "amount" numeric not null,
    "status" text not null default 'Processing', -- 'Completed', 'Processing', 'Failed'
    "type" text not null, -- 'Beat License', 'Sound Kit', 'Mixing', 'Service'
    "project_id" uuid references "public"."projects"("id"),
    "created_at" timestamp with time zone default now(),
    "image_url" text,
    primary key ("id")
);

-- Enable RLS
alter table "public"."purchases" enable row level security;

-- Policies for purchases
drop policy if exists "Users can view their own purchases" on "public"."purchases";
create policy "Users can view their own purchases"
on "public"."purchases" for select
using (auth.uid() = user_id);

drop policy if exists "Sellers can view sales of their items" on "public"."purchases";
create policy "Sellers can view sales of their items"
on "public"."purchases" for select
using (auth.uid() = seller_id);

drop policy if exists "Users can insert purchases" on "public"."purchases";
create policy "Users can insert purchases"
on "public"."purchases" for insert
with check (auth.uid() = user_id);

-- Reload config
notify pgrst, 'reload config';
