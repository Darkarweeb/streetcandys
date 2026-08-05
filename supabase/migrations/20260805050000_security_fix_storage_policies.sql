-- ============================================================
-- Street Candy — Security Fix: Remove permissive SELECT policies on storage buckets
-- Migration: 20260805050000_security_fix_storage_policies.sql
-- Risk: LOW
-- ============================================================
-- Pre-check confirmed: the app accesses images ONLY via getPublicUrl() (direct URL).
-- No storage.list() calls exist anywhere in the storefront or admin frontend.
-- Public buckets serve files by URL without needing a SELECT RLS policy.
-- These two policies are redundant and expose the bucket listing to anyone.
-- ============================================================

-- Remove the permissive SELECT policy on product-images bucket
-- (policy name: product_images_public_read)
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;

-- Remove the permissive SELECT policy on review-photos bucket
-- (policy name: review_photos_public_read)
DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;

-- Note: The buckets remain PUBLIC. Files are still accessible via their
-- public URL (getPublicUrl). Only the ability to LIST bucket contents is removed.
-- Authenticated admin uploads/deletes are unaffected.
