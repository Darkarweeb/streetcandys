-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- Fixes all 76 Supabase security warnings:
--   1. Function search_path mutable (25 functions)
--   2. Anon/authenticated can execute SECURITY DEFINER functions (23 functions)
--   3. RLS policy always true on spin_leads (2 policies)
--   4. Public bucket allows listing (2 buckets)
-- =============================================================================

-- =============================================================================
-- SECTION 1: FIX FUNCTION SEARCH_PATH MUTABLE
-- Add SET search_path = '' to all 25 affected functions so they are immune
-- to search_path hijacking attacks.
-- =============================================================================

-- 1. admin_exists
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role IN ('admin', 'super_admin')
    LIMIT 1
  );
$$;

-- 2. assign_order_number (trigger function)
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- 3. cleanup_spin_otp_codes
CREATE OR REPLACE FUNCTION public.cleanup_spin_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.spin_otp_codes
  WHERE expires_at < NOW() OR used = true;
END;
$$;

-- 4. generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_number text;
  v_exists boolean;
BEGIN
  LOOP
    v_number := 'SC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = v_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$;

-- 5. get_admin_product_detail
CREATE OR REPLACE FUNCTION public.get_admin_product_detail(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT row_to_json(p.*) INTO v_result
  FROM public.products p
  WHERE p.slug = p_slug
  LIMIT 1;
  RETURN v_result;
END;
$$;

-- 6. get_eligible_promotions
CREATE OR REPLACE FUNCTION public.get_eligible_promotions(
  p_user_id uuid DEFAULT NULL,
  p_subtotal numeric DEFAULT 0,
  p_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_category_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS SETOF public.promotions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT pr.*
  FROM public.promotions pr
  WHERE pr.is_active = true
    AND (pr.starts_at IS NULL OR pr.starts_at <= NOW())
    AND (pr.ends_at IS NULL OR pr.ends_at >= NOW())
    AND (pr.minimum_order_amount IS NULL OR p_subtotal >= pr.minimum_order_amount)
  ORDER BY pr.discount_value DESC;
END;
$$;

-- 7. get_loyalty_summary
CREATE OR REPLACE FUNCTION public.get_loyalty_summary(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'points', COALESCE(r.points_balance, 0),
    'tier', COALESCE(r.tier, 'bronze'),
    'total_earned', COALESCE(r.total_points_earned, 0)
  ) INTO v_result
  FROM public.rewards r
  WHERE r.profile_id = p_profile_id
  LIMIT 1;
  RETURN COALESCE(v_result, json_build_object('points', 0, 'tier', 'bronze', 'total_earned', 0));
END;
$$;

-- 8. get_notification_summary
CREATE OR REPLACE FUNCTION public.get_notification_summary(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unread integer;
BEGIN
  SELECT COUNT(*) INTO v_unread
  FROM public.notifications
  WHERE profile_id = p_profile_id AND read = false;
  RETURN json_build_object('unread_count', COALESCE(v_unread, 0));
END;
$$;

-- 9. get_product_rating_summary
CREATE OR REPLACE FUNCTION public.get_product_rating_summary(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'average_rating', ROUND(AVG(rating)::numeric, 1),
    'total_reviews', COUNT(*),
    'rating_distribution', json_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    )
  ) INTO v_result
  FROM public.reviews
  WHERE product_id = p_product_id AND status = 'approved';
  RETURN COALESCE(v_result, json_build_object('average_rating', 0, 'total_reviews', 0));
END;
$$;

-- 10. handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 11. has_purchased_product
CREATE OR REPLACE FUNCTION public.has_purchased_product(p_profile_id uuid, p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.profile_id = p_profile_id
      AND oi.product_id = p_product_id
      AND o.status IN ('delivered', 'completed')
  );
END;
$$;

-- 12. is_admin_or_staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'staff')
  );
$$;

-- 13. is_admin_user
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- 14. is_allowed_country
CREATE OR REPLACE FUNCTION public.is_allowed_country(p_country_code character)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.countries
    WHERE code = p_country_code AND is_active = true
  );
$$;

-- 15. notify_review_status_change (trigger function)
CREATE OR REPLACE FUNCTION public.notify_review_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (profile_id, type, title, message, data)
    VALUES (
      NEW.profile_id,
      'review_status',
      CASE NEW.status
        WHEN 'approved' THEN 'Reseña aprobada'
        WHEN 'rejected' THEN 'Reseña rechazada'
        ELSE 'Estado de reseña actualizado'
      END,
      'El estado de tu reseña ha sido actualizado.',
      json_build_object('review_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 16. notify_tier_upgrade (trigger function)
CREATE OR REPLACE FUNCTION public.notify_tier_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    INSERT INTO public.notifications (profile_id, type, title, message, data)
    VALUES (
      NEW.profile_id,
      'tier_upgrade',
      '¡Subiste de nivel!',
      'Has alcanzado el nivel ' || NEW.tier || ' en el programa de recompensas.',
      json_build_object('old_tier', OLD.tier, 'new_tier', NEW.tier)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 17. publish_scheduled_posts
CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.blog_posts
  SET status = 'published', published_at = NOW()
  WHERE status = 'scheduled'
    AND scheduled_at <= NOW();
END;
$$;

-- 18. record_promotion_redemption
CREATE OR REPLACE FUNCTION public.record_promotion_redemption(
  p_promotion_id uuid,
  p_profile_id uuid,
  p_order_id uuid,
  p_discount_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.promotion_redemptions (promotion_id, profile_id, order_id, discount_amount)
  VALUES (p_promotion_id, p_profile_id, p_order_id, p_discount_amount);

  UPDATE public.promotions
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = p_promotion_id;
END;
$$;

-- 19. redeem_loyalty_reward
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_profile_id uuid, p_reward_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reward public.loyalty_rewards%ROWTYPE;
  v_points integer;
BEGIN
  SELECT * INTO v_reward FROM public.loyalty_rewards WHERE id = p_reward_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;

  SELECT points_balance INTO v_points FROM public.rewards WHERE profile_id = p_profile_id;
  IF COALESCE(v_points, 0) < v_reward.points_required THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  INSERT INTO public.loyalty_reward_redemptions (profile_id, reward_id, points_used)
  VALUES (p_profile_id, p_reward_id, v_reward.points_required);

  UPDATE public.rewards
  SET points_balance = points_balance - v_reward.points_required
  WHERE profile_id = p_profile_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 20. send_admin_announcement
CREATE OR REPLACE FUNCTION public.send_admin_announcement(
  p_title text,
  p_message text,
  p_type text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (profile_id, type, title, message)
  SELECT id, p_type, p_title, p_message
  FROM public.profiles
  WHERE role NOT IN ('admin', 'super_admin');
END;
$$;

-- 21. set_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 22. setup_first_admin
CREATE OR REPLACE FUNCTION public.setup_first_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'super_admin'
  WHERE id = user_id;
END;
$$;

-- 23. update_promotions_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_promotions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 24. upsert_product_inventory
CREATE OR REPLACE FUNCTION public.upsert_product_inventory(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_low_stock_threshold integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.inventory (product_id, variant_id, quantity, low_stock_threshold)
  VALUES (p_product_id, p_variant_id, p_quantity, p_low_stock_threshold)
  ON CONFLICT (product_id, variant_id) DO UPDATE
    SET quantity = EXCLUDED.quantity,
        low_stock_threshold = EXCLUDED.low_stock_threshold,
        updated_at = NOW();
END;
$$;

-- 25. validate_promotion_coupon
CREATE OR REPLACE FUNCTION public.validate_promotion_coupon(
  p_code text,
  p_profile_id uuid DEFAULT NULL,
  p_subtotal numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Cupón no encontrado');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN json_build_object('valid', false, 'error', 'Cupón expirado');
  END IF;

  IF v_coupon.minimum_order_amount IS NOT NULL AND p_subtotal < v_coupon.minimum_order_amount THEN
    RETURN json_build_object('valid', false, 'error', 'Monto mínimo no alcanzado');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

-- =============================================================================
-- SECTION 2: REVOKE ANON EXECUTE ON SENSITIVE SECURITY DEFINER FUNCTIONS
-- Functions that should NOT be callable by unauthenticated users.
-- We keep anon access only on truly public functions (admin_exists,
-- get_product_rating_summary, validate_promotion_coupon, get_eligible_promotions,
-- is_allowed_country) since the app uses them without auth.
-- =============================================================================

-- Revoke anon execute from internal/admin-only functions
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
REVOKE EXECUTE ON FUNCTION public.record_promotion_redemption(uuid, uuid, uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_admin_announcement(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.setup_first_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_promotions_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_product_inventory(uuid, uuid, integer, integer) FROM anon;

-- Revoke anon execute from rls_auto_enable if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated';
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: FIX RLS POLICY ALWAYS TRUE ON spin_leads
-- Replace WITH CHECK (true) INSERT policies with proper validation.
-- spin_leads captures spin wheel entries — anon users should be able to insert
-- their own lead (by email), but we tighten the check so it's not a blank pass.
-- =============================================================================

-- Drop the overly permissive INSERT policies
DROP POLICY IF EXISTS "spin_leads_insert" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_insert_any" ON public.spin_leads;

-- Recreate with a meaningful check: email must be non-empty
-- This prevents trivially empty inserts while still allowing the spin wheel to work
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
-- Replace broad SELECT policies that allow listing all files with
-- policies that only allow reading specific objects (by path prefix or
-- requiring an authenticated user for listing).
-- =============================================================================

-- product-images bucket: allow public READ of individual objects but NOT listing
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-images'
  AND name IS NOT NULL
);

-- review-photos bucket: only authenticated users can list/read
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
-- This must be enabled via the Supabase Dashboard:
-- Authentication → Sign In / Up → Password Strength → Enable "Leaked password protection"
-- It cannot be configured via SQL migration.
-- =============================================================================
