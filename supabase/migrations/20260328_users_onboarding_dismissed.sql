-- Add onboarding_dismissed flag to users table.
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean DEFAULT false;
