-- Run this in the Supabase SQL editor to add the reviews table.
-- Provider ratings: only parents with a confirmed trial can review a listing.

create table if not exists reviews (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references users(id)     on delete cascade,
  listing_id  uuid not null references listings(id)  on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now() not null,
  unique (user_id, listing_id)
);

-- RLS
alter table reviews enable row level security;

create policy "reviews are publicly readable"
  on reviews for select using (true);

create policy "users can insert their own reviews"
  on reviews for insert
  with check (auth.uid() = user_id);
