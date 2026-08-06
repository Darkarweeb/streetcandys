-- ============================================================
-- Street Candy — Fix handle_new_user() role sanitization
-- Migration: 20260805700000_fix_handle_new_user_role_sanitize.sql
--
-- ROOT CAUSE:
--   handle_new_user() casts raw_user_meta_data->>'role' directly to
--   public.user_role. If the frontend passes any value outside
--   ('customer', 'admin', 'staff'), PostgreSQL raises:
--     ERROR: invalid input value for enum user_role: "<value>"
--     SQLSTATE: 22P02 (invalid_text_representation)
--   This exception is NOT caught by the existing unique_violation
--   handler, so it propagates and rolls back the auth.users INSERT,
--   causing brand-new signups to fail.
--
--   Secondary risk: if country_code is not in public.countries,
--   the FK constraint raises foreign_key_violation (23503), also
--   not caught, also killing the signup.
--
-- FIX (minimum change):
--   1. Sanitize the role value BEFORE casting:
--      - Allow only: 'customer', 'admin', 'staff'
--      - Any other value (including NULL, empty string, or unknown)
--        safely defaults to 'customer'.
--   2. Protect country_code:
--      - Only use the provided value if it exists in public.countries.
--      - Otherwise use NULL (no FK violation, no signup failure).
--
-- SCOPE: Only public.handle_new_user() is changed.
-- NOT TOUCHED: Trigger, RLS policies, is_admin(), any other object.
-- PRESERVED: SECURITY DEFINER, SET search_path = public,
--            ON CONFLICT (id) DO NOTHING, unique_violation handler.
-- ============================================================


-- ── Update handle_new_user() with role sanitization ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role        public.user_role;
  v_country     TEXT;
  v_raw_role    TEXT;
  v_raw_country TEXT;
BEGIN
  -- Sanitize role: only allow valid enum values; default to 'customer'
  v_raw_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')));
  IF v_raw_role IN ('customer', 'admin', 'staff') THEN
    v_role := v_raw_role::public.user_role;
  ELSE
    v_role := 'customer'::public.user_role;
  END IF;

  -- Protect country_code: use NULL if value is missing or not in countries table
  v_raw_country := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), '');
  IF v_raw_country IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.countries WHERE code = v_raw_country
  ) THEN
    v_country := v_raw_country;
  ELSE
    v_country := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    country_code,
    age_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    v_role,
    v_country,
    false,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    -- A profile row already exists with this email (stale from a prior
    -- partial signup). Preserve the existing row and allow auth.users
    -- INSERT to complete normally.
    RETURN NEW;
END;
$$;


-- ── Verification ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_func_body TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_func_body
  FROM pg_proc
  WHERE proname = 'handle_new_user'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not exist';
  END IF;

  IF v_func_body NOT LIKE '%v_raw_role%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not contain role sanitization';
  END IF;

  IF v_func_body NOT LIKE '%search_path%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() missing SET search_path';
  END IF;

  IF v_func_body NOT LIKE '%unique_violation%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() missing unique_violation handler';
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() updated with role sanitization and country_code protection.';
  RAISE NOTICE 'Invalid role values now default to customer. Invalid country_code now defaults to NULL.';
END $$;
