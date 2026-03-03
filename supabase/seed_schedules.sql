-- Seed listing_schedules for all listings that currently have no schedule rows.
-- Assigns one of 6 realistic two-slot weekly patterns, cycling by row number.
--
-- day_of_week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
--
-- Pattern overview (2 slots each):
--   0 → Mon 16:00-17:00  + Wed 16:00-17:00
--   1 → Tue 17:00-18:00  + Thu 17:00-18:00
--   2 → Mon 15:30-16:30  + Sat 10:00-11:00
--   3 → Sat 09:00-10:00  + Sat 10:30-11:30
--   4 → Wed 18:00-19:00  + Sat 11:00-12:00
--   5 → Mon 16:00-17:30  + Thu 16:00-17:30

INSERT INTO listing_schedules (listing_id, day_of_week, time_start, time_end)
SELECT s.listing_id, s.day_of_week, s.time_start, s.time_end
FROM (
  WITH unscheduled AS (
    SELECT
      id AS listing_id,
      (ROW_NUMBER() OVER (ORDER BY created_at) - 1) % 6 AS pattern
    FROM listings
    WHERE id NOT IN (SELECT DISTINCT listing_id FROM listing_schedules)
  )
  SELECT u.listing_id, p.day_of_week, p.time_start, p.time_end
  FROM unscheduled u
  JOIN (
    VALUES
      -- pattern 0
      (0, 1, '16:00', '17:00'),
      (0, 3, '16:00', '17:00'),
      -- pattern 1
      (1, 2, '17:00', '18:00'),
      (1, 4, '17:00', '18:00'),
      -- pattern 2
      (2, 1, '15:30', '16:30'),
      (2, 6, '10:00', '11:00'),
      -- pattern 3
      (3, 6, '09:00', '10:00'),
      (3, 6, '10:30', '11:30'),
      -- pattern 4
      (4, 3, '18:00', '19:00'),
      (4, 6, '11:00', '12:00'),
      -- pattern 5
      (5, 1, '16:00', '17:30'),
      (5, 4, '16:00', '17:30')
  ) AS p (pattern, day_of_week, time_start, time_end)
  ON u.pattern = p.pattern
) s;

-- Verify: listings still without any schedule after the insert
SELECT id, title, status
FROM listings
WHERE id NOT IN (SELECT DISTINCT listing_id FROM listing_schedules)
ORDER BY created_at;
