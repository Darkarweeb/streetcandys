-- ============================================================
-- Street Candy — Security Fix: SET search_path on all functions
-- Migration: 20260805040000_security_fix_search_path.sql
-- Risk: ZERO — only sets search_path, does not modify function logic
-- ============================================================
-- Fixes Supabase linter warning: "Function has a mutable search_path"
-- Applies SET search_path = public, pg_temp to all 27 listed functions.
-- No internal logic is changed.
-- ============================================================

ALTER FUNCTION public.admin_exists()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.setup_first_admin(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.assign_order_number()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.has_purchased_product(UUID, UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_allowed_country(CHAR(2))
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_product_rating_summary(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.notify_review_status_change()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.publish_scheduled_posts()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_admin_or_staff()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_order_number()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_admin_product_detail(TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.upsert_product_inventory(UUID, INTEGER, INTEGER, BOOLEAN, UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_promotions_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_admin_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_eligible_promotions(NUMERIC, TEXT, UUID, UUID[], UUID[], TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.validate_promotion_coupon(TEXT, NUMERIC, TEXT, UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.record_promotion_redemption(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_loyalty_summary(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.redeem_loyalty_reward(UUID, UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.notify_tier_upgrade()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.send_admin_announcement(TEXT, TEXT, TEXT, TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_notification_summary(UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.cleanup_spin_otp_codes()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_admin()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.rls_auto_enable()
  SET search_path = public, pg_temp;
