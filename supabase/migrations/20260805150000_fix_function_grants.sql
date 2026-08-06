-- =============================================================================
-- FUNCTION GRANTS HARDENING (v2 — proper PUBLIC revoke + per-group re-grant)
-- 
-- The previous migration only revoked FROM anon, but Postgres grants EXECUTE
-- to PUBLIC by default, so anon inherits access regardless. This migration
-- first revokes from PUBLIC (which covers anon + authenticated inheritance),
-- then re-grants exactly per group.
--
-- GROUP A — storefront (anon + authenticated + service_role):
--   validate_promotion_coupon, get_eligible_promotions, get_product_rating_summary,
--   is_allowed_country, admin_exists, record_promotion_redemption
--
-- GROUP B — logged-in / admin panel (authenticated + service_role):
--   get_loyalty_summary, get_notification_summary, redeem_loyalty_reward,
--   has_purchased_product, get_admin_product_detail, is_admin, is_admin_or_staff,
--   is_admin_user, send_admin_announcement, setup_first_admin,
--   upsert_product_inventory
--
-- GROUP C — trigger/cron only (service_role only):
--   handle_new_user, notify_review_status_change, notify_tier_upgrade,
--   publish_scheduled_posts, cleanup_spin_otp_codes, rls_auto_enable
--
-- STORAGE — drop review_photos_public_read SELECT policy entirely
--   (bucket stays public; object URLs work without a SELECT policy)
-- =============================================================================

-- =============================================================================
-- GROUP A — STOREFRONT FUNCTIONS
-- Revoke from PUBLIC, anon, authenticated first; then re-grant to
-- anon, authenticated, service_role so guest checkout and product pages work.
-- =============================================================================

-- validate_promotion_coupon(text, numeric, text, uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.validate_promotion_coupon(text, numeric, text, uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.validate_promotion_coupon(text, numeric, text, uuid)
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.validate_promotion_coupon(text, numeric, text, uuid) not found — skipping.';
END $$;

-- get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text)
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_eligible_promotions(numeric, text, uuid, uuid[], uuid[], text) not found — skipping.';
END $$;

-- get_product_rating_summary(uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.get_product_rating_summary(uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_product_rating_summary(uuid)
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_product_rating_summary(uuid) not found — skipping.';
END $$;

-- is_allowed_country(character)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_allowed_country(character)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_allowed_country(character)
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_allowed_country(character) not found — skipping.';
END $$;

-- admin_exists()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.admin_exists()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_exists()
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.admin_exists() not found — skipping.';
END $$;

-- record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text)
-- Guest checkout applies coupons; keeping in Group A (anon access).
-- Move to Group B if frontend confirms it is never called as anon.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text)
    TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.record_promotion_redemption(uuid, uuid, uuid, numeric, numeric, text) not found — skipping.';
END $$;

-- =============================================================================
-- GROUP B — LOGGED-IN / ADMIN PANEL FUNCTIONS
-- Revoke from PUBLIC, anon, authenticated; re-grant to authenticated + service_role.
-- =============================================================================

-- get_loyalty_summary(uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.get_loyalty_summary(uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_loyalty_summary(uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_loyalty_summary(uuid) not found — skipping.';
END $$;

-- get_notification_summary(uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.get_notification_summary(uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_notification_summary(uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_notification_summary(uuid) not found — skipping.';
END $$;

-- redeem_loyalty_reward(uuid, uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid, uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.redeem_loyalty_reward(uuid, uuid) not found — skipping.';
END $$;

-- has_purchased_product(uuid, uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.has_purchased_product(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.has_purchased_product(uuid, uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.has_purchased_product(uuid, uuid) not found — skipping.';
END $$;

-- get_admin_product_detail(text)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.get_admin_product_detail(text)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_admin_product_detail(text)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.get_admin_product_detail(text) not found — skipping.';
END $$;

-- is_admin()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_admin()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_admin()
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_admin() not found — skipping.';
END $$;

-- is_admin_or_staff()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_admin_or_staff()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_admin_or_staff()
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_admin_or_staff() not found — skipping.';
END $$;

-- is_admin_user()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_admin_user()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_admin_user()
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.is_admin_user() not found — skipping.';
END $$;

-- send_admin_announcement(text, text, text, text, jsonb)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.send_admin_announcement(text, text, text, text, jsonb)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.send_admin_announcement(text, text, text, text, jsonb)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.send_admin_announcement(text, text, text, text, jsonb) not found — skipping.';
END $$;

-- setup_first_admin()
-- NOTE: The previous migration used setup_first_admin(uuid) — checking both signatures.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.setup_first_admin()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.setup_first_admin()
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.setup_first_admin() not found — skipping (may use uuid variant).';
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.setup_first_admin(uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.setup_first_admin(uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.setup_first_admin(uuid) not found — skipping.';
END $$;

-- upsert_product_inventory(uuid, integer, integer, boolean, uuid)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.upsert_product_inventory(uuid, integer, integer, boolean, uuid)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.upsert_product_inventory(uuid, integer, integer, boolean, uuid)
    TO authenticated, service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.upsert_product_inventory(uuid, integer, integer, boolean, uuid) not found — skipping.';
END $$;

-- =============================================================================
-- GROUP C — TRIGGER / CRON FUNCTIONS
-- No client role should call these via RPC.
-- Revoke from PUBLIC, anon, authenticated; grant ONLY service_role.
-- Trigger functions execute fine via triggers without caller EXECUTE grants.
-- =============================================================================

-- handle_new_user()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.handle_new_user()
    TO service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.handle_new_user() not found — skipping.';
END $$;

-- notify_review_status_change()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_review_status_change()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.notify_review_status_change()
    TO service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.notify_review_status_change() not found — skipping.';
END $$;

-- notify_tier_upgrade()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_tier_upgrade()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.notify_tier_upgrade()
    TO service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.notify_tier_upgrade() not found — skipping.';
END $$;

-- publish_scheduled_posts()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.publish_scheduled_posts()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.publish_scheduled_posts()
    TO service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.publish_scheduled_posts() not found — skipping.';
END $$;

-- cleanup_spin_otp_codes()
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_spin_otp_codes()
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.cleanup_spin_otp_codes()
    TO service_role;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function public.cleanup_spin_otp_codes() not found — skipping.';
END $$;

-- rls_auto_enable() — conditional: only act if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role';
  ELSE
    RAISE NOTICE 'Function public.rls_auto_enable() not found — skipping.';
  END IF;
END $$;

-- =============================================================================
-- STORAGE — DROP review_photos_public_read SELECT POLICY
-- The bucket is public, so object URLs work without any SELECT policy.
-- Dropping this policy removes the lint warning without making the bucket private.
-- =============================================================================

DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;

-- =============================================================================
-- NOTE: No function bodies were modified in this migration.
-- All changes are GRANT/REVOKE and one storage policy DROP only.
-- =============================================================================
