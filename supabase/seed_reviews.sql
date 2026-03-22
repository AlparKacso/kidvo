-- Seed fictive approved reviews for all listings.
-- Uses the admin/parent account as the reviewer (one review per listing).
-- Ratings skew 4–5 stars with occasional 3s; comments rotate through 20 Romanian phrases.
-- Set status = 'approved' so they're immediately visible (no moderation needed).

WITH reviewer AS (
  SELECT id FROM public.users
  WHERE email = 'alpar.kacso@gmail.com'
  LIMIT 1
),
listing_data AS (
  SELECT
    l.id            AS listing_id,
    l.provider_id,
    ROW_NUMBER() OVER (ORDER BY l.created_at) - 1 AS rn
  FROM listings l
)
INSERT INTO reviews (user_id, listing_id, provider_id, rating, comment, status, created_at)
SELECT
  r.id AS user_id,
  ld.listing_id,
  ld.provider_id,
  CASE (ld.rn % 5)
    WHEN 0 THEN 5
    WHEN 1 THEN 5
    WHEN 2 THEN 4
    WHEN 3 THEN 4
    WHEN 4 THEN 3
  END AS rating,
  (ARRAY[
    'Copilul meu adoră activitățile de aici! Profesorii sunt foarte răbdători și pasionați.',
    'Experiență minunată, recomand cu căldură oricărui părinte!',
    'Atmosferă prietenoasă și activități bine structurate. Suntem foarte mulțumiți.',
    'Fiul meu abia așteaptă fiecare sesiune. Instructor excelent!',
    'Calitate bună pentru prețul cerut. Profesorul este atent cu fiecare copil.',
    'Am văzut progrese rapide după câteva luni. Foarte recomandat!',
    'Locul ideal pentru copii curioși. Activitățile sunt creative și captivante.',
    'Fetița mea și-a făcut prieteni noi și a câștigat mult mai multă încredere în sine.',
    'Profesorul explică foarte bine și are multă răbdare cu cei mici.',
    'Super experiență! Copiii se simt în siguranță și bine îngrijiți.',
    'O activitate care merită fiecare ban. Recomand cu căldură!',
    'Băiatul meu s-a dezvoltat enorm de când a început. Suntem mulțumiți de progrese.',
    'Instructor dedicat și profesionist. Copilul nostru adoră să meargă în fiecare săptămână!',
    'Activități adaptate nivelului fiecăruia — exact ce căutam pentru copilul nostru.',
    'Grup mic și atenție personalizată. O alegere excelentă pentru orice copil.',
    'Foarte organizat și profesionist. Ne-am simțit bineveniți încă de la prima ședință.',
    'Copilul meu a progresat vizibil în câteva luni. Mulțumim din suflet!',
    'Activitate structurată, copii fericiți. Ce-ți poți dori mai mult?',
    'Recomand tuturor părinților din zonă. O investiție excelentă pentru viitorul copiilor!',
    'Locul în care copiii cresc și se bucură în același timp. Îl recomandăm cu drag!'
  ])[(ld.rn % 20) + 1] AS comment,
  'approved'                                        AS status,
  NOW() - (random() * interval '90 days')           AS created_at
FROM listing_data ld, reviewer r
ON CONFLICT (user_id, listing_id) DO NOTHING;
