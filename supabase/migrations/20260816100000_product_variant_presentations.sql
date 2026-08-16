-- ============================================================
-- Migration: 20260816100000_product_variant_presentations.sql
-- Purpose: Add presentation-specific pricing fields to product_variants
--          so each variant/presentation can have its own COP and CRC price.
--
-- Changes:
--   product_variants.price_cop  NUMERIC(10,2) — Colombia price for this presentation
--   product_variants.price_crc  NUMERIC(10,2) — Costa Rica price for this presentation
--   product_variants.weight_label TEXT         — display label e.g. "3.5 g"
--
-- Rules:
--   - All columns are nullable (existing rows are unaffected)
--   - price_modifier remains for backward compatibility (not removed)
--   - No existing data is deleted or modified
-- ============================================================

-- Add price_cop to product_variants (nullable, no default)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_variants'
      AND column_name  = 'price_cop'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN price_cop NUMERIC(10,2);
  END IF;
END;
$$;

-- Add price_crc to product_variants (nullable, no default)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_variants'
      AND column_name  = 'price_crc'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN price_crc NUMERIC(10,2);
  END IF;
END;
$$;

-- Add weight_label to product_variants (nullable text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_variants'
      AND column_name  = 'weight_label'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN weight_label TEXT;
  END IF;
END;
$$;
