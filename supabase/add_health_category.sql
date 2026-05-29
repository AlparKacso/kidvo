-- Introduce the "Health" category (Sănătate).
-- Inserted before "Altele/Other" in the sort order. Idempotent.

INSERT INTO categories (name, slug, accent_color, sort_order) VALUES
  ('Sănătate', 'health', '#ef4444', 8)
ON CONFLICT (slug) DO NOTHING;

-- Keep "Other" last.
UPDATE categories SET sort_order = 9 WHERE slug = 'other';

-- Verify
SELECT name, slug, accent_color, sort_order FROM categories ORDER BY sort_order;
