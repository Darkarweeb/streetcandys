-- ============================================================
-- Street Candy — Fix profiles RLS for signup trigger
-- Migration: 20260805800000_fix_profiles_rls_trigger_insert.sql
--
-- CONFIRMED ROOT CAUSE:
--   profiles_insert_own policy is scoped TO authenticated only.
--   When handle_new_user() fires (AFTER INSERT ON auth.users),
--   there is NO active authenticated session — the new user has
--   not yet received a JWT. Even though handle_new_user() is
--   SECURITY DEFINER, Supabase's RLS layer evaluates the policy
--   role filter (TO authenticated) before checking SECURITY DEFINER
--   bypass, blocking the INSERT with SQLSTATE 42501.
--
-- FIX (minimum change):
--   1. Ensure handle_new_user() is owned by postgres (superuser)
--      so SECURITY DEFINER truly bypasses RLS.
--   2. Add a service_role INSERT policy on public.profiles so the
--      trigger's execution context (service_role / postgres) can
--      always insert during signup — belt-and-suspenders.
--
-- SCOPE: Only handle_new_user() owner + one new RLS policy.
-- NOT TOUCHED: profiles_insert_own (authenticated), admin policies,
--              trigger, is_admin(), any other table or policy.
-- ============================================================


-- ── STEP 1: Ensure handle_new_user() owner is postgres ───────────────────────
--
-- SECURITY DEFINER functions bypass RLS only when owned by a superuser.
-- ALTER FUNCTION ... OWNER TO postgres guarantees this regardless of
-- which role ran CREATE OR REPLACE in prior migrations.
--
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;


-- ── STEP 2: Add service_role INSERT policy on public.profiles ────────────────
--
-- The on_auth_user_created trigger fires in the service_role context.
-- This policy explicitly allows service_role to insert profile rows,
-- covering the signup path even if SECURITY DEFINER bypass is insufficient.
--
-- This does NOT open public/anon inserts — service_role is only accessible
-- server-side (never exposed to browser clients).
--
DROP POLICY IF EXISTS "profiles_insert_service_role" ON public.profiles;
CREATE POLICY "profiles_insert_service_role"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);


-- ── STEP 3: Verification ─────────────────────────────────────────────────────
DO $$
DECLARE
  v_owner TEXT;
  v_policy_exists BOOLEAN;
BEGIN

  -- Verify handle_new_user() owner is postgres
  SELECT pg_get_userbyid(p.proowner) INTO v_owner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'handle_new_user'
    AND n.nspname = 'public';

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not exist';
  END IF;

  IF v_owner != 'postgres' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() owner is "%" — expected "postgres"', v_owner;
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() owner = %', v_owner;

  -- Verify service_role INSERT policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_service_role'
  ) INTO v_policy_exists;

  IF NOT v_policy_exists THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: profiles_insert_service_role policy does not exist on public.profiles';
  END IF;

  RAISE NOTICE 'VERIFIED: profiles_insert_service_role policy exists on public.profiles';

  -- Verify original authenticated INSERT policy still exists (not touched)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: profiles_insert_own policy is missing — it should not have been removed';
  END IF;

  RAISE NOTICE 'VERIFIED: profiles_insert_own (authenticated) policy still intact';

  RAISE NOTICE '=== Fix applied. Signup trigger can now insert into public.profiles. ===';
  RAISE NOTICE 'Admin login unchanged. Public/anon insert access unchanged.';

END $$;
