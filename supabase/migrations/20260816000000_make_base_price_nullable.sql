-- Migration: Make products.base_price nullable
-- Reason: The Product Editor no longer sends base_price (USD pricing removed).
--         The column must accept NULL so new products can be created with only
--         price_cop (COP) and price_crc (CRC) without a base_price value.
--
-- What this migration does:
--   - Drops the NOT NULL constraint on products.base_price
--   - Does NOT delete the column (legacy data preserved)
--   - Does NOT modify existing base_price values
--   - Does NOT change price_cop, price_crc, or any other column
--   - The existing CHECK (base_price >= 0) remains valid:
--     PostgreSQL evaluates NULL >= 0 as NULL (not FALSE), so NULL passes the check.

ALTER TABLE public.products
  ALTER COLUMN base_price DROP NOT NULL;
