-- Push notification device tokens (iOS APNs; Android reserved for a later release)
CREATE TABLE IF NOT EXISTS device_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT,
  platform TEXT NOT NULL DEFAULT 'ios',
  locale TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens (user_id);
