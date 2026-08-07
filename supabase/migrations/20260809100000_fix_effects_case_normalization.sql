-- ============================================================
-- Fix Effects Case Normalization
-- Normalizes all existing product effects to lowercase
-- so they match the case-insensitive filtering logic
-- ============================================================

-- Normalize all existing effects in products table to lowercase
UPDATE public.products
SET effects = (
  SELECT array_agg(lower(e))
  FROM unnest(effects) AS e
)
WHERE effects IS NOT NULL AND array_length(effects, 1) > 0;

-- Normalize all existing tags in products table to lowercase
UPDATE public.products
SET tags = (
  SELECT array_agg(lower(t))
  FROM unnest(tags) AS t
)
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- Create index on effects for faster array overlap queries
CREATE INDEX IF NOT EXISTS idx_products_effects ON public.products USING gin(effects);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING gin(tags);
