-- Run this in Supabase SQL editor (after reviews.sql was already applied).
-- Adds moderation status to the reviews table.

alter table reviews
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));
