-- Introduce the "Health" category.
-- Idempotent AND drift-safe: places Health just before "Other" without
-- renumbering any existing rows (the live DB has extra categories and uses
-- sort_order 9999 for "Other", so a hardcoded order would misplace it).

INSERT INTO categories (name, slug, accent_color, sort_order)
SELECT 'Health', 'health', '#ef4444',
       COALESCE((SELECT sort_order FROM categories WHERE slug = 'other'), 100) - 1
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT name, slug, accent_color, sort_order FROM categories ORDER BY sort_order;
