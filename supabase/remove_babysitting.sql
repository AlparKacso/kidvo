-- Remove babysitting category from the platform
-- Run in Supabase SQL editor

-- First: reassign any listings that use the babysitting category to the 'other' category
UPDATE listings
SET category_id = (SELECT id FROM categories WHERE slug = 'other')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'babysitting');

-- Then: delete the babysitting category row
DELETE FROM categories WHERE slug = 'babysitting';
