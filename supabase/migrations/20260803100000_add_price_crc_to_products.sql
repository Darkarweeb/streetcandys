-- ============================================================
-- Street Candy — Add price_crc to products
-- Migration: 20260803100000_add_price_crc_to_products.sql
-- Adds Costa Rica CRC pricing column to products table.
-- Rule: product visible in CR only if price_crc IS NOT NULL.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_crc NUMERIC(12,2) DEFAULT NULL;

-- Index for fast CR catalog queries (only products with CRC price)
CREATE INDEX IF NOT EXISTS idx_products_price_crc_not_null
  ON public.products (id)
  WHERE price_crc IS NOT NULL;
