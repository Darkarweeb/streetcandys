-- Migration: Add price_cop (Colombia COP) column to products table
-- Backward compatible: nullable column with no default constraint

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_cop numeric(12, 2) DEFAULT NULL;

COMMENT ON COLUMN public.products.price_cop IS 'Precio en pesos colombianos (COP)';
