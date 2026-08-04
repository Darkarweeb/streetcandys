-- ============================================================
-- Fix Admin RLS Policies — Break Circular Dependency
-- Migration: 20260804150000_fix_admin_rls_and_policies.sql
--
-- Root cause: is_admin() queries profiles → profiles RLS uses is_admin()
-- → circular dependency → RLS blocks admin from reading their own profile
-- → AuthContext fetchProfile returns null → loading stuck / blank page
-- → middleware can't verify admin role → redirect loop
--
-- Fix strategy:
--   profiles SELECT: use auth.uid() = id ONLY (no function call, no subquery)
--   is_admin(): SECURITY DEFINER so it bypasses RLS when called from other tables
-- ============================================================

-- ── 1. Fix is_admin() — SECURITY DEFINER bypasses RLS on profiles ────────────
-- This is the key fix: when is_admin() runs, it bypasses RLS on profiles
-- so there is no circular dependency for OTHER tables that call is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin'::public.user_role, 'staff'::public.user_role)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ── 2. Fix profiles RLS: simple own-row access, no function calls ─────────────
-- Drop ALL existing SELECT policies on profiles to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Drop ALL existing INSERT/UPDATE policies on profiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Simple: any authenticated user can read their own profile row
-- No function calls, no subqueries — zero chance of recursion
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admin/staff can read ALL profiles
-- is_admin() is SECURITY DEFINER so it bypasses profiles RLS when executing
-- This does NOT cause recursion because SECURITY DEFINER runs as the function owner
CREATE POLICY "profiles_select_admin_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (signup trigger)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── 3. Fix orders RLS ─────────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname); END LOOP;
END $$;

CREATE POLICY "orders_select"
  ON public.orders FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "orders_insert"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "orders_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 4. Fix products RLS ───────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname); END LOOP;
END $$;

CREATE POLICY "products_select"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "products_insert"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "products_update"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "products_delete"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 5. Fix product_variants RLS ───────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_variants', pol.policyname); END LOOP;
END $$;

CREATE POLICY "product_variants_select"
  ON public.product_variants FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "product_variants_insert"
  ON public.product_variants FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_update"
  ON public.product_variants FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_delete"
  ON public.product_variants FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 6. Fix inventory RLS ──────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory', pol.policyname); END LOOP;
END $$;

CREATE POLICY "inventory_select"
  ON public.inventory FOR SELECT USING (true);

CREATE POLICY "inventory_insert"
  ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "inventory_update"
  ON public.inventory FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 7. Fix categories RLS ─────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname); END LOOP;
END $$;

CREATE POLICY "categories_select"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "categories_insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "categories_update"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "categories_delete"
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 8. Fix reviews RLS ────────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol.policyname); END LOOP;
END $$;

CREATE POLICY "reviews_select"
  ON public.reviews FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR is_approved = true OR public.is_admin());

CREATE POLICY "reviews_insert"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "reviews_update"
  ON public.reviews FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 9. Fix promotions RLS ─────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.promotions', pol.policyname); END LOOP;
END $$;

CREATE POLICY "promotions_select"
  ON public.promotions FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "promotions_insert"
  ON public.promotions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "promotions_update"
  ON public.promotions FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "promotions_delete"
  ON public.promotions FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 10. Fix coupons RLS ───────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupons'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupons', pol.policyname); END LOOP;
END $$;

CREATE POLICY "coupons_select"
  ON public.coupons FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "coupons_insert"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_update"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "coupons_delete"
  ON public.coupons FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 11. Fix blog_posts RLS ────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_posts'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_posts', pol.policyname); END LOOP;
END $$;

CREATE POLICY "blog_posts_select"
  ON public.blog_posts FOR SELECT
  USING (status = 'published'::public.blog_post_status OR public.is_admin());

CREATE POLICY "blog_posts_insert"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "blog_posts_update"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "blog_posts_delete"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 12. Fix notifications RLS ─────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname); END LOOP;
END $$;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 13. Fix rewards RLS ───────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rewards'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.rewards', pol.policyname); END LOOP;
END $$;

CREATE POLICY "rewards_select"
  ON public.rewards FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "rewards_insert"
  ON public.rewards FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "rewards_update"
  ON public.rewards FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 14. Fix reward_transactions RLS ──────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reward_transactions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.reward_transactions', pol.policyname); END LOOP;
END $$;

CREATE POLICY "reward_transactions_select"
  ON public.reward_transactions FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "reward_transactions_insert"
  ON public.reward_transactions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 15. Fix addresses RLS ─────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addresses'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.addresses', pol.policyname); END LOOP;
END $$;

CREATE POLICY "addresses_select"
  ON public.addresses FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "addresses_insert"
  ON public.addresses FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "addresses_update"
  ON public.addresses FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "addresses_delete"
  ON public.addresses FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

-- ── 16. Fix order_internal_notes RLS ─────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_internal_notes'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_internal_notes', pol.policyname); END LOOP;
END $$;

CREATE POLICY "order_internal_notes_select"
  ON public.order_internal_notes FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "order_internal_notes_insert"
  ON public.order_internal_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── 17. Fix wishlist RLS ──────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wishlist'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.wishlist', pol.policyname); END LOOP;
END $$;

CREATE POLICY "wishlist_select"
  ON public.wishlist FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "wishlist_insert"
  ON public.wishlist FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "wishlist_delete"
  ON public.wishlist FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

-- ── 18. Fix cart RLS ──────────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cart'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.cart', pol.policyname); END LOOP;
END $$;

CREATE POLICY "cart_select"
  ON public.cart FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "cart_insert"
  ON public.cart FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY "cart_update"
  ON public.cart FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "cart_delete"
  ON public.cart FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

-- ── 19. Fix cart_items RLS ────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cart_items'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.cart_items', pol.policyname); END LOOP;
END $$;

CREATE POLICY "cart_items_select"
  ON public.cart_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_id AND (c.profile_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "cart_items_insert"
  ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_id AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_update"
  ON public.cart_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_id AND (c.profile_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "cart_items_delete"
  ON public.cart_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_id AND (c.profile_id = auth.uid() OR public.is_admin())
    )
  );

-- ── 20. Fix order_items RLS ───────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', pol.policyname); END LOOP;
END $$;

CREATE POLICY "order_items_select"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.profile_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "order_items_insert"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── 21. Fix coupon_redemptions RLS ───────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coupon_redemptions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupon_redemptions', pol.policyname); END LOOP;
END $$;

CREATE POLICY "coupon_redemptions_select"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "coupon_redemptions_insert"
  ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 22. Fix promotion_redemptions RLS ────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotion_redemptions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.promotion_redemptions', pol.policyname); END LOOP;
END $$;

CREATE POLICY "promotion_redemptions_select"
  ON public.promotion_redemptions FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "promotion_redemptions_insert"
  ON public.promotion_redemptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ── 23. Fix loyalty_rewards RLS ──────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loyalty_rewards'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.loyalty_rewards', pol.policyname); END LOOP;
END $$;

CREATE POLICY "loyalty_rewards_select"
  ON public.loyalty_rewards FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "loyalty_rewards_insert"
  ON public.loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "loyalty_rewards_update"
  ON public.loyalty_rewards FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 24. Fix loyalty_reward_redemptions RLS ───────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loyalty_reward_redemptions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.loyalty_reward_redemptions', pol.policyname); END LOOP;
END $$;

CREATE POLICY "loyalty_reward_redemptions_select"
  ON public.loyalty_reward_redemptions FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "loyalty_reward_redemptions_insert"
  ON public.loyalty_reward_redemptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- ── 25. Fix settings RLS ──────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.settings', pol.policyname); END LOOP;
END $$;

CREATE POLICY "settings_select"
  ON public.settings FOR SELECT
  USING (is_public = true OR public.is_admin());

CREATE POLICY "settings_update"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_insert"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── 26. Fix spin_to_win_settings RLS ─────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'spin_to_win_settings'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.spin_to_win_settings', pol.policyname); END LOOP;
END $$;

CREATE POLICY "spin_to_win_settings_select"
  ON public.spin_to_win_settings FOR SELECT USING (true);

CREATE POLICY "spin_to_win_settings_update"
  ON public.spin_to_win_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 27. Fix spin_leads RLS ────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'spin_leads'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.spin_leads', pol.policyname); END LOOP;
END $$;

CREATE POLICY "spin_leads_select"
  ON public.spin_leads FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "spin_leads_insert"
  ON public.spin_leads FOR INSERT
  WITH CHECK (true);

-- ── 28. Fix blog_categories RLS ───────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_categories'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.blog_categories', pol.policyname); END LOOP;
END $$;

CREATE POLICY "blog_categories_select"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY "blog_categories_insert"
  ON public.blog_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "blog_categories_update"
  ON public.blog_categories FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 29. Fix countries RLS ─────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'countries'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.countries', pol.policyname); END LOOP;
END $$;

CREATE POLICY "countries_select"
  ON public.countries FOR SELECT USING (true);

CREATE POLICY "countries_update"
  ON public.countries FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
