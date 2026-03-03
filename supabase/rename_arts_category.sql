-- Rename "Arts" to "Arts & Crafts" to avoid confusion with Music and Dance
UPDATE categories SET name = 'Arts & Crafts' WHERE name = 'Arts';

-- Verify
SELECT name, slug FROM categories ORDER BY name;
