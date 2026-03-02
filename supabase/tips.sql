CREATE TABLE IF NOT EXISTS tips (
  id    serial PRIMARY KEY,
  body  text NOT NULL
);

INSERT INTO tips (body) VALUES
  ('When confirming a trial, reach out to parents by phone if you have their number — it shows care and increases show-up rates.'),
  ('Keep your listing photos updated seasonally. Fresh visuals attract significantly more views.'),
  ('Respond to trial requests within 2 hours. Parents often contact multiple providers and choose whoever replies first.'),
  ('Add a detailed schedule to your listing — parents want to know exactly when and where activities happen before committing.'),
  ('Encourage happy parents to leave a review after a trial. Social proof is your best marketing tool.'),
  ('Make sure your listing description answers: What will my child learn? What age is it best for? What should they bring?');
