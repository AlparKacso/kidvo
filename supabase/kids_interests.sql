ALTER TABLE children
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
