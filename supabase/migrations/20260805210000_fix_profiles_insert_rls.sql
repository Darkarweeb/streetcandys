-- =============================================================================
-- FORENSIC FIX: profiles INSERT RLS — allow trigger (service_role) to insert
-- =============================================================================
--
-- ROOT CAUSE IDENTIFIED:
--
-- Migration 20260804150000_fix_admin_rls_and_policies.sql drops ALL INSERT
-- policies on profiles and replaces them with:
--
--   CREATE POLICY "profiles_insert_own"
--     ON public.profiles FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = id);
--
-- This policy is scoped to the `authenticated` role ONLY.
--
-- The handle_new_user() trigger runs as SECURITY DEFINER under the
-- `supabase_auth_admin` / `postgres` role — NOT as `authenticated`.
-- When Supabase Auth inserts a new user, the trigger fires BEFORE the user
-- has a session (they haven't confirmed email yet), so auth.uid() = NULL.
--
-- Result: WITH CHECK (auth.uid() = id) evaluates to (NULL = <uuid>) = FALSE
-- → INSERT is blocked by RLS → trigger raises an exception
-- → auth.users INSERT propagates the error → client receives opaque {}
--
-- SECONDARY ISSUE:
-- Migration 20260805140000_fix_security_warnings.sql ran:
--   ALTER FUNCTION public.handle_new_user() SET search_path = '';
-- This was applied BEFORE 20260805200000_fix_registration_trigger.sql
-- which re-creates the function with SET search_path = public, auth.
-- However, the ALTER in 20260805140000 may have overridden the SET clause
-- in the function body if the function was not yet recreated at that point.
-- The 20260805200000 migration fixes this by using CREATE OR REPLACE with
-- the correct SET search_path = public, auth in the function definition.
--
-- THE FIX:
-- Add a policy that allows service_role (and postgres/supabase_auth_admin)
-- to INSERT into profiles unconditionally. Trigger functions with
-- SECURITY DEFINER run as the function owner (postgres), which bypasses RLS
-- entirely — BUT only if the table's RLS is not set to FORCE for the owner.
-- To be safe, we also add an explicit service_role INSERT policy.
--
-- Additionally: ensure the trigger function's search_path is correct
-- by re-applying the CREATE OR REPLACE with the right SET clause.
-- =============================================================================

-- ── Step 1: Add service_role INSERT policy on profiles ────────────────────────
-- This allows the handle_new_user() trigger (running as postgres/service_role)
-- to insert profile rows even when RLS is enabled.
DROP POLICY IF EXISTS "profiles_insert_service_role" ON public.profiles;
CREATE POLICY "profiles_insert_service_role"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Step 2: Re-verify the trigger function has correct search_path ────────────
-- The security warnings migration (20260805140000) ran:
--   ALTER FUNCTION public.handle_new_user() SET search_path = '';
-- This sets search_path to empty AFTER the function was created, overriding
-- the SET clause in the function body. The fix_registration_trigger migration
-- (20260805200000) recreated the function with SET search_path = public, auth
-- in the CREATE OR REPLACE statement — which takes precedence over the ALTER.
-- We re-apply here to guarantee the correct state regardless of apply order.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_country_code CHAR(2);
  v_role         public.user_role;
BEGIN
  -- Safely resolve country_code: only use it if it exists in the countries table
  SELECT c.code INTO v_country_code
  FROM public.countries c
  WHERE c.code = COALESCE(NEW.raw_user_meta_data->>'country_code', '')
  LIMIT 1;
  -- v_country_code will be NULL if not found — safe, no FK violation

  -- Safely resolve role: default to 'customer' if invalid or missing
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'customer'::public.user_role;
  END;

  -- Insert profile — ON CONFLICT DO NOTHING makes this idempotent
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
    v_country_code,
    false,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: Never let a profile creation failure block auth.users INSERT.
  RAISE WARNING '[handle_new_user] Profile creation failed for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- ── Step 3: Re-attach trigger (idempotent) ────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Step 4: Correct EXECUTE grants ───────────────────────────────────────────
-- Trigger functions do not need EXECUTE grants for any client role.
-- The trigger fires internally; no role calls it via RPC.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Grant adjustment for handle_new_user skipped: %', SQLERRM;
END $$;

-- ── Step 5: Verify countries table has CO and CR rows ────────────────────────
-- The trigger resolves country_code by querying public.countries.
-- If CO/CR rows are missing, country_code will always be NULL.
-- This INSERT is idempotent (ON CONFLICT DO NOTHING).
INSERT INTO public.countries (code, name, currency_code, currency_symbol, locale, tax_rate, is_active, shipping_config, payment_methods, legal_config)
VALUES
  ('CO', 'Colombia',    'COP', '$',  'es-CO', 0.19, true, '{}', '{}', '{}'),
  ('CR', 'Costa Rica',  'CRC', '₡',  'es-CR', 0.13, true, '{}', '{}', '{}')
ON CONFLICT (code) DO NOTHING;
