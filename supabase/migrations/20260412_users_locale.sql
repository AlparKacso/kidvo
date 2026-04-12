-- Add locale column to users table for locale-aware emails.
-- Default 'ro' matches the app's default locale.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.users ADD COLUMN locale TEXT NOT NULL DEFAULT 'ro';
    ALTER TABLE public.users ADD CONSTRAINT users_locale_check CHECK (locale IN ('ro', 'en'));
  END IF;
END $$;
