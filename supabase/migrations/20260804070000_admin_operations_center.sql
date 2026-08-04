-- ============================================================
-- Admin Operations Center
-- Adds admin RLS policies for orders, customers, analytics
-- Adds order_internal_notes table
-- Enables realtime on key tables
-- ============================================================

-- ─── Order Internal Notes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_internal_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_internal_notes' AND policyname = 'admin_all_order_internal_notes'
  ) THEN
    CREATE POLICY admin_all_order_internal_notes ON public.order_internal_notes
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: orders (read all) ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'admin_read_all_orders'
  ) THEN
    CREATE POLICY admin_read_all_orders ON public.orders
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'admin_update_orders'
  ) THEN
    CREATE POLICY admin_update_orders ON public.orders
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: order_items (read all) ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'admin_read_all_order_items'
  ) THEN
    CREATE POLICY admin_read_all_order_items ON public.order_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: profiles (read all customers) ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_read_all_profiles'
  ) THEN
    CREATE POLICY admin_read_all_profiles ON public.profiles
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p2
          WHERE p2.id = auth.uid() AND p2.role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_update_profiles'
  ) THEN
    CREATE POLICY admin_update_profiles ON public.profiles
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p2
          WHERE p2.id = auth.uid() AND p2.role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: rewards ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rewards' AND policyname = 'admin_read_all_rewards'
  ) THEN
    CREATE POLICY admin_read_all_rewards ON public.rewards
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: reward_transactions ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reward_transactions' AND policyname = 'admin_read_all_reward_transactions'
  ) THEN
    CREATE POLICY admin_read_all_reward_transactions ON public.reward_transactions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: notifications ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'admin_read_all_notifications'
  ) THEN
    CREATE POLICY admin_read_all_notifications ON public.notifications
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: addresses ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'admin_read_all_addresses'
  ) THEN
    CREATE POLICY admin_read_all_addresses ON public.addresses
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Admin RLS: inventory ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'admin_read_all_inventory'
  ) THEN
    CREATE POLICY admin_read_all_inventory ON public.inventory
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- ─── Enable Realtime on key tables ───────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards;

-- ─── Performance indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_country_code ON public.orders(country_code);
CREATE INDEX IF NOT EXISTS idx_orders_profile_id ON public.orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_internal_notes_order_id ON public.order_internal_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_profile_id ON public.reward_transactions(profile_id);
