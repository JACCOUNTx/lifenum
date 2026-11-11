-- Apple App Store subscription identifiers
ALTER TABLE subscriptions ADD COLUMN apple_original_transaction_id TEXT;
ALTER TABLE subscriptions ADD COLUMN apple_product_id TEXT;
