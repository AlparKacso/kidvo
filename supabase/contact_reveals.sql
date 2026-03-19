-- ── contact_reveals table ──────────────────────────────────────────────────
-- Tracks when a logged-in parent reveals provider contact details.
-- Powers the Views → Contact Reveals → Trial Requests funnel in analytics.

CREATE TABLE IF NOT EXISTS contact_reveals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID        NOT NULL REFERENCES listings(id)    ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY;

-- Authenticated parents can insert their own reveal events
CREATE POLICY "users_insert_own_contact_reveals"
  ON contact_reveals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Providers can read reveals for their own listings
CREATE POLICY "providers_read_contact_reveals"
  ON contact_reveals FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN   providers p ON p.id = l.provider_id
      WHERE  p.user_id = auth.uid()
    )
  );
