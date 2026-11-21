-- Daily readings published by the practitioner (editable without a new app build)
CREATE TABLE IF NOT EXISTS daily_content (
  date TEXT PRIMARY KEY,
  published INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_published ON daily_content (published, date);
