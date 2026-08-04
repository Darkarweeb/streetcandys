-- ============================================================
-- Street Candy — Loyalty Members Dashboard
-- Migration: 20260804100000_loyalty_dashboard.sql
-- Adds:
--   1. loyalty_rewards table (redeemable rewards catalog)
--   2. loyalty_reward_redemptions table (customer redemptions)
--   3. RLS policies for both tables
--   4. get_loyalty_summary() function
--   5. Notification trigger for tier upgrades
-- ============================================================

-- ── 1. loyalty_rewards catalog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  points_required  INTEGER NOT NULL CHECK (points_required > 0),
  reward_type      TEXT NOT NULL DEFAULT 'discount',
  reward_value     NUMERIC DEFAULT 0,
  eligible_tiers   TEXT[] DEFAULT ARRAY['crew','og','legend','icon']::TEXT[],
  is_active        BOOLEAN NOT NULL DEFAULT true,
  stock_limit      INTEGER,
  stock_used       INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. loyalty_reward_redemptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_reward_redemptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id        UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
  points_spent     INTEGER NOT NULL CHECK (points_spent > 0),
  balance_after    INTEGER NOT NULL CHECK (balance_after >= 0),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  coupon_code      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active
  ON public.loyalty_rewards (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_profile
  ON public.loyalty_reward_redemptions (profile_id, created_at DESC);

-- ── 4. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies — loyalty_rewards (public read, admin write) ──────────────
DROP POLICY IF EXISTS "loyalty_rewards_public_read" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_public_read"
ON public.loyalty_rewards
FOR SELECT
TO public
USING (is_active = true);

DROP POLICY IF EXISTS "loyalty_rewards_admin_all" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_admin_all"
ON public.loyalty_rewards
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','staff')
  )
);

-- ── 6. RLS Policies — loyalty_reward_redemptions ──────────────────────────────
DROP POLICY IF EXISTS "loyalty_redemptions_own_select" ON public.loyalty_reward_redemptions;
CREATE POLICY "loyalty_redemptions_own_select"
ON public.loyalty_reward_redemptions
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "loyalty_redemptions_own_insert" ON public.loyalty_reward_redemptions;
CREATE POLICY "loyalty_redemptions_own_insert"
ON public.loyalty_reward_redemptions
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "loyalty_redemptions_admin_all" ON public.loyalty_reward_redemptions;
CREATE POLICY "loyalty_redemptions_admin_all"
ON public.loyalty_reward_redemptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','staff')
  )
);

-- ── 7. Function: get_loyalty_summary ─────────────────────────────────────────
-- Returns aggregated stats for the loyalty dashboard
CREATE OR REPLACE FUNCTION public.get_loyalty_summary(p_profile_id UUID)
RETURNS TABLE(
  points_balance    INTEGER,
  points_lifetime   INTEGER,
  points_earned     INTEGER,
  points_redeemed   INTEGER,
  tier              TEXT,
  tier_updated_at   TIMESTAMPTZ,
  referral_code     TEXT,
  referral_count    INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security: only the owner or admin can call this
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() <> p_profile_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','staff')
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(r.points_balance, 0)::INTEGER,
    COALESCE(r.points_lifetime, 0)::INTEGER,
    COALESCE(
      (SELECT SUM(rt.points) FROM public.reward_transactions rt
       WHERE rt.profile_id = p_profile_id AND rt.points > 0), 0
    )::INTEGER,
    COALESCE(
      (SELECT ABS(SUM(rt.points)) FROM public.reward_transactions rt
       WHERE rt.profile_id = p_profile_id AND rt.points < 0), 0
    )::INTEGER,
    COALESCE(r.tier::TEXT, 'crew'),
    r.tier_updated_at,
    r.referral_code,
    COALESCE(r.referral_count, 0)::INTEGER
  FROM public.rewards r
  WHERE r.profile_id = p_profile_id;
END;
$$;

-- ── 8. Function: redeem_loyalty_reward ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
  p_profile_id UUID,
  p_reward_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward        public.loyalty_rewards%ROWTYPE;
  v_rewards_row   public.rewards%ROWTYPE;
  v_new_balance   INTEGER;
  v_redemption_id UUID;
BEGIN
  -- Security check
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access denied');
  END IF;

  -- Lock and fetch reward
  SELECT * INTO v_reward FROM public.loyalty_rewards
  WHERE id = p_reward_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Recompensa no disponible');
  END IF;

  -- Check stock
  IF v_reward.stock_limit IS NOT NULL AND v_reward.stock_used >= v_reward.stock_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Recompensa agotada');
  END IF;

  -- Fetch customer rewards row
  SELECT * INTO v_rewards_row FROM public.rewards
  WHERE profile_id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes puntos registrados');
  END IF;

  -- Check balance
  IF v_rewards_row.points_balance < v_reward.points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Puntos insuficientes',
      'required', v_reward.points_required,
      'balance', v_rewards_row.points_balance
    );
  END IF;

  -- Check tier eligibility
  IF v_reward.eligible_tiers IS NOT NULL AND array_length(v_reward.eligible_tiers, 1) > 0 THEN
    IF NOT (v_rewards_row.tier::TEXT = ANY(v_reward.eligible_tiers)) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Tu nivel no es elegible para esta recompensa');
    END IF;
  END IF;

  v_new_balance := v_rewards_row.points_balance - v_reward.points_required;

  -- Insert transaction
  INSERT INTO public.reward_transactions (
    profile_id, transaction_type, points, balance_after, description
  ) VALUES (
    p_profile_id,
    'redeemed'::public.reward_transaction_type,
    -v_reward.points_required,
    v_new_balance,
    'Canje: ' || v_reward.name
  );

  -- Update rewards balance
  UPDATE public.rewards
  SET points_balance = v_new_balance,
      updated_at = now()
  WHERE profile_id = p_profile_id;

  -- Update stock
  UPDATE public.loyalty_rewards
  SET stock_used = stock_used + 1,
      updated_at = now()
  WHERE id = p_reward_id;

  -- Insert redemption record
  INSERT INTO public.loyalty_reward_redemptions (
    profile_id, reward_id, points_spent, balance_after, status
  ) VALUES (
    p_profile_id, p_reward_id, v_reward.points_required, v_new_balance, 'pending'
  ) RETURNING id INTO v_redemption_id;

  -- Insert notification
  INSERT INTO public.notifications (
    profile_id, notification_type, title, body, data
  ) VALUES (
    p_profile_id,
    'reward_redeemed'::public.notification_type,
    '¡Recompensa canjeada!',
    'Canjeaste "' || v_reward.name || '" por ' || v_reward.points_required || ' puntos.',
    jsonb_build_object('reward_id', p_reward_id, 'redemption_id', v_redemption_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recompensa canjeada exitosamente',
    'redemption_id', v_redemption_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- ── 9. Trigger: notify on tier upgrade ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_tier_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier_labels JSONB := '{"crew":"Crew","og":"OG","legend":"Legend","icon":"Icon"}'::JSONB;
BEGIN
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    INSERT INTO public.notifications (
      profile_id, notification_type, title, body, data
    ) VALUES (
      NEW.profile_id,
      'reward_earned'::public.notification_type,
      '¡Subiste de nivel! 🎉',
      'Ahora eres ' || COALESCE(v_tier_labels ->> NEW.tier::TEXT, NEW.tier::TEXT) || '. ¡Felicitaciones!',
      jsonb_build_object('old_tier', OLD.tier::TEXT, 'new_tier', NEW.tier::TEXT)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tier_upgrade ON public.rewards;
CREATE TRIGGER on_tier_upgrade
  AFTER UPDATE OF tier ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tier_upgrade();

-- ── 10. Seed sample loyalty rewards ──────────────────────────────────────────
INSERT INTO public.loyalty_rewards (id, name, description, points_required, reward_type, reward_value, eligible_tiers, sort_order)
VALUES
  (gen_random_uuid(), '5% de descuento',      'Cupón de 5% de descuento en tu próxima compra',   100, 'discount_pct',   5,  ARRAY['crew','og','legend','icon']::TEXT[], 1),
  (gen_random_uuid(), '10% de descuento',     'Cupón de 10% de descuento en tu próxima compra',  250, 'discount_pct',   10, ARRAY['og','legend','icon']::TEXT[],        2),
  (gen_random_uuid(), 'Envío gratis',         'Envío gratuito en tu próxima orden',              300, 'free_shipping',  0,  ARRAY['og','legend','icon']::TEXT[],        3),
  (gen_random_uuid(), '15% de descuento',     'Cupón de 15% de descuento exclusivo',             500, 'discount_pct',   15, ARRAY['legend','icon']::TEXT[],             4),
  (gen_random_uuid(), 'Producto sorpresa',    'Recibe un producto sorpresa de Street Candy',     750, 'product',        0,  ARRAY['legend','icon']::TEXT[],             5),
  (gen_random_uuid(), '20% de descuento',     'Descuento exclusivo para miembros Icon',         1000, 'discount_pct',   20, ARRAY['icon']::TEXT[],                      6)
ON CONFLICT (id) DO NOTHING;
