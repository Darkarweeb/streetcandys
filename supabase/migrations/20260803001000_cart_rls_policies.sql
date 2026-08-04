-- ============================================================
-- Street Candy — Políticas RLS del Módulo de Carrito
-- Migration: 20260803001000_cart_rls_policies.sql
-- ============================================================

-- ============================================================
-- POLÍTICAS RLS: cart
-- ============================================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "cart_select_own" ON public.cart;
DROP POLICY IF EXISTS "cart_insert_own" ON public.cart;
DROP POLICY IF EXISTS "cart_update_own" ON public.cart;
DROP POLICY IF EXISTS "cart_delete_own" ON public.cart;
DROP POLICY IF EXISTS "cart_guest_select" ON public.cart;
DROP POLICY IF EXISTS "cart_guest_insert" ON public.cart;
DROP POLICY IF EXISTS "cart_guest_update" ON public.cart;
DROP POLICY IF EXISTS "cart_guest_delete" ON public.cart;

-- Habilitar RLS (ya habilitado en schema inicial, pero idempotente)
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

-- Usuario autenticado: puede ver su propio carrito
CREATE POLICY "cart_select_own"
  ON public.cart
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Usuario autenticado: puede crear su carrito
CREATE POLICY "cart_insert_own"
  ON public.cart
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
    AND session_id IS NULL
  );

-- Usuario autenticado: puede actualizar su carrito
CREATE POLICY "cart_update_own"
  ON public.cart
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Usuario autenticado: puede eliminar su carrito
CREATE POLICY "cart_delete_own"
  ON public.cart
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Invitado: puede ver su carrito por session_id (acceso desde service role en API routes)
-- Las rutas de API usan el cliente de servidor con anon key, por lo que
-- los carritos de invitado se gestionan a través de service role en el servidor.
-- Esta política permite acceso de lectura a carritos sin profile_id.
CREATE POLICY "cart_guest_select"
  ON public.cart
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND profile_id IS NULL
    AND session_id IS NOT NULL
  );

CREATE POLICY "cart_guest_insert"
  ON public.cart
  FOR INSERT
  WITH CHECK (
    profile_id IS NULL
    AND session_id IS NOT NULL
  );

CREATE POLICY "cart_guest_update"
  ON public.cart
  FOR UPDATE
  USING (
    profile_id IS NULL
    AND session_id IS NOT NULL
  )
  WITH CHECK (
    profile_id IS NULL
    AND session_id IS NOT NULL
  );

CREATE POLICY "cart_guest_delete"
  ON public.cart
  FOR DELETE
  USING (
    profile_id IS NULL
    AND session_id IS NOT NULL
  );

-- ============================================================
-- POLÍTICAS RLS: cart_items
-- ============================================================

DROP POLICY IF EXISTS "cart_items_select_own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_insert_own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_update_own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_delete_own" ON public.cart_items;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Seleccionar ítems del carrito propio (usuario autenticado)
CREATE POLICY "cart_items_select_own"
  ON public.cart_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.profile_id = auth.uid())
          OR (auth.uid() IS NULL AND c.profile_id IS NULL AND c.session_id IS NOT NULL)
        )
    )
  );

-- Insertar ítems en el carrito propio
CREATE POLICY "cart_items_insert_own"
  ON public.cart_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.profile_id = auth.uid())
          OR (auth.uid() IS NULL AND c.profile_id IS NULL AND c.session_id IS NOT NULL)
        )
    )
  );

-- Actualizar ítems del carrito propio
CREATE POLICY "cart_items_update_own"
  ON public.cart_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.profile_id = auth.uid())
          OR (auth.uid() IS NULL AND c.profile_id IS NULL AND c.session_id IS NOT NULL)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.profile_id = auth.uid())
          OR (auth.uid() IS NULL AND c.profile_id IS NULL AND c.session_id IS NOT NULL)
        )
    )
  );

-- Eliminar ítems del carrito propio
CREATE POLICY "cart_items_delete_own"
  ON public.cart_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.profile_id = auth.uid())
          OR (auth.uid() IS NULL AND c.profile_id IS NULL AND c.session_id IS NOT NULL)
        )
    )
  );

-- ============================================================
-- POLÍTICAS RLS: coupons (lectura pública para validación)
-- ============================================================

DROP POLICY IF EXISTS "coupons_select_active" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer cupones activos (para validación en carrito)
CREATE POLICY "coupons_select_active"
  ON public.coupons
  FOR SELECT
  USING (is_active = TRUE);

-- Admin puede gestionar todos los cupones
CREATE POLICY "coupons_admin_all"
  ON public.coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'staff')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: rewards (lectura propia)
-- ============================================================

DROP POLICY IF EXISTS "rewards_select_own" ON public.rewards;
DROP POLICY IF EXISTS "rewards_admin_all" ON public.rewards;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Usuario puede ver sus propias recompensas
CREATE POLICY "rewards_select_own"
  ON public.rewards
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Admin puede gestionar todas las recompensas
CREATE POLICY "rewards_admin_all"
  ON public.rewards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'staff')
    )
  );

-- ============================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO DEL CARRITO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cart_profile_id ON public.cart(profile_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_updated_at ON public.cart(updated_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON public.cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_rewards_profile_id ON public.rewards(profile_id);
