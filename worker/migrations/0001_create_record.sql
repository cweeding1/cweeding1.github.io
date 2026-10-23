-- One row holding the all-time record of challengers against the site's team.
CREATE TABLE IF NOT EXISTS record (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO record (id) VALUES (1);
