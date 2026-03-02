-- ============================================================
-- Test data: 40 listings + assign provider for testing
-- Provider: alpar.kacso+2@gmail.com (must already have an account)
--
-- Run in Supabase SQL editor.
-- ============================================================

-- Step 1: Ensure provider record exists for alpar.kacso+2@gmail.com
INSERT INTO providers (user_id, display_name, bio, contact_email, plan, verified)
SELECT
  u.id,
  'Kidvo Demo',
  'Demo provider used for platform testing and showcasing.',
  'alpar.kacso+2@gmail.com',
  'featured',
  true
FROM users u
WHERE u.email = 'alpar.kacso+2@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET plan = 'featured', verified = true;

-- Step 2: Reassign ALL existing listings to this provider
UPDATE listings
SET provider_id = (
  SELECT p.id FROM providers p
  JOIN users u ON u.id = p.user_id
  WHERE u.email = 'alpar.kacso+2@gmail.com'
);

-- Step 3: Insert 40 new test listings
INSERT INTO listings (
  provider_id, category_id, area_id,
  title, description,
  age_min, age_max, price_monthly,
  spots_total, spots_available,
  address, language, includes,
  trial_available, featured, status
)
SELECT
  (SELECT p.id FROM providers p JOIN users u ON u.id = p.user_id WHERE u.email = 'alpar.kacso+2@gmail.com'),
  c.id,
  a.id,
  t.title, t.description,
  t.age_min::int, t.age_max::int, t.price_monthly::int,
  t.spots_total::int, t.spots_available::int,
  t.address, t.language, t.includes,
  t.trial_available::bool, t.featured::bool,
  t.status::listing_status
FROM (VALUES
  -- Sport (5)
  ('sport','Centru',       'Fotbal junior',            'Antrenamente de fotbal cu accent pe tehnică și joc de echipă. Antrenori licențiați UEFA.',                      6,12,180,16,14,'Str. Sportivilor 12',          'Romanian',ARRAY['echipament inclus','apă'],              true,false,'active'),
  ('sport','Fabric',       'Baschet copii',             'Coordonare, echipă și ritm. Baschet pentru toate nivelurile, de la prima minge.',                              8,14,160,12,10,'Str. Mureș 5',                 'Romanian',ARRAY['minge inclusă'],                       true,false,'active'),
  ('sport','Mehala',       'Tenis de câmp',             'Lecții individuale și în grup pentru începători și intermediari. Teren acoperit.',                               6,16,250, 8, 6,'Str. Odobescu 22',             'Romanian',ARRAY['rachetă disponibilă','mingi incluse'],  true, true,'active'),
  ('sport','Dumbrăvița',   'Karate Shotokan',           'Karate tradițional cu instructori certificați. Disciplină, concentrare și respect.',                            5,15,140,20,18,'Bd. Dumbrăvița 8',             'Romanian',ARRAY['kimono inclus'],                       true,false,'active'),
  ('sport','Giroc',        'Volei copii',               'Antrenamente de volei într-o atmosferă prietenoasă, pentru toate nivelurile.',                                   9,16,130,14,12,'Str. Principală 3, Giroc',     'Romanian',ARRAY['echipament disponibil'],               true,false,'active'),

  -- Dance (4)
  ('dance','Centru',       'Dans contemporan',          'Jazz, hip-hop și dans modern într-un curs energic și creativ pentru copii și adolescenți.',                      7,16,200,15,13,'Str. Alba Iulia 18',           'Romanian',ARRAY['sală cu oglinzi'],                    true,false,'active'),
  ('dance','Fabric',       'Balet clasic',              'Poziții de bază, grație și expresivitate artistică. Primul pas spre lumea baletului.',                            5,12,220,12,10,'Str. Fabric 44',               'Romanian',ARRAY['bară de balet','sală climatizată'],   true, true,'active'),
  ('dance','Mehala',       'Hip-hop kids',              'Ritm, energie și creativitate. Cel mai popular stil de dans printre copii și adolescenți.',                       8,16,180,18,15,'Str. Mehala 7',                'Romanian',ARRAY['sesiuni video','spectacol final an'], true,false,'active'),
  ('dance','Dumbrăvița',   'Zumba kids',                'Dans aerobic cu ritmuri latino, perfect pentru copiii activi care adoră mișcarea.',                               6,13,150,20,17,'Str. Trandafirilor 2',         'Romanian',ARRAY['părinți pot asista'],                 true,false,'active'),

  -- Music (5)
  ('music','Centru',       'Pian pentru începători',   'De la notele de bază până la primele piese. Lecții individuale pe pian Yamaha.',                                  5,14,280, 6, 5,'Str. Mercy 9',                 'Romanian',ARRAY['pian Yamaha','note incluse'],          true,false,'active'),
  ('music','Fabric',       'Chitară clasică',           'Chitară pentru copii și adolescenți, de la zero la nivel avansat. Ritm și melodie.',                              8,17,240, 8, 7,'Str. Timis 14',                'Romanian',ARRAY['chitară disponibilă','tabulatură'],   true,false,'active'),
  ('music','Mehala',       'Tobe și percuție',          'Cursuri de tobe pentru energicii pasionați de muzică ritmică. Seturi profesionale.',                              7,16,260, 4, 4,'Str. Odobescu 11',             'Romanian',ARRAY['seturi complete','căști anti-zgomot'],true,false,'active'),
  ('music','Giroc',        'Cor copii',                 'Cor de copii cu repertoriu variat: cântece tradiționale, colinde și muzică modernă.',                              6,14,120,25,20,'Str. Morii 4, Giroc',          'Romanian',ARRAY['partituri incluse','concerte trimestriale'],true,false,'active'),
  ('music','Dumbrăvița',   'Vioară Suzuki',             'Metoda Suzuki: copiii învață muzica așa cum învață să vorbească — prin ascultare și repetiție.',                  4,10,300, 8, 6,'Bd. Dumbrăvița 22',            'Romanian',ARRAY['vioară de împrumut','CD-uri Suzuki'],  true, true,'active'),

  -- Arts (4)
  ('arts','Centru',        'Pictură și desen',          'Atelier creativ cu tehnici diverse: acuarelă, acrilice, cărbune. Materiale incluse.',                             5,14,160,12,10,'Str. G-ral Dragalina 3',       'Romanian',ARRAY['materiale incluse','expoziție trimestrială'],true,false,'active'),
  ('arts','Fabric',        'Ceramică copii',            'Modelare în lut și ceramică. Copiii își creează propriile obiecte de artă și le ard în cuptor.',                  6,14,180,10, 9,'Str. Popa Șapca 7',            'Romanian',ARRAY['lut inclus','ardere în cuptor'],       true,false,'active'),
  ('arts','Mehala',        'Ilustrație și manga',       'Desen, manga și ilustrație digitală pentru pasionații de artă vizuală și animație.',                              9,17,170,10, 8,'Str. Calea Torontalului 5',    'Romanian',ARRAY['materiale desen incluse'],             true,false,'active'),
  ('arts','Freidorf',      'Sculptură și modelaj',      'Sculptură în argilă, ghips și pastă de modelat. Explorare, creativitate și răbdare.',                             7,15,190, 8, 7,'Str. Freidorf 18',             'Romanian',ARRAY['toate materialele incluse'],           true,false,'active'),

  -- Coding (4)
  ('coding','Centru',      'Scratch programming',       'Copiii creează jocuri și animații cu Scratch. Introducere în logica de programare.',                              7,12,220,10, 9,'Str. Michelangelo 2',          'Romanian',ARRAY['laptop asigurat','platformă inclusă'],  true, true,'active'),
  ('coding','Fabric',      'Python pentru copii',       'Python adaptat pentru copii cu interes pentru logică, matematică și rezolvare de probleme.',                     10,16,250, 8, 7,'Str. Tinctoarilor 3',          'Romanian',ARRAY['resurse online incluse'],              true,false,'active'),
  ('coding','Dumbrăvița',  'Robotică LEGO',             'Construire și programare de roboți cu seturi LEGO Education. Știință, distracție și echipă.',                     8,14,280, 8, 8,'Bd. Dumbrăvița 15',            'Romanian',ARRAY['seturi LEGO incluse'],                 true, true,'active'),
  ('coding','Giroc',       'Web design pentru tineri',  'HTML, CSS și primii pași în web development. Copiii pleacă acasă cu prima lor pagină web.',                      12,17,230, 8, 6,'Str. Principală 9, Giroc',     'Romanian',ARRAY['laptop recomandat','hosting gratuit'],true,false,'active'),

  -- Gymnastics (3)
  ('gymnastics','Centru',       'Gimnastică artistică',  'Acrobații, echilibru și eleganță pe ritmul muzicii. Sală dotată profesional.',                                   4,12,200,14,12,'Str. Circumvalațiunii 8',      'Romanian',ARRAY['echipament asigurat'],                true,false,'active'),
  ('gymnastics','Mehala',       'Gimnastică ritmică',    'Bandă, minge și cerc — combinație de sport și artă pentru micile gimnaste.',                                     5,14,210,12,11,'Str. Crizantemelor 4',         'Romanian',ARRAY['aparate incluse'],                    true,false,'active'),
  ('gymnastics','Fabric',       'Trambulină copii',      'Sărituri și acrobații pe trambulină profesională. Energie, curaj și distracție garantată.',                       4,13,190,10, 9,'Str. Calea Buziaşului 6',      'Romanian',ARRAY['trambulină pro','saltele protecție'], true,false,'active'),

  -- Languages (5)
  ('languages','Centru',        'Engleză pentru copii',  'Engleză interactivă și fun. Vocabular, gramatică și conversație prin jocuri și povești.',                        5,12,200,12,10,'Str. Piața Victoriei 3',       'Romanian',ARRAY['manuale incluse','app vocabular'],    true, true,'active'),
  ('languages','Fabric',        'Germană copii',          'Cursuri de germană pentru începători. Ideal pentru familii cu conexiuni în spațiul german.',                     6,14,220,10, 9,'Str. Tipografilor 11',         'Romanian',ARRAY['materiale incluse'],                  true,false,'active'),
  ('languages','Mehala',        'Franceză pentru juni',   'Bonjour! Franceză interactivă prin jocuri, cântece și conversație zilnică.',                                     7,15,210,10, 8,'Str. Petru Rareș 6',           'Romanian',ARRAY['carte franceză','worksheets'],        true,false,'active'),
  ('languages','Dumbrăvița',    'Spaniolă copii',         'Hola! Spaniolă prin jocuri, muzică și conversație. Cel mai rapid mod de a învăța.',                              6,14,200,12,11,'Str. Luncii 2, Dumbrăvița',    'Romanian',ARRAY['materiale incluse'],                  true,false,'active'),
  ('languages','Giroc',         'Engleză bilingvă',       'Program intensiv bilingv. Copiii devin fluenți prin imersiune totală în engleză.',                               5,13,260,10, 8,'Str. Principală 14, Giroc',    'English', ARRAY['cărți bilingve','media engleză'],    true, true,'active'),

  -- Chess (3)
  ('chess','Centru',       'Șah pentru copii',          'De la debut la avansat. Antrenamente cu jucători cu experiență și participare la turnee.',                         6,16,150,15,13,'Str. 1 Decembrie 1918 nr.4',   'Romanian',ARRAY['șah inclus','acces turnee locale'],  true,false,'active'),
  ('chess','Fabric',       'Club șah Fabric',           'Antrenamente și meciuri amicale săptămânale pentru pasionații de șah din cartier.',                                7,17,130,20,16,'Str. Olarilor 3',              'Romanian',ARRAY['piese și tablă incluse'],              true,false,'active'),
  ('chess','Dumbrăvița',   'Șah online și clasic',      'Lecții combinate față în față și pe Chess.com. Modern, eficient și accesibil.',                                   8,16,160,10, 9,'Bd. Dumbrăvița 33',            'Romanian',ARRAY['cont Chess.com inclus'],               true,false,'active'),

  -- Babysitting (3)
  ('babysitting','Centru',      'Afterschool Centru',     'Teme, activități creative și gustare inclusă. Program complet pentru copiii școlari.',                           6,12,350,15,12,'Str. Mărășești 5',             'Romanian',ARRAY['gustare','ajutor teme','activități'], true,false,'active'),
  ('babysitting','Fabric',      'Mini club Fabric',       'Îngrijire și activități pentru copii mici într-un spațiu sigur, luminos și primitor.',                            2, 6,400, 8, 6,'Str. Doja 14',                 'Romanian',ARRAY['spațiu joacă','masă inclusă'],         true,false,'active'),
  ('babysitting','Dumbrăvița',  'Afterschool bilingv',    'Activități în română și engleză, teme și snack. Program complet pentru părinți activi.',                         6,12,380,12,10,'Str. Rozelor 7, Dumbrăvița',   'English', ARRAY['gustare','activități engleză'],        true, true,'active'),

  -- Other (4)
  ('other','Centru',       'Gătit pentru copii',        'Atelier culinar pentru micii bucătari. Rețete simple, sigure și delicioase. Ingrediente incluse.',                 7,14,200,10, 9,'Str. Eftimie Murgu 8',         'Romanian',ARRAY['ingrediente incluse','șorț'],          true,false,'active'),
  ('other','Fabric',       'Teatru copii',              'Improvizație, expresie și prezență scenică. Spectacol de final de an în fața părinților.',                          6,15,170,14,12,'Str. G-ral Dragalina 2',       'Romanian',ARRAY['costume disponibile','spectacol'],    true,false,'active'),
  ('other','Mehala',       'Natură și ecologie',        'Clubul micilor naturaliști: experimente, plante, animale și drumeții trimestriale.',                                 5,12,150,15,13,'Str. Oituz 3',                 'Romanian',ARRAY['echipament oferit','excursii'],        true,false,'active'),
  ('other','Giroc',        'Magie și iluzionism',       'Trucuri, iluzii și spectacole de magie pentru copiii curioși și îndemânatici.',                                    8,16,180,10, 9,'Str. Principală 22, Giroc',    'Romanian',ARRAY['kit magie inclus'],                   true,false,'active')
) AS t(cat_slug, area_name, title, description, age_min, age_max, price_monthly,
        spots_total, spots_available, address, language, includes,
        trial_available, featured, status)
JOIN categories c ON c.slug  = t.cat_slug
JOIN areas      a ON a.name  = t.area_name;
