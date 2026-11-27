-- Rewarded-ad membership: 24 小時解鎖到期時間（Unix 秒）
ALTER TABLE users ADD COLUMN vip_expires_at INTEGER;
