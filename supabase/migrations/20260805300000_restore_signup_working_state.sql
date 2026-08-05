-- ============================================================
-- Street Candy — Restore Signup Working State
-- Migration: 20260805300000_restore_signup_working_state.sql
--
-- PROBLEM:
--   After migration 20260805100000_rollback_security_warning_changes.sql,
--   new user signup stopped working. The rollback restored is_admin() to
--   query auth.users metadata, but all RLS policies (set by 20260804150000)
--   were built around is_admin() querying public.profiles. This mismatch,
--   combined with the revoked anon grant (later re-added by 20260805200000),
--   left the database in an inconsistent state.
--
-- ROOT CAUSE:
--   The last known working state for signup was AFTER 20260804150000 ran:
--     - is_admin() queries public.profiles (SECURITY DEFINER, SET search_path)
--     - handle_new_user() trigger creates profile on auth.users INSERT
--     - profiles INSERT policy allows authenticated users to insert own row
--     - anon role has EXECUTE on is_admin() (needed for public-read RLS policies)
--
--   The rollback (20260805100000) changed is_admin() back to query auth.users
--   metadata, breaking the contract that all other RLS policies depend on.
--
-- FIX STRATEGY:
--   1. Restore is_admin() to the 20260804150000 definition (queries profiles,
--      SECURITY DEFINER, SET search_path = public) — this is what all current
--      RLS policies were designed to work with.
--   2. Ensure EXECUTE is granted to both authenticated and anon roles.
--   3. Restore handle_new_user() to the exact 20260803000000 definition with
--      SET search_path = public added for security compliance.
--   4. Recreate the on_auth_user_created trigger on auth.users.
--   5. Restore profiles INSERT policy to allow the trigger path to work.
--   6. Restore profiles_admin_update_all policy (was dropped by 20260804150000,
--      partially restored by 20260805100000 — ensure it exists).
--
-- SCOPE:
--   - public.is_admin() function
--   - public.handle_new_user() function
--   - on_auth_user_created trigger on auth.users
--   - public.profiles RLS policies (INSERT, UPDATE admin)
--   - Function grants
--
-- NOT TOUCHED:
--   - Any table data (profiles, orders, products, etc.)
--   - Any other RLS policies not listed above
--   - Frontend code
-- ============================================================


-- ── STEP 1: Restore is_admin() to profiles-based definition ──────────────────
--
-- This is the version that all current RLS policies (set by 20260804150000)
-- were designed to work with. It queries public.profiles, uses SECURITY DEFINER
-- to bypass RLS on profiles when called from other tables (no circular dependency
-- because SECURITY DEFINER runs as function owner, not as the calling user).
--
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

-- Grant EXECUTE to both authenticated and anon.
-- anon grant is required for public-read RLS policies (blog_posts, products, etc.)
-- that call is_admin() in their USING clauses — evaluated as anon for unauthenticated requests.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ── STEP 2: Restore handle_new_user() with SET search_path ───────────────────
--
-- Exact definition from 20260803000000 with SET search_path = public added
-- for Supabase security compliance. SECURITY DEFINER ensures the trigger
-- bypasses RLS on public.profiles when inserting the new user's profile row.
--
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'country_code', NULL),
    false,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ── STEP 3: Recreate on_auth_user_created trigger ────────────────────────────
--
-- Drop and recreate to ensure it points to the updated handle_new_user().
--
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── STEP 4: Restore profiles INSERT policy ───────────────────────────────────
--
-- The trigger is SECURITY DEFINER so it bypasses RLS for the profile INSERT.
-- This policy covers the case where the frontend inserts a profile directly
-- (e.g., after OAuth flows where the trigger may not fire).
-- Ensure the policy exists with the correct definition.
--
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


-- ── STEP 5: Ensure profiles_admin_update_all exists ──────────────────────────
--
-- This policy was dropped by the dynamic DROP ALL loop in 20260804150000
-- and was not recreated by that migration. The rollback (20260805100000)
-- attempted to restore it but used the auth.users-based is_admin() definition.
-- Now that is_admin() queries profiles again, recreate it cleanly.
--
DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;
CREATE POLICY "profiles_admin_update_all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── STEP 6: Verification ─────────────────────────────────────────────────────
DO $$
DECLARE
  v_func_body TEXT;
BEGIN

  -- Verify is_admin() queries profiles
  SELECT pg_get_functiondef(oid) INTO v_func_body
  FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.is_admin() does not exist';
  END IF;

  IF v_func_body NOT LIKE '%public.profiles%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.is_admin() does not reference public.profiles';
  END IF;

  RAISE NOTICE 'VERIFIED: public.is_admin() queries public.profiles with SECURITY DEFINER';

  -- Verify handle_new_user() exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not exist';
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() exists';

  -- Verify trigger exists on auth.users
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: trigger on_auth_user_created does not exist on auth.users';
  END IF;

  RAISE NOTICE 'VERIFIED: trigger on_auth_user_created exists on auth.users';

  -- Verify profiles_insert_own policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: profiles_insert_own policy does not exist';
  END IF;

  RAISE NOTICE 'VERIFIED: profiles_insert_own policy exists on public.profiles';

  -- Verify profiles_admin_update_all policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_update_all'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: profiles_admin_update_all policy does not exist';
  END IF;

  RAISE NOTICE 'VERIFIED: profiles_admin_update_all policy exists on public.profiles';

  RAISE NOTICE '=== Signup restore complete. New users can now register and have profiles created. ===';

END $$;
