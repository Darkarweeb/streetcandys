-- ============================================================
-- Street Candy — Promotions & Discount Management System
-- ============================================================

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.promotion_type CASCADE;
CREATE TYPE public.promotion_type AS ENUM (
  'percentage',
  'fixed_amount',
  'free_shipping',
  'buy_x_get_y',
  'automatic_cart',
  'coupon_code'
);

-- 2. PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promotions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  internal_notes        TEXT,
  promotion_type        public.promotion_type NOT NULL DEFAULT 'percentage',
  coupon_code           TEXT UNIQUE,
  discount_value        NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Buy X Get Y
  buy_quantity          INTEGER,
  get_quantity          INTEGER,
  get_product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  -- Conditions
  minimum_purchase      NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_discount      NUMERIC(10,2),
  -- Scheduling
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at               TIMESTAMPTZ,
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT true,
  -- Usage limits
  usage_limit           INTEGER,
  usage_count           INTEGER NOT NULL DEFAULT 0,
  per_customer_limit    INTEGER NOT NULL DEFAULT 1,
  -- Country targeting (NULL = all countries)
  country_codes         TEXT[] DEFAULT NULL,
  -- Product/Category/Brand/Customer targeting (NULL = all)
  product_ids           UUID[] DEFAULT NULL,
  category_ids          UUID[] DEFAULT NULL,
  brand_ids             UUID[] DEFAULT NULL,
  customer_ids          UUID[] DEFAULT NULL,
  -- Loyalty tier eligibility (NULL = all tiers)
  eligible_tiers        TEXT[] DEFAULT NULL,
  -- Analytics
  total_revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_discount_given    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. PROMOTION REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  cart_total      NUMERIC(10,2),
  country_code    TEXT,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_coupon_code ON public.promotions(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_starts_at ON public.promotions(starts_at);
CREATE INDEX IF NOT EXISTS idx_promotions_ends_at ON public.promotions(ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(promotion_type);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion_id ON public.promotion_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_profile_id ON public.promotion_redemptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order_id ON public.promotion_redemptions(order_id);

-- 5. FUNCTIONS

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_promotions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Check if admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role IN ('admin', 'staff')
)
$$;

-- Get eligible promotions for a cart
CREATE OR REPLACE FUNCTION public.get_eligible_promotions(
  p_subtotal        NUMERIC,
  p_country_code    TEXT,
  p_profile_id      UUID DEFAULT NULL,
  p_product_ids     UUID[] DEFAULT NULL,
  p_category_ids    UUID[] DEFAULT NULL,
  p_customer_tier   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  name              TEXT,
  promotion_type    public.promotion_type,
  coupon_code       TEXT,
  discount_value    NUMERIC,
  buy_quantity      INTEGER,
  get_quantity      INTEGER,
  get_product_id    UUID,
  minimum_purchase  NUMERIC,
  maximum_discount  NUMERIC,
  country_codes     TEXT[],
  product_ids       UUID[],
  category_ids      UUID[],
  eligible_tiers    TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.name,
    pr.promotion_type,
    pr.coupon_code,
    pr.discount_value,
    pr.buy_quantity,
    pr.get_quantity,
    pr.get_product_id,
    pr.minimum_purchase,
    pr.maximum_discount,
    pr.country_codes,
    pr.product_ids,
    pr.category_ids,
    pr.eligible_tiers
  FROM public.promotions pr
  WHERE
    pr.is_active = true
    AND pr.starts_at <= NOW()
    AND (pr.ends_at IS NULL OR pr.ends_at > NOW())
    AND (pr.usage_limit IS NULL OR pr.usage_count < pr.usage_limit)
    AND pr.minimum_purchase <= p_subtotal
    -- Country filter
    AND (pr.country_codes IS NULL OR p_country_code = ANY(pr.country_codes))
    -- Tier filter
    AND (pr.eligible_tiers IS NULL OR p_customer_tier = ANY(pr.eligible_tiers))
    -- Automatic promotions only (not coupon_code type)
    AND pr.promotion_type != 'coupon_code'
    -- Customer-specific filter
    AND (pr.customer_ids IS NULL OR (p_profile_id IS NOT NULL AND p_profile_id = ANY(pr.customer_ids)))
    -- Product filter (if product_ids provided, check overlap)
    AND (
      pr.product_ids IS NULL
      OR p_product_ids IS NULL
      OR pr.product_ids && p_product_ids
    )
    -- Category filter
    AND (
      pr.category_ids IS NULL
      OR p_category_ids IS NULL
      OR pr.category_ids && p_category_ids
    )
  ORDER BY pr.discount_value DESC;
END;
$$;

-- Validate a coupon code promotion
CREATE OR REPLACE FUNCTION public.validate_promotion_coupon(
  p_code            TEXT,
  p_subtotal        NUMERIC,
  p_country_code    TEXT,
  p_profile_id      UUID DEFAULT NULL
)
RETURNS TABLE (
  valid             BOOLEAN,
  reason            TEXT,
  promotion_id      UUID,
  promotion_name    TEXT,
  promotion_type    public.promotion_type,
  discount_value    NUMERIC,
  maximum_discount  NUMERIC,
  minimum_purchase  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo public.promotions%ROWTYPE;
  v_user_uses INTEGER := 0;
BEGIN
  -- Find promotion by coupon code
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE UPPER(coupon_code) = UPPER(p_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código de promoción no encontrado.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN QUERY SELECT false, 'Esta promoción no está activa.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_promo.starts_at > NOW() THEN
    RETURN QUERY SELECT false, 'Esta promoción aún no ha comenzado.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_promo.ends_at IS NOT NULL AND v_promo.ends_at <= NOW() THEN
    RETURN QUERY SELECT false, 'Esta promoción ha expirado.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
    RETURN QUERY SELECT false, 'Esta promoción ha alcanzado su límite de usos.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_subtotal < v_promo.minimum_purchase THEN
    RETURN QUERY SELECT false, ('Compra mínima requerida: ' || v_promo.minimum_purchase::TEXT)::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_promo.country_codes IS NOT NULL AND NOT (p_country_code = ANY(v_promo.country_codes)) THEN
    RETURN QUERY SELECT false, 'Esta promoción no está disponible en tu país.'::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Check per-customer usage
  IF p_profile_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.promotion_redemptions
    WHERE promotion_id = v_promo.id AND profile_id = p_profile_id;

    IF v_user_uses >= v_promo.per_customer_limit THEN
      RETURN QUERY SELECT false, ('Ya usaste esta promoción el máximo de veces permitido (' || v_promo.per_customer_limit::TEXT || ').')::TEXT, NULL::UUID, NULL::TEXT, NULL::public.promotion_type, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT
    true,
    'Promoción válida.'::TEXT,
    v_promo.id,
    v_promo.name,
    v_promo.promotion_type,
    v_promo.discount_value,
    v_promo.maximum_discount,
    v_promo.minimum_purchase;
END;
$$;

-- Record a promotion redemption and update usage count
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
AS $$
BEGIN
  INSERT INTO public.promotion_redemptions (
    promotion_id, profile_id, order_id, discount_amount, cart_total, country_code
  ) VALUES (
    p_promotion_id, p_profile_id, p_order_id, p_discount_amount, p_cart_total, p_country_code
  );

  UPDATE public.promotions
  SET
    usage_count = usage_count + 1,
    total_discount_given = total_discount_given + p_discount_amount,
    total_revenue_generated = total_revenue_generated + COALESCE(p_cart_total, 0),
    updated_at = NOW()
  WHERE id = p_promotion_id;
END;
$$;

-- 6. ENABLE RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- Promotions: admins full access
DROP POLICY IF EXISTS "admins_manage_promotions" ON public.promotions;
CREATE POLICY "admins_manage_promotions"
ON public.promotions
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Promotions: public can read active promotions (for cart validation)
DROP POLICY IF EXISTS "public_read_active_promotions" ON public.promotions;
CREATE POLICY "public_read_active_promotions"
ON public.promotions
FOR SELECT
TO public
USING (is_active = true AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()));

-- Promotion redemptions: admins full access
DROP POLICY IF EXISTS "admins_manage_promotion_redemptions" ON public.promotion_redemptions;
CREATE POLICY "admins_manage_promotion_redemptions"
ON public.promotion_redemptions
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Promotion redemptions: users can read their own
DROP POLICY IF EXISTS "users_read_own_redemptions" ON public.promotion_redemptions;
CREATE POLICY "users_read_own_redemptions"
ON public.promotion_redemptions
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Promotion redemptions: authenticated users can insert (when applying promotion)
DROP POLICY IF EXISTS "users_insert_redemptions" ON public.promotion_redemptions;
CREATE POLICY "users_insert_redemptions"
ON public.promotion_redemptions
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- 8. TRIGGERS
DROP TRIGGER IF EXISTS promotions_updated_at ON public.promotions;
CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_promotions_updated_at();
