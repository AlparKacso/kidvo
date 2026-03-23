ALTER TABLE listings ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'month' CHECK (pricing_type IN ('month', 'session'));
