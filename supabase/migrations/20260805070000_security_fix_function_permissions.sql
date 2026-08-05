-- ============================================================
-- Street Candy — Security Fix: SECURITY DEFINER function permissions
-- Migration: 20260805070000_security_fix_function_permissions.sql
-- Risk: REAL — test thoroughly after applying
-- ============================================================
--
-- FINDINGS FROM CODE REVIEW:
--   - upsert_product_inventory: called via RPC from admin API routes
--     (src/app/api/admin/productos/[id]/inventario/route.ts and variantes/route.ts)
--     → Keep authenticated access; add internal is_admin() guard.
--   - get_admin_product_detail: NOT called via RPC from any frontend/API.
--     The admin product API uses direct table queries. Safe to revoke fully.
--   - record_promotion_redemption: NOT called from any frontend/API code.
--     Only defined in migration. Revoke anon; keep authenticated (server-side use).
--   - admin_exists: used by the setup screen before any login exists.
--     Keep anon access.
--
-- SECTION A — Keep accessible to anon + authenticated (public purchase flow)
-- These functions are used by the anonymous cart/coupon/WhatsApp checkout flow.
-- DO NOT revoke. We only ensure they are GRANTED (idempotent).
-- ============================================================

GRANT EXECUTE ON FUNCTION public.validate_promotion_coupon(TEXT, NUMERIC, TEXT, UUID)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_eligible_promotions(NUMERIC, TEXT, UUID, UUID[], UUID[], TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_allowed_country(TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_product_rating_summary(UUID)
  TO anon, authenticated;

-- record_promotion_redemption: revoke anon (anonymous carts don't call this directly),
-- keep authenticated (server-side order processing uses service-role which bypasses this,
-- but keeping authenticated is safe for future server-component use).
REVOKE EXECUTE ON FUNCTION public.record_promotion_redemption(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.record_promotion_redemption(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT)
  TO authenticated;

-- Reinforce record_promotion_redemption: validate coupon existence, validity,
-- usage limits, and recalculate discount internally instead of trusting p_discount_amount.
CREATE OR REPLACE FUNCTION public.record_promotion_redemption(
  p_promotion_id    UUID,
  p_profile_id      UUID,
  p_order_id        UUID,
  p_discount_amount NUMERIC,
  p_cart_total      NUMERIC,
  p_country_code    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_promotion       RECORD;
  v_customer_uses   INTEGER;
  v_actual_discount NUMERIC;
BEGIN
  -- 1. Verify promotion exists and is currently active
  SELECT * INTO v_promotion
  FROM public.promotions
  WHERE id = p_promotion_id
    AND is_active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion % does not exist or is not active', p_promotion_id;
  END IF;

  -- 2. Check global usage limit
  IF v_promotion.usage_limit IS NOT NULL AND v_promotion.usage_count >= v_promotion.usage_limit THEN
    RAISE EXCEPTION 'Promotion % has reached its global usage limit', p_promotion_id;
  END IF;

  -- 3. Check per-customer usage limit (only if profile_id provided)
  IF p_profile_id IS NOT NULL AND v_promotion.per_customer_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_uses
    FROM public.promotion_redemptions
    WHERE promotion_id = p_promotion_id
      AND profile_id = p_profile_id;

    IF v_customer_uses >= v_promotion.per_customer_limit THEN
      RAISE EXCEPTION 'Customer has already used promotion % the maximum number of times', p_promotion_id;
    END IF;
  END IF;

  -- 4. Recalculate actual discount server-side (ignore p_discount_amount from client)
  IF v_promotion.promotion_type = 'percentage' THEN
    v_actual_discount := ROUND(p_cart_total * v_promotion.discount_value / 100.0, 2);
    IF v_promotion.maximum_discount IS NOT NULL THEN
      v_actual_discount := LEAST(v_actual_discount, v_promotion.maximum_discount);
    END IF;
  ELSIF v_promotion.promotion_type = 'fixed_amount' THEN
    v_actual_discount := LEAST(v_promotion.discount_value, p_cart_total);
  ELSIF v_promotion.promotion_type = 'free_shipping' THEN
    -- Shipping discount is handled separately; record 0 here
    v_actual_discount := 0;
  ELSE
    -- For other types, use the provided amount but cap at cart total
    v_actual_discount := LEAST(GREATEST(p_discount_amount, 0), p_cart_total);
  END IF;

  -- 5. Insert redemption record with server-calculated discount
  INSERT INTO public.promotion_redemptions (
    promotion_id, profile_id, order_id, discount_amount, cart_total, country_code
  ) VALUES (
    p_promotion_id, p_profile_id, p_order_id, v_actual_discount, p_cart_total, p_country_code
  );

  -- 6. Update promotion counters
  UPDATE public.promotions
  SET
    usage_count             = usage_count + 1,
    total_discount_given    = total_discount_given + v_actual_discount,
    total_revenue_generated = total_revenue_generated + COALESCE(p_cart_total, 0),
    updated_at              = NOW()
  WHERE id = p_promotion_id;
END;
$$;

-- ============================================================
-- SECTION B — Account functions: revoke anon, keep authenticated
-- Add p_profile_id = auth.uid() guard to prevent cross-user data access.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_loyalty_summary(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_loyalty_summary(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_purchased_product(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_purchased_product(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_notification_summary(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_notification_summary(UUID) TO authenticated;

-- Reinforce get_loyalty_summary: caller must be querying their own profile
CREATE OR REPLACE FUNCTION public.get_loyalty_summary(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Security: caller can only query their own profile
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Access denied: you can only query your own loyalty summary';
  END IF;

  SELECT jsonb_build_object(
    'profile_id',       p.id,
    'points_balance',   COALESCE(p.loyalty_points, 0),
    'tier',             COALESCE(p.loyalty_tier, 'bronze'),
    'total_earned',     COALESCE(SUM(rt.points) FILTER (WHERE rt.transaction_type = 'earn'), 0),
    'total_redeemed',   COALESCE(SUM(rt.points) FILTER (WHERE rt.transaction_type = 'redeem'), 0)
  )
  INTO v_result
  FROM public.profiles p
  LEFT JOIN public.reward_transactions rt ON rt.profile_id = p.id
  WHERE p.id = p_profile_id
  GROUP BY p.id, p.loyalty_points, p.loyalty_tier;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- Reinforce get_notification_summary: caller must be querying their own profile
CREATE OR REPLACE FUNCTION public.get_notification_summary(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Security: caller can only query their own notifications
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Access denied: you can only query your own notifications';
  END IF;

  SELECT jsonb_build_object(
    'unread_count', COUNT(*) FILTER (WHERE NOT read),
    'total_count',  COUNT(*)
  )
  INTO v_result
  FROM public.notifications
  WHERE profile_id = p_profile_id;

  RETURN COALESCE(v_result, '{"unread_count":0,"total_count":0}'::JSONB);
END;
$$;

-- Reinforce has_purchased_product: caller must be querying their own profile
CREATE OR REPLACE FUNCTION public.has_purchased_product(p_profile_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Security: caller can only check their own purchase history
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Access denied: you can only check your own purchase history';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.profile_id = p_profile_id
      AND oi.product_id = p_product_id
      AND o.status IN ('completed', 'delivered')
  );
END;
$$;

-- Reinforce redeem_loyalty_reward: caller must be redeeming for their own profile
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_profile_id UUID, p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reward  RECORD;
  v_profile RECORD;
BEGIN
  -- Security: caller can only redeem for their own profile
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Access denied: you can only redeem rewards for your own account';
  END IF;

  -- Get reward details
  SELECT * INTO v_reward FROM public.loyalty_rewards WHERE id = p_reward_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found or inactive');
  END IF;

  -- Get profile points
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Check sufficient points
  IF COALESCE(v_profile.loyalty_points, 0) < v_reward.points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  -- Deduct points
  UPDATE public.profiles
  SET loyalty_points = loyalty_points - v_reward.points_cost,
      updated_at = NOW()
  WHERE id = p_profile_id;

  -- Record transaction
  INSERT INTO public.reward_transactions (profile_id, reward_id, points, transaction_type)
  VALUES (p_profile_id, p_reward_id, -v_reward.points_cost, 'redeem');

  RETURN jsonb_build_object('success', true, 'points_deducted', v_reward.points_cost);
END;
$$;

-- ============================================================
-- SECTION C — Administrative & internal functions: revoke from all public roles
-- Trigger functions still work even after EXECUTE is revoked from public roles.
-- ============================================================

-- Administrative functions
REVOKE EXECUTE ON FUNCTION public.setup_first_admin(TEXT, TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_product_detail(TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_admin_announcement(TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_posts() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_spin_otp_codes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;

-- Trigger functions (triggers invoke them as the table owner, not via EXECUTE grant)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_review_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_tier_upgrade() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_order_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_promotions_updated_at() FROM anon, authenticated, PUBLIC;

-- upsert_product_inventory: called via RPC from admin API routes.
-- Keep authenticated access. Add internal is_admin() guard.
REVOKE EXECUTE ON FUNCTION public.upsert_product_inventory(UUID, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_product_inventory(UUID, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_product_inventory(
  p_product_id          UUID,
  p_quantity            INTEGER,
  p_low_stock_threshold INTEGER DEFAULT 5
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Security: only admins and staff may update inventory
  IF NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'Access denied: admin or staff role required to update inventory';
  END IF;

  INSERT INTO public.inventory (product_id, quantity, low_stock_threshold, updated_at)
  VALUES (p_product_id, p_quantity, p_low_stock_threshold, NOW())
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity            = EXCLUDED.quantity,
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    updated_at          = NOW();
END;
$$;

-- ============================================================
-- SECTION D — Role helper functions: authenticated only
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_staff() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- admin_exists: keep anon access — used by the initial setup screen before any login
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
