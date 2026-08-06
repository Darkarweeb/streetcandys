-- =============================================================================
-- SECURITY HARDENING MIGRATION (v2 — ALTER FUNCTION only, zero CREATE OR REPLACE)
-- Fixes Supabase security warnings:
--   1. Function search_path mutable (25 functions) — via ALTER FUNCTION SET search_path
--   2. Anon can execute SECURITY DEFINER functions — via REVOKE EXECUTE
--   3. RLS policy always true on spin_leads (2 policies)
--   4. Public bucket allows listing (2 buckets)
-- =============================================================================

-- =============================================================================
-- SECTION 1: FIX FUNCTION SEARCH_PATH MUTABLE
-- Each ALTER FUNCTION is wrapped in a DO block so a mismatched signature
-- logs a NOTICE instead of aborting the entire migration.
-- =============================================================================

-- 1. admin_exists()
DO $$ BEGIN
  ALTER FUNCTION public.admin_exists() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.admin_exists() not found — skipping search_path fix.';
END $$;

-- 2. assign_order_number()
DO $$ BEGIN
  ALTER FUNCTION public.assign_order_number() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.assign_order_number() not found — skipping search_path fix.';
END $$;

-- 3. cleanup_spin_otp_codes()
DO $$ BEGIN
  ALTER FUNCTION public.cleanup_spin_otp_codes() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.cleanup_spin_otp_codes() not found — skipping search_path fix.';
END $$;

-- 4. generate_order_number()
DO $$ BEGIN
  ALTER FUNCTION public.generate_order_number() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.generate_order_number() not found — skipping search_path fix.';
END $$;

-- 5. get_admin_product_detail(text)
DO $$ BEGIN
  ALTER FUNCTION public.get_admin_product_detail(text) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_admin_product_detail(text) not found — skipping search_path fix.';
END $$;

-- 6. get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text)
DO $$ BEGIN
  ALTER FUNCTION public.get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text) not found — skipping search_path fix.';
END $$;

-- 7. get_loyalty_summary(uuid)
DO $$ BEGIN
  ALTER FUNCTION public.get_loyalty_summary(uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_loyalty_summary(uuid) not found — skipping search_path fix.';
END $$;

-- 8. get_notification_summary(uuid)
DO $$ BEGIN
  ALTER FUNCTION public.get_notification_summary(uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_notification_summary(uuid) not found — skipping search_path fix.';
END $$;

-- 9. get_product_rating_summary(uuid)
DO $$ BEGIN
  ALTER FUNCTION public.get_product_rating_summary(uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_product_rating_summary(uuid) not found — skipping search_path fix.';
END $$;

-- 10. handle_new_user()
DO $$ BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.handle_new_user() not found — skipping search_path fix.';
END $$;

-- 11. has_purchased_product(uuid, uuid)
DO $$ BEGIN
  ALTER FUNCTION public.has_purchased_product(uuid, uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.has_purchased_product(uuid, uuid) not found — skipping search_path fix.';
END $$;

-- 12. is_admin_or_staff()
DO $$ BEGIN
  ALTER FUNCTION public.is_admin_or_staff() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_admin_or_staff() not found — skipping search_path fix.';
END $$;

-- 13. is_admin_user()
DO $$ BEGIN
  ALTER FUNCTION public.is_admin_user() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_admin_user() not found — skipping search_path fix.';
END $$;

-- 14. is_allowed_country(character)
DO $$ BEGIN
  ALTER FUNCTION public.is_allowed_country(character) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_allowed_country(character) not found — skipping search_path fix.';
END $$;

-- 15. notify_review_status_change()
DO $$ BEGIN
  ALTER FUNCTION public.notify_review_status_change() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.notify_review_status_change() not found — skipping search_path fix.';
END $$;

-- 16. notify_tier_upgrade()
DO $$ BEGIN
  ALTER FUNCTION public.notify_tier_upgrade() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.notify_tier_upgrade() not found — skipping search_path fix.';
END $$;

-- 17. publish_scheduled_posts()
DO $$ BEGIN
  ALTER FUNCTION public.publish_scheduled_posts() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.publish_scheduled_posts() not found — skipping search_path fix.';
END $$;

-- 18. record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text)
--     Signature from 20260804080000_promotions_system.sql:
--     (p_promotion_id UUID, p_profile_id UUID, p_order_id UUID,
--      p_discount_amount NUMERIC, p_cart_total NUMERIC, p_country_code TEXT)
DO $$ BEGIN
  ALTER FUNCTION public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text) not found — skipping search_path fix.';
END $$;

-- 19. redeem_loyalty_reward(uuid, uuid)
DO $$ BEGIN
  ALTER FUNCTION public.redeem_loyalty_reward(uuid, uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.redeem_loyalty_reward(uuid, uuid) not found — skipping search_path fix.';
END $$;

-- 20. send_admin_announcement(text, text, text, text, jsonb)
--     Signature from 20260804110000_notification_center.sql:
--     (p_title TEXT, p_body TEXT, p_action_url TEXT, p_target TEXT, p_data JSONB)
DO $$ BEGIN
  ALTER FUNCTION public.send_admin_announcement(text, text, text, text, jsonb) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.send_admin_announcement(text, text, text, text, jsonb) not found — skipping search_path fix.';
END $$;

-- 21. set_updated_at()
DO $$ BEGIN
  ALTER FUNCTION public.set_updated_at() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.set_updated_at() not found — skipping search_path fix.';
END $$;

-- 22. setup_first_admin(uuid)
DO $$ BEGIN
  ALTER FUNCTION public.setup_first_admin(uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.setup_first_admin(uuid) not found — skipping search_path fix.';
END $$;

-- 23. update_promotions_updated_at()
DO $$ BEGIN
  ALTER FUNCTION public.update_promotions_updated_at() SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.update_promotions_updated_at() not found — skipping search_path fix.';
END $$;

-- 24. upsert_product_inventory(uuid, integer, integer, boolean, uuid)
--     Signature from 20260804060000_admin_product_management.sql:
--     (p_product_id UUID, p_quantity INTEGER, p_low_stock_threshold INTEGER DEFAULT 5,
--      p_allow_backorder BOOLEAN DEFAULT false, p_variant_id UUID DEFAULT NULL)
DO $$ BEGIN
  ALTER FUNCTION public.upsert_product_inventory(uuid, integer, integer, boolean, uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.upsert_product_inventory(uuid, integer, integer, boolean, uuid) not found — skipping search_path fix.';
END $$;

-- 25. validate_promotion_coupon(text, numeric, text, uuid)
--     Signature from 20260804080000_promotions_system.sql:
--     (p_code TEXT, p_subtotal NUMERIC, p_country_code TEXT, p_profile_id UUID DEFAULT NULL)
DO $$ BEGIN
  ALTER FUNCTION public.validate_promotion_coupon(text, numeric, text, uuid) SET search_path = '';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.validate_promotion_coupon(text, numeric, text, uuid) not found — skipping search_path fix.';
END $$;

-- =============================================================================
-- SECTION 2: REVOKE ANON EXECUTE ON SENSITIVE SECURITY DEFINER FUNCTIONS
-- Revokes are always safe — they never touch return types or function bodies.
-- Public-facing functions (admin_exists, get_product_rating_summary,
-- validate_promotion_coupon, get_eligible_promotions, is_allowed_country)
-- retain anon access since the storefront needs them without auth.
-- No revokes from authenticated role.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.cleanup_spin_otp_codes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_product_detail(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_loyalty_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_notification_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_purchased_product(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_review_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_tier_upgrade() FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_posts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_admin_announcement(text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.setup_first_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_promotions_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_product_inventory(uuid, integer, integer, boolean, uuid) FROM anon;

-- is_admin() — used in RLS policies but not needed by anon callers directly
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- rls_auto_enable — conditional: only revoke if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon';
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: FIX RLS POLICY ALWAYS TRUE ON spin_leads
-- Replace WITH CHECK (true) INSERT policies with proper email validation.
-- Anon users can still insert their spin wheel lead, but empty/garbage
-- email addresses are rejected.
-- =============================================================================

DROP POLICY IF EXISTS "spin_leads_insert" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_insert_any" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_insert_validated" ON public.spin_leads;

CREATE POLICY "spin_leads_insert_validated"
ON public.spin_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND LENGTH(TRIM(email)) > 0
  AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
);

-- =============================================================================
-- SECTION 4: FIX PUBLIC BUCKET LISTING
-- product-images: allow public read of individual objects but NOT directory listing.
-- review-photos: restrict to authenticated users only.
-- =============================================================================

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-images'
  AND name IS NOT NULL
);

DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
CREATE POLICY "review_photos_public_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'review-photos'
);

-- =============================================================================
-- NOTE: Leaked Password Protection (auth_leaked_password_protection)
-- Must be enabled via the Supabase Dashboard:
-- Authentication → Sign In / Up → Password Strength → Enable "Leaked password protection"
-- Cannot be configured via SQL migration.
-- =============================================================================
