-- Idempotency key for safe checkout retries; existing orders remain valid.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_token UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_token_unique
  ON orders (checkout_token) WHERE checkout_token IS NOT NULL;
