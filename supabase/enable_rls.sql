-- ================================================================
-- RLS MIGRATION: Enable Row Level Security on all public tables
-- Run once in Supabase SQL Editor.
-- ================================================================

-- ----------------------------------------------------------------
-- Helper: non-recursive admin check
-- Uses SECURITY DEFINER so it bypasses RLS on the users table
-- when checking the caller's own row.
-- ----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  )
$$;

-- ================================================================
-- 1. users
-- ================================================================
alter table public.users enable row level security;

-- Own profile
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- Admins can read all users (needed for admin dashboard role lookup)
create policy "users_select_admin"
  on public.users for select
  using (public.is_admin());

-- ================================================================
-- 2. listings
-- (INSERT / UPDATE / DELETE policies already exist — adding SELECT)
-- ================================================================
alter table public.listings enable row level security;

-- Anyone can browse active listings
create policy "listings_select_active"
  on public.listings for select
  using (status = 'active');

-- Providers can see their own listings in any status
create policy "listings_select_own_provider"
  on public.listings for select
  using (
    exists (
      select 1 from public.providers p
      where p.id = listings.provider_id
        and p.user_id = auth.uid()
    )
  );

-- Admins can see all listings
create policy "listings_select_admin"
  on public.listings for select
  using (public.is_admin());

-- ================================================================
-- 3. trial_requests
-- (parents_insert_trial_requests + parents_own_trial_requests exist)
-- ================================================================
alter table public.trial_requests enable row level security;

-- Providers can view trial requests for their own listings
create policy "trial_requests_select_provider"
  on public.trial_requests for select
  using (
    exists (
      select 1 from public.listings l
      join public.providers p on p.id = l.provider_id
      where l.id = trial_requests.listing_id
        and p.user_id = auth.uid()
    )
  );

-- Providers can update (confirm / reject) trial requests for their listings
create policy "trial_requests_update_provider"
  on public.trial_requests for update
  using (
    exists (
      select 1 from public.listings l
      join public.providers p on p.id = l.provider_id
      where l.id = trial_requests.listing_id
        and p.user_id = auth.uid()
    )
  );

-- Admins can see all trial requests (platform-wide stats)
create policy "trial_requests_select_admin"
  on public.trial_requests for select
  using (public.is_admin());

-- ================================================================
-- 4. children
-- ================================================================
alter table public.children enable row level security;

create policy "children_all_own"
  on public.children for all
  using (auth.uid() = user_id);

-- ================================================================
-- 5. areas  (public reference data)
-- ================================================================
alter table public.areas enable row level security;

create policy "areas_select_public"
  on public.areas for select
  using (true);

-- ================================================================
-- 6. categories  (public reference data)
-- ================================================================
alter table public.categories enable row level security;

create policy "categories_select_public"
  on public.categories for select
  using (true);

-- ================================================================
-- 7. child_interests
-- ================================================================
alter table public.child_interests enable row level security;

create policy "child_interests_all_own"
  on public.child_interests for all
  using (
    exists (
      select 1 from public.children c
      where c.id = child_interests.child_id
        and c.user_id = auth.uid()
    )
  );

-- ================================================================
-- 8. saves
-- ================================================================
alter table public.saves enable row level security;

create policy "saves_all_own"
  on public.saves for all
  using (auth.uid() = user_id);

-- ================================================================
-- 9. listing_schedules
-- ================================================================
alter table public.listing_schedules enable row level security;

-- Anyone can read schedules (needed for browse + listing detail)
create policy "listing_schedules_select_public"
  on public.listing_schedules for select
  using (true);

-- Providers can manage schedules for their own listings
create policy "listing_schedules_write_own"
  on public.listing_schedules for all
  using (
    exists (
      select 1 from public.listings l
      join public.providers p on p.id = l.provider_id
      where l.id = listing_schedules.listing_id
        and p.user_id = auth.uid()
    )
  );

-- ================================================================
-- 10. listing_views
-- ================================================================
alter table public.listing_views enable row level security;

-- Anyone can record a view, but must not spoof another user's identity:
-- authenticated users must use their own user_id; anonymous must use NULL.
create policy "listing_views_insert_public"
  on public.listing_views for insert
  with check (user_id is null or user_id = auth.uid());

-- Providers can read views for their own listings (analytics page)
create policy "listing_views_select_provider"
  on public.listing_views for select
  using (
    exists (
      select 1 from public.listings l
      join public.providers p on p.id = l.provider_id
      where l.id = listing_views.listing_id
        and p.user_id = auth.uid()
    )
  );

-- Admins can read all views (platform-wide stats)
create policy "listing_views_select_admin"
  on public.listing_views for select
  using (public.is_admin());

-- ================================================================
-- 11. tips  (static provider tips, public read)
-- ================================================================
alter table public.tips enable row level security;

create policy "tips_select_public"
  on public.tips for select
  using (true);

-- ================================================================
-- 12. providers
-- ================================================================
alter table public.providers enable row level security;

-- Provider profiles are public (shown on listing detail pages)
create policy "providers_select_public"
  on public.providers for select
  using (true);

-- Providers can create their own profile (on signup)
create policy "providers_insert_own"
  on public.providers for insert
  with check (auth.uid() = user_id);

-- Providers can update their own profile
create policy "providers_update_own"
  on public.providers for update
  using (auth.uid() = user_id);
