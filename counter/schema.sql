-- kidvo's play counter: one row per game per day (UTC). Nothing here is about one visitor:
-- no IP address, no browser, no time of day, no ID.
CREATE TABLE IF NOT EXISTS plays (
  day     TEXT    NOT NULL,             -- 2026-11-20
  game    TEXT    NOT NULL,             -- the app id, e.g. maze
  opens   INTEGER NOT NULL DEFAULT 0,   -- times the game was opened
  reports INTEGER NOT NULL DEFAULT 0,   -- stretches of play reported (an open, or coming back to the tab)
  seconds INTEGER NOT NULL DEFAULT 0,   -- seconds the game was on screen
  rounds  INTEGER NOT NULL DEFAULT 0,   -- rounds finished
  m0      INTEGER NOT NULL DEFAULT 0,   -- stretches under 1 minute
  m1      INTEGER NOT NULL DEFAULT 0,   -- 1 to 5 minutes
  m5      INTEGER NOT NULL DEFAULT 0,   -- 5 to 15 minutes
  m15     INTEGER NOT NULL DEFAULT 0,   -- 15 minutes or more
  PRIMARY KEY (day, game)
);
