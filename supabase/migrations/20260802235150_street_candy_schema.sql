-- ============================================================
-- Street Candy — Complete Database Schema
-- Migration: 20260802235150_street_candy_schema.sql
-- Tables: profiles, countries, categories, products,
--         product_variants, inventory, cart, cart_items,
--         orders, order_items, addresses, reviews, rewards,
--         reward_transactions, coupons, coupon_redemptions,
--         wishlist, notifications, blog_posts, blog_categories,
--         settings
-- ============================================================

-- ============================================================
-- STEP 1: ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'staff');

DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped',
  'delivered', 'cancelled', 'refunded'
);

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
);

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM (
  'stripe', 'pse', 'nequi', 'bancolombia',
  'sinpe_movil', 'bank_transfer'
);

DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM (
  'order_confirmed', 'order_shipped', 'order_delivered',
  'order_cancelled', 'reward_earned', 'reward_redeemed',
  'coupon_applied', 'review_approved', 'system'
);

DROP TYPE IF EXISTS public.reward_transaction_type CASCADE;
CREATE TYPE public.reward_transaction_type AS ENUM (
  'earned_purchase', 'earned_review', 'earned_referral',
  'redeemed', 'expired', 'adjusted'
);

DROP TYPE IF EXISTS public.reward_tier CASCADE;
CREATE TYPE public.reward_tier AS ENUM ('crew', 'og', 'legend', 'icon');

DROP TYPE IF EXISTS public.blog_post_status CASCADE;
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published', 'archived');

DROP TYPE IF EXISTS public.variant_type CASCADE;
CREATE TYPE public.variant_type AS ENUM ('size', 'flavor', 'strength', 'format');

-- ============================================================
-- STEP 2: CORE TABLES (no foreign keys to other public tables)
-- ============================================================

-- countries
CREATE TABLE IF NOT EXISTS public.countries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          CHAR(2) NOT NULL UNIQUE,          -- 'CO', 'CR'
  name          TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL,                 -- 'COP', 'CRC'
  currency_symbol TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'es-419',
  tax_rate      NUMERIC(5,4) NOT NULL DEFAULT 0,  -- e.g. 0.19 for 19%
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  shipping_config JSONB NOT NULL DEFAULT '{}',
  payment_methods TEXT[] NOT NULL DEFAULT '{}',
  legal_config  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- settings
CREATE TABLE IF NOT EXISTS public.settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  value         JSONB NOT NULL DEFAULT '{}',
  country_code  CHAR(2) REFERENCES public.countries(code) ON DELETE SET NULL,
  description   TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- blog_categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  meta_title    TEXT,
  meta_description TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  icon_name     TEXT,
  meta_title    TEXT,
  meta_description TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  description       TEXT,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value    NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_discount  NUMERIC(10,2),
  usage_limit       INTEGER,
  usage_count       INTEGER NOT NULL DEFAULT 0,
  per_user_limit    INTEGER NOT NULL DEFAULT 1,
  country_code      CHAR(2) REFERENCES public.countries(code) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 3: PROFILES (references auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  avatar_url    TEXT,
  role          public.user_role NOT NULL DEFAULT 'customer',
  country_code  CHAR(2) REFERENCES public.countries(code) ON DELETE SET NULL,
  date_of_birth DATE,
  age_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  referral_code TEXT UNIQUE,
  referred_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 4: PRODUCT TABLES
-- ============================================================

-- products
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  ingredients       TEXT,
  usage_instructions TEXT,
  origin_country    TEXT NOT NULL DEFAULT 'United States',
  brand             TEXT,
  sku               TEXT UNIQUE,
  base_price        NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  compare_at_price  NUMERIC(10,2),
  images            JSONB NOT NULL DEFAULT '[]',
  thumbnail_url     TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  effects           TEXT[] NOT NULL DEFAULT '{}',
  intensity_level   SMALLINT CHECK (intensity_level BETWEEN 1 AND 5),
  cannabinoid_profile JSONB NOT NULL DEFAULT '{}',
  terpene_profile   JSONB NOT NULL DEFAULT '{}',
  coa_url           TEXT,
  lab_report_url    TEXT,
  educational_content TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  requires_age_verification BOOLEAN NOT NULL DEFAULT TRUE,
  meta_title        TEXT,
  meta_description  TEXT,
  weight_grams      NUMERIC(8,2),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type  public.variant_type NOT NULL,
  name          TEXT NOT NULL,
  value         TEXT NOT NULL,
  sku           TEXT UNIQUE,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  images        JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  allow_backorder   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, variant_id)
);

-- ============================================================
-- STEP 5: ADDRESSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Casa',
  full_name     TEXT NOT NULL,
  phone         TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state_province TEXT NOT NULL,
  postal_code   TEXT,
  country_code  CHAR(2) NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 6: CART
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id    TEXT UNIQUE,
  country_code  CHAR(2) REFERENCES public.countries(code) ON DELETE SET NULL,
  coupon_id     UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cart_owner_check CHECK (
    (profile_id IS NOT NULL AND session_id IS NULL) OR
    (profile_id IS NULL AND session_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id       UUID NOT NULL REFERENCES public.cart(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id, variant_id)
);

-- ============================================================
-- STEP 7: ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT NOT NULL UNIQUE,
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  country_code        CHAR(2) NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
  shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  billing_address_id  UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  status              public.order_status NOT NULL DEFAULT 'pending',
  payment_status      public.payment_status NOT NULL DEFAULT 'pending',
  payment_method      public.payment_method,
  payment_reference   TEXT,
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_cost       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  tax_rate_snapshot   NUMERIC(5,4) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  currency_code       CHAR(3) NOT NULL,
  coupon_id           UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code_snapshot TEXT,
  notes               TEXT,
  tracking_number     TEXT,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id      UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  variant_name    TEXT,
  sku_snapshot    TEXT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price     NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 8: REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, profile_id, order_id)
);

-- ============================================================
-- STEP 9: REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rewards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance        INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  points_lifetime       INTEGER NOT NULL DEFAULT 0 CHECK (points_lifetime >= 0),
  tier                  public.reward_tier NOT NULL DEFAULT 'crew',
  tier_updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referral_code         TEXT UNIQUE,
  referral_count        INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type public.reward_transaction_type NOT NULL,
  points          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL CHECK (balance_after >= 0),
  description     TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 10: COUPON REDEMPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id     UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_applied NUMERIC(10,2) NOT NULL CHECK (discount_applied >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, order_id)
);

-- ============================================================
-- STEP 11: WISHLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wishlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, product_id)
);

-- ============================================================
-- STEP 12: NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type public.notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB NOT NULL DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 13: BLOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  excerpt         TEXT,
  content         TEXT,
  cover_image_url TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  status          public.blog_post_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  view_count      INTEGER NOT NULL DEFAULT 0,
  read_time_minutes INTEGER,
  meta_title      TEXT,
  meta_description TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 14: INDEXES
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- countries
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON public.countries(is_active);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- products
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_effects ON public.products USING GIN(effects);

-- product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

-- inventory
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);

-- addresses
CREATE INDEX IF NOT EXISTS idx_addresses_profile_id ON public.addresses(profile_id);
CREATE INDEX IF NOT EXISTS idx_addresses_country_code ON public.addresses(country_code);

-- cart
CREATE INDEX IF NOT EXISTS idx_cart_profile_id ON public.cart(profile_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);

-- cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_profile_id ON public.orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_country_code ON public.orders(country_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_profile_id ON public.reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved);

-- rewards
CREATE INDEX IF NOT EXISTS idx_rewards_profile_id ON public.rewards(profile_id);
CREATE INDEX IF NOT EXISTS idx_rewards_tier ON public.rewards(tier);

-- reward_transactions
CREATE INDEX IF NOT EXISTS idx_reward_transactions_profile_id ON public.reward_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_order_id ON public.reward_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON public.reward_transactions(created_at DESC);

-- coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_country_code ON public.coupons(country_code);

-- coupon_redemptions
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_profile_id ON public.coupon_redemptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order_id ON public.coupon_redemptions(order_id);

-- wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_profile_id ON public.wishlist(profile_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist(product_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_blog_category_id ON public.blog_posts(blog_category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING GIN(tags);

-- blog_categories
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_country_code ON public.settings(country_code);

-- ============================================================
-- STEP 15: HELPER FUNCTIONS (must be before RLS policies)
-- ============================================================

-- Check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

-- Check if the current user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'staff')
  )
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Handle new auth user → create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Generate unique order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_number TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_number := 'SC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(
      SELECT 1 FROM public.orders WHERE order_number = v_number
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$;

-- Auto-assign order number before insert
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 16: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 17: RLS POLICIES
-- ============================================================

-- ---- profiles ----
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
ON public.profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---- countries ----
DROP POLICY IF EXISTS "countries_public_read" ON public.countries;
CREATE POLICY "countries_public_read"
ON public.countries FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "countries_admin_all" ON public.countries;
CREATE POLICY "countries_admin_all"
ON public.countries FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---- categories ----
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
ON public.categories FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all"
ON public.categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---- products ----
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
ON public.products FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all"
ON public.products FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- product_variants ----
DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read"
ON public.product_variants FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all"
ON public.product_variants FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- inventory ----
DROP POLICY IF EXISTS "inventory_public_read" ON public.inventory;
CREATE POLICY "inventory_public_read"
ON public.inventory FOR SELECT TO public
USING (TRUE);

DROP POLICY IF EXISTS "inventory_admin_all" ON public.inventory;
CREATE POLICY "inventory_admin_all"
ON public.inventory FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- cart ----
DROP POLICY IF EXISTS "cart_select_own" ON public.cart;
CREATE POLICY "cart_select_own"
ON public.cart FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "cart_insert_own" ON public.cart;
CREATE POLICY "cart_insert_own"
ON public.cart FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "cart_update_own" ON public.cart;
CREATE POLICY "cart_update_own"
ON public.cart FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "cart_delete_own" ON public.cart;
CREATE POLICY "cart_delete_own"
ON public.cart FOR DELETE TO authenticated
USING (profile_id = auth.uid());

-- ---- cart_items ----
DROP POLICY IF EXISTS "cart_items_select_own" ON public.cart_items;
CREATE POLICY "cart_items_select_own"
ON public.cart_items FOR SELECT TO authenticated
USING (
  cart_id IN (
    SELECT id FROM public.cart WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cart_items_insert_own" ON public.cart_items;
CREATE POLICY "cart_items_insert_own"
ON public.cart_items FOR INSERT TO authenticated
WITH CHECK (
  cart_id IN (
    SELECT id FROM public.cart WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cart_items_update_own" ON public.cart_items;
CREATE POLICY "cart_items_update_own"
ON public.cart_items FOR UPDATE TO authenticated
USING (
  cart_id IN (
    SELECT id FROM public.cart WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  cart_id IN (
    SELECT id FROM public.cart WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cart_items_delete_own" ON public.cart_items;
CREATE POLICY "cart_items_delete_own"
ON public.cart_items FOR DELETE TO authenticated
USING (
  cart_id IN (
    SELECT id FROM public.cart WHERE profile_id = auth.uid()
  )
);

-- ---- orders ----
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
ON public.orders FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own"
ON public.orders FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
ON public.orders FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- order_items ----
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
ON public.order_items FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_insert_own" ON public.order_items;
CREATE POLICY "order_items_insert_own"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all"
ON public.order_items FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- addresses ----
DROP POLICY IF EXISTS "addresses_manage_own" ON public.addresses;
CREATE POLICY "addresses_manage_own"
ON public.addresses FOR ALL TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "addresses_admin_all" ON public.addresses;
CREATE POLICY "addresses_admin_all"
ON public.addresses FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- reviews ----
DROP POLICY IF EXISTS "reviews_public_read_approved" ON public.reviews;
CREATE POLICY "reviews_public_read_approved"
ON public.reviews FOR SELECT TO public
USING (is_approved = TRUE);

DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
CREATE POLICY "reviews_select_own"
ON public.reviews FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_insert_own"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own"
ON public.reviews FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own"
ON public.reviews FOR DELETE TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all"
ON public.reviews FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- rewards ----
DROP POLICY IF EXISTS "rewards_select_own" ON public.rewards;
CREATE POLICY "rewards_select_own"
ON public.rewards FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "rewards_admin_all" ON public.rewards;
CREATE POLICY "rewards_admin_all"
ON public.rewards FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- reward_transactions ----
DROP POLICY IF EXISTS "reward_transactions_select_own" ON public.reward_transactions;
CREATE POLICY "reward_transactions_select_own"
ON public.reward_transactions FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "reward_transactions_admin_all" ON public.reward_transactions;
CREATE POLICY "reward_transactions_admin_all"
ON public.reward_transactions FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- coupons ----
DROP POLICY IF EXISTS "coupons_public_read_active" ON public.coupons;
CREATE POLICY "coupons_public_read_active"
ON public.coupons FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
ON public.coupons FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- coupon_redemptions ----
DROP POLICY IF EXISTS "coupon_redemptions_select_own" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_select_own"
ON public.coupon_redemptions FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "coupon_redemptions_insert_own" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_insert_own"
ON public.coupon_redemptions FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "coupon_redemptions_admin_all" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_admin_all"
ON public.coupon_redemptions FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- wishlist ----
DROP POLICY IF EXISTS "wishlist_manage_own" ON public.wishlist;
CREATE POLICY "wishlist_manage_own"
ON public.wishlist FOR ALL TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- ---- notifications ----
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- blog_posts ----
DROP POLICY IF EXISTS "blog_posts_public_read_published" ON public.blog_posts;
CREATE POLICY "blog_posts_public_read_published"
ON public.blog_posts FOR SELECT TO public
USING (status = 'published');

DROP POLICY IF EXISTS "blog_posts_admin_all" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_all"
ON public.blog_posts FOR ALL TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

-- ---- blog_categories ----
DROP POLICY IF EXISTS "blog_categories_public_read" ON public.blog_categories;
CREATE POLICY "blog_categories_public_read"
ON public.blog_categories FOR SELECT TO public
USING (is_active = TRUE);

DROP POLICY IF EXISTS "blog_categories_admin_all" ON public.blog_categories;
CREATE POLICY "blog_categories_admin_all"
ON public.blog_categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---- settings ----
DROP POLICY IF EXISTS "settings_public_read_public" ON public.settings;
CREATE POLICY "settings_public_read_public"
ON public.settings FOR SELECT TO public
USING (is_public = TRUE);

DROP POLICY IF EXISTS "settings_admin_all" ON public.settings;
CREATE POLICY "settings_admin_all"
ON public.settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- STEP 18: TRIGGERS
-- ============================================================

-- Auto-create profile on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign order number
DROP TRIGGER IF EXISTS assign_order_number_trigger ON public.orders;
CREATE TRIGGER assign_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_countries ON public.countries;
CREATE TRIGGER set_updated_at_countries
  BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_categories ON public.categories;
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_product_variants ON public.product_variants;
CREATE TRIGGER set_updated_at_product_variants
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_inventory ON public.inventory;
CREATE TRIGGER set_updated_at_inventory
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cart ON public.cart;
CREATE TRIGGER set_updated_at_cart
  BEFORE UPDATE ON public.cart
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cart_items ON public.cart_items;
CREATE TRIGGER set_updated_at_cart_items
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_addresses ON public.addresses;
CREATE TRIGGER set_updated_at_addresses
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_reviews ON public.reviews;
CREATE TRIGGER set_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rewards ON public.rewards;
CREATE TRIGGER set_updated_at_rewards
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_coupons ON public.coupons;
CREATE TRIGGER set_updated_at_coupons
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_blog_posts ON public.blog_posts;
CREATE TRIGGER set_updated_at_blog_posts
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_blog_categories ON public.blog_categories;
CREATE TRIGGER set_updated_at_blog_categories
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_settings ON public.settings;
CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STEP 19: SEED COUNTRIES (Colombia & Costa Rica)
-- ============================================================

INSERT INTO public.countries (code, name, currency_code, currency_symbol, locale, tax_rate, is_active, shipping_config, payment_methods, legal_config)
VALUES
  (
    'CO',
    'Colombia',
    'COP',
    '$',
    'es-CO',
    0.19,
    TRUE,
    '{"carriers": ["Servientrega", "Coordinadora", "Deprisa"], "free_shipping_threshold": 150000, "estimated_days": "3-5"}'::jsonb,
    ARRAY['stripe', 'pse', 'nequi', 'bancolombia'],
    '{"min_age": 18, "age_verification_required": true, "regulatory_body": "INVIMA", "disclaimer_key": "legal.disclaimer.co"}'::jsonb
  ),
  (
    'CR',
    'Costa Rica',
    'CRC',
    '₡',
    'es-CR',
    0.13,
    TRUE,
    '{"carriers": ["Correos de Costa Rica", "DHL", "FedEx"], "free_shipping_threshold": 50000, "estimated_days": "2-4"}'::jsonb,
    ARRAY['stripe', 'sinpe_movil', 'bank_transfer'],
    '{"min_age": 18, "age_verification_required": true, "regulatory_body": "MINSA", "disclaimer_key": "legal.disclaimer.cr"}'::jsonb
  )
ON CONFLICT (code) DO NOTHING;
