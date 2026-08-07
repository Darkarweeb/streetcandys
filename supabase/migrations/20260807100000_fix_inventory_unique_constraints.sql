-- ============================================================
-- Migration: 20260807100000_fix_inventory_unique_constraints.sql
-- Fix: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Root cause: upsert_product_inventory uses two ON CONFLICT clauses:
--   1. ON CONFLICT (product_id, variant_id)          — for variant rows
--   2. ON CONFLICT (product_id) WHERE variant_id IS NULL — for base-product rows
-- Neither constraint existed on the inventory table (only a PK on id).
-- This migration adds both missing constraints.
-- ============================================================

-- Constraint 1: unique (product_id, variant_id) for variant inventory rows
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_product_id_variant_id_key
  UNIQUE (product_id, variant_id);

-- Constraint 2: partial unique index for base-product rows (variant_id IS NULL)
-- ON CONFLICT with a WHERE clause requires a matching partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_product_id_no_variant_idx
  ON public.inventory (product_id)
  WHERE variant_id IS NULL;
