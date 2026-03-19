-- All neighbourhoods and nearby communes for Timișoara.
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING.

INSERT INTO areas (name, slug) VALUES
  -- City neighbourhoods
  ('Centru',                  'centru'),
  ('Fabric',                  'fabric'),
  ('Iosefin',                 'iosefin'),
  ('Freidorf',                'freidorf'),
  ('Elisabetin',              'elisabetin'),
  ('Mehala',                  'mehala'),
  ('Ronaț',                   'ronat'),
  ('Calea Lipovei',           'calea-lipovei'),
  ('Calea Șagului',           'calea-sagului'),
  ('Dacia',                   'dacia'),
  ('Torontal',                'torontal'),
  ('Complexul Studențesc',    'complexul-studentesc'),
  ('Circumvalațiunii',        'circumvalatiunii'),
  ('Dorobanților',            'dorobantilor'),
  ('Take Ionescu',            'take-ionescu'),
  ('Olimpia',                 'olimpia'),
  ('Lunei',                   'lunei'),
  ('Steaua',                  'steaua'),
  ('Plopi',                   'plopi'),
  ('Bega',                    'bega'),
  ('Fratelia',                'fratelia'),
  ('Calea Aradului',          'calea-aradului'),
  ('Ghiroda Nouă',            'ghiroda-noua'),
  -- Suburbs / communes
  ('Dumbrăvița',              'dumbravita'),
  ('Ghiroda',                 'ghiroda'),
  ('Giroc',                   'giroc'),
  ('Chișoda',                 'chisoda'),
  ('Moșnița Nouă',            'mosnita-noua'),
  ('Sânandrei',               'sanandrei'),
  ('Săcălaz',                 'sacalaz')
ON CONFLICT (slug) DO NOTHING;
