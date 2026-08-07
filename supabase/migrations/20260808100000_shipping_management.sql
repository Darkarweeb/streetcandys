-- ============================================================
-- Street Candy — Shipping Management Module
-- Normalized tables for dynamic admin-managed shipping config
-- ============================================================

-- ── 1. Shipping Methods ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_methods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,           -- 'standard', 'express', 'same_day'
  name          TEXT NOT NULL,
  description   TEXT,
  base_cost_co  NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_cost_cr  NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_time TEXT,                           -- e.g. "3-5 días hábiles"
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Country-level shipping settings ──────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_country_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code             TEXT NOT NULL UNIQUE,  -- 'CO', 'CR'
  is_enabled               BOOLEAN NOT NULL DEFAULT true,
  free_shipping_threshold  NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code            TEXT NOT NULL DEFAULT 'COP',
  currency_symbol          TEXT NOT NULL DEFAULT '$',
  tax_rate                 NUMERIC(5,4) NOT NULL DEFAULT 0.19,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Shipping Regions (Province / State / Department) ─────
CREATE TABLE IF NOT EXISTS public.shipping_regions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  name         TEXT NOT NULL,
  code         TEXT,                             -- optional slug/code
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (country_code, name)
);

-- ── 4. Shipping Rates (per region × method) ─────────────────
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id          UUID NOT NULL REFERENCES public.shipping_regions(id) ON DELETE CASCADE,
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  price              NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (region_id, shipping_method_id)
);

-- ── 5. Same Day Delivery Config ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_same_day_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  cutoff_time      TIME NOT NULL DEFAULT '14:00:00',   -- orders after this → no same day
  available_days   INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],  -- 0=Sun,1=Mon,...,6=Sat
  delivery_message TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shipping_regions_country ON public.shipping_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_region    ON public.shipping_rates(region_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_method    ON public.shipping_rates(shipping_method_id);

-- ── Updated_at trigger function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.set_shipping_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shipping_methods_updated_at ON public.shipping_methods;
CREATE TRIGGER trg_shipping_methods_updated_at
  BEFORE UPDATE ON public.shipping_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_shipping_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_country_settings_updated_at ON public.shipping_country_settings;
CREATE TRIGGER trg_shipping_country_settings_updated_at
  BEFORE UPDATE ON public.shipping_country_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_shipping_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_regions_updated_at ON public.shipping_regions;
CREATE TRIGGER trg_shipping_regions_updated_at
  BEFORE UPDATE ON public.shipping_regions
  FOR EACH ROW EXECUTE FUNCTION public.set_shipping_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_rates_updated_at ON public.shipping_rates;
CREATE TRIGGER trg_shipping_rates_updated_at
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_shipping_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_same_day_config_updated_at ON public.shipping_same_day_config;
CREATE TRIGGER trg_shipping_same_day_config_updated_at
  BEFORE UPDATE ON public.shipping_same_day_config
  FOR EACH ROW EXECUTE FUNCTION public.set_shipping_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_same_day_config ENABLE ROW LEVEL SECURITY;

-- Public read (checkout needs to read shipping config)
DROP POLICY IF EXISTS "public_read_shipping_methods" ON public.shipping_methods;
CREATE POLICY "public_read_shipping_methods" ON public.shipping_methods
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_shipping_country_settings" ON public.shipping_country_settings;
CREATE POLICY "public_read_shipping_country_settings" ON public.shipping_country_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_shipping_regions" ON public.shipping_regions;
CREATE POLICY "public_read_shipping_regions" ON public.shipping_regions
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_shipping_rates" ON public.shipping_rates;
CREATE POLICY "public_read_shipping_rates" ON public.shipping_rates
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_shipping_same_day_config" ON public.shipping_same_day_config;
CREATE POLICY "public_read_shipping_same_day_config" ON public.shipping_same_day_config
  FOR SELECT TO public USING (true);

-- Admin write (service role key bypasses RLS; also allow authenticated admins)
DROP POLICY IF EXISTS "admin_manage_shipping_methods" ON public.shipping_methods;
CREATE POLICY "admin_manage_shipping_methods" ON public.shipping_methods
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_shipping_country_settings" ON public.shipping_country_settings;
CREATE POLICY "admin_manage_shipping_country_settings" ON public.shipping_country_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_shipping_regions" ON public.shipping_regions;
CREATE POLICY "admin_manage_shipping_regions" ON public.shipping_regions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_shipping_rates" ON public.shipping_rates;
CREATE POLICY "admin_manage_shipping_rates" ON public.shipping_rates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_shipping_same_day_config" ON public.shipping_same_day_config;
CREATE POLICY "admin_manage_shipping_same_day_config" ON public.shipping_same_day_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Seed Data ─────────────────────────────────────────────────
DO $$
DECLARE
  v_standard_id UUID;
  v_express_id  UUID;
  v_sameday_id  UUID;
  v_co_sj_id    UUID;
  v_co_ant_id   UUID;
  v_co_val_id   UUID;
  v_co_atl_id   UUID;
  v_cr_sj_id    UUID;
  v_cr_al_id    UUID;
  v_cr_ca_id    UUID;
BEGIN

  -- Shipping Methods
  INSERT INTO public.shipping_methods (id, code, name, description, base_cost_co, base_cost_cr, delivery_time, display_order, is_active)
  VALUES
    (gen_random_uuid(), 'standard', 'Envío estándar',  '3–5 días hábiles',  12000, 3500, '3-5 días hábiles',  1, true),
    (gen_random_uuid(), 'express',  'Envío express',   '1–2 días hábiles',  20000, 5500, '1-2 días hábiles',  2, true),
    (gen_random_uuid(), 'same_day', 'Envío mismo día', 'Entrega hoy',       25000, 8500, 'Hoy (antes del corte)', 3, true)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_standard_id FROM public.shipping_methods WHERE code = 'standard' LIMIT 1;
  SELECT id INTO v_express_id  FROM public.shipping_methods WHERE code = 'express'  LIMIT 1;
  SELECT id INTO v_sameday_id  FROM public.shipping_methods WHERE code = 'same_day' LIMIT 1;

  -- Country Settings
  INSERT INTO public.shipping_country_settings (country_code, is_enabled, free_shipping_threshold, currency_code, currency_symbol, tax_rate)
  VALUES
    ('CO', true, 350000, 'COP', '$',  0.19),
    ('CR', true,  45000, 'CRC', '₡', 0.13)
  ON CONFLICT (country_code) DO NOTHING;

  -- Colombia Regions
  INSERT INTO public.shipping_regions (id, country_code, name, code, is_active)
  VALUES
    (gen_random_uuid(), 'CO', 'Bogotá D.C.',       'bogota',    true),
    (gen_random_uuid(), 'CO', 'Antioquia',          'antioquia', true),
    (gen_random_uuid(), 'CO', 'Valle del Cauca',    'valle',     true),
    (gen_random_uuid(), 'CO', 'Atlántico',          'atlantico', true),
    (gen_random_uuid(), 'CO', 'Cundinamarca',       'cundi',     true),
    (gen_random_uuid(), 'CO', 'Santander',          'santander', true),
    (gen_random_uuid(), 'CO', 'Bolívar',            'bolivar',   true),
    (gen_random_uuid(), 'CO', 'Nariño',             'narino',    true),
    (gen_random_uuid(), 'CO', 'Córdoba',            'cordoba',   true),
    (gen_random_uuid(), 'CO', 'Tolima',             'tolima',    true),
    (gen_random_uuid(), 'CO', 'Cauca',              'cauca',     true),
    (gen_random_uuid(), 'CO', 'Huila',              'huila',     true),
    (gen_random_uuid(), 'CO', 'Magdalena',          'magdalena', true),
    (gen_random_uuid(), 'CO', 'Cesar',              'cesar',     true),
    (gen_random_uuid(), 'CO', 'Meta',               'meta',      true),
    (gen_random_uuid(), 'CO', 'Risaralda',          'risaralda', true),
    (gen_random_uuid(), 'CO', 'Caldas',             'caldas',    true),
    (gen_random_uuid(), 'CO', 'Quindío',            'quindio',   true),
    (gen_random_uuid(), 'CO', 'Sucre',              'sucre',     true),
    (gen_random_uuid(), 'CO', 'Chocó',              'choco',     true),
    (gen_random_uuid(), 'CO', 'Norte de Santander', 'nsantander',true),
    (gen_random_uuid(), 'CO', 'Boyacá',             'boyaca',    true),
    (gen_random_uuid(), 'CO', 'Arauca',             'arauca',    true),
    (gen_random_uuid(), 'CO', 'Casanare',           'casanare',  true),
    (gen_random_uuid(), 'CO', 'Putumayo',           'putumayo',  true),
    (gen_random_uuid(), 'CO', 'Amazonas',           'amazonas',  true),
    (gen_random_uuid(), 'CO', 'Guainía',            'guainia',   true),
    (gen_random_uuid(), 'CO', 'Guaviare',           'guaviare',  true),
    (gen_random_uuid(), 'CO', 'Vaupés',             'vaupes',    true),
    (gen_random_uuid(), 'CO', 'Vichada',            'vichada',   true),
    (gen_random_uuid(), 'CO', 'San Andrés',         'sanandres', true),
    (gen_random_uuid(), 'CO', 'La Guajira',         'guajira',   true)
  ON CONFLICT (country_code, name) DO NOTHING;

  -- Costa Rica Regions
  INSERT INTO public.shipping_regions (id, country_code, name, code, is_active)
  VALUES
    (gen_random_uuid(), 'CR', 'San José',    'san_jose',    true),
    (gen_random_uuid(), 'CR', 'Alajuela',    'alajuela',    true),
    (gen_random_uuid(), 'CR', 'Cartago',     'cartago',     true),
    (gen_random_uuid(), 'CR', 'Heredia',     'heredia',     true),
    (gen_random_uuid(), 'CR', 'Guanacaste',  'guanacaste',  true),
    (gen_random_uuid(), 'CR', 'Puntarenas',  'puntarenas',  true),
    (gen_random_uuid(), 'CR', 'Limón',       'limon',       true)
  ON CONFLICT (country_code, name) DO NOTHING;

  -- Seed rates for key CO regions
  SELECT id INTO v_co_sj_id  FROM public.shipping_regions WHERE country_code='CO' AND name='Bogotá D.C.'    LIMIT 1;
  SELECT id INTO v_co_ant_id FROM public.shipping_regions WHERE country_code='CO' AND name='Antioquia'       LIMIT 1;
  SELECT id INTO v_co_val_id FROM public.shipping_regions WHERE country_code='CO' AND name='Valle del Cauca' LIMIT 1;
  SELECT id INTO v_co_atl_id FROM public.shipping_regions WHERE country_code='CO' AND name='Atlántico'       LIMIT 1;

  IF v_co_sj_id IS NOT NULL AND v_standard_id IS NOT NULL THEN
    INSERT INTO public.shipping_rates (region_id, shipping_method_id, price, is_enabled)
    VALUES
      (v_co_sj_id,  v_standard_id, 10000, true),
      (v_co_sj_id,  v_express_id,  18000, true),
      (v_co_sj_id,  v_sameday_id,  25000, true),
      (v_co_ant_id, v_standard_id, 12000, true),
      (v_co_ant_id, v_express_id,  20000, true),
      (v_co_ant_id, v_sameday_id,  28000, false),
      (v_co_val_id, v_standard_id, 12000, true),
      (v_co_val_id, v_express_id,  20000, true),
      (v_co_val_id, v_sameday_id,  28000, false),
      (v_co_atl_id, v_standard_id, 14000, true),
      (v_co_atl_id, v_express_id,  22000, true),
      (v_co_atl_id, v_sameday_id,  30000, false)
    ON CONFLICT (region_id, shipping_method_id) DO NOTHING;
  END IF;

  -- Seed rates for CR regions
  SELECT id INTO v_cr_sj_id FROM public.shipping_regions WHERE country_code='CR' AND name='San José'  LIMIT 1;
  SELECT id INTO v_cr_al_id FROM public.shipping_regions WHERE country_code='CR' AND name='Alajuela'  LIMIT 1;
  SELECT id INTO v_cr_ca_id FROM public.shipping_regions WHERE country_code='CR' AND name='Cartago'   LIMIT 1;

  IF v_cr_sj_id IS NOT NULL AND v_standard_id IS NOT NULL THEN
    INSERT INTO public.shipping_rates (region_id, shipping_method_id, price, is_enabled)
    VALUES
      (v_cr_sj_id, v_standard_id, 3500, true),
      (v_cr_sj_id, v_express_id,  6500, true),
      (v_cr_sj_id, v_sameday_id,  8500, true),
      (v_cr_al_id, v_standard_id, 4000, true),
      (v_cr_al_id, v_express_id,  7000, true),
      (v_cr_al_id, v_sameday_id,  9000, false),
      (v_cr_ca_id, v_standard_id, 4000, true),
      (v_cr_ca_id, v_express_id,  7000, true),
      (v_cr_ca_id, v_sameday_id,  9000, false)
    ON CONFLICT (region_id, shipping_method_id) DO NOTHING;
  END IF;

  -- Same Day Config
  IF v_sameday_id IS NOT NULL THEN
    INSERT INTO public.shipping_same_day_config (shipping_method_id, cutoff_time, available_days, delivery_message, is_active)
    VALUES (
      v_sameday_id,
      '14:00:00',
      ARRAY[1,2,3,4,5],
      'Pedidos antes de las 2:00 PM. Entrega hoy mismo.',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Shipping seed data error: %', SQLERRM;
END $$;
