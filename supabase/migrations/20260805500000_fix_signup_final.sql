-- ============================================================
-- Street Candy — Fix New User Registration (Final)
-- Migration: 20260805500000_fix_signup_final.sql
--
-- ROOT CAUSE:
--   Migration 20260805100000 (rollback) changed is_admin() back to
--   query auth.users metadata, but ALL RLS policies set by 20260804150000
--   depend on is_admin() querying public.profiles. This mismatch broke
--   the profiles INSERT path for new users.
--
--   Migration 20260805300000 was the correct fix but was never applied
--   to the live database. This migration re-applies the same fix with
--   full idempotency guarantees.
--
-- WHAT THIS FIXES:
--   1. is_admin() — restored to profiles-based SECURITY DEFINER
--   2. handle_new_user() — restored with SET search_path = public
--   3. on_auth_user_created trigger — recreated on auth.users
--   4. profiles_insert_own policy — restored for signup path
--   5. profiles_admin_update_all policy — restored for admin path
--
-- SCOPE: Functions, trigger, profiles RLS policies only.
-- NOT TOUCHED: Any table data, orders, products, other policies.
-- ============================================================


-- ── STEP 1: Restore is_admin() — profiles-based, SECURITY DEFINER ────────────
--
-- All current RLS policies (products, orders, blog_posts, etc.) call
-- is_admin() and were designed against this definition. SECURITY DEFINER
-- means it runs as the function owner (bypasses RLS on profiles), so
-- there is NO circular dependency when called from other tables.
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

-- Grant EXECUTE to authenticated and anon.
-- anon is required: public-read RLS policies (blog_posts, products, etc.)
-- call is_admin() in their USING clauses, evaluated as anon for unauthenticated requests.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ── STEP 2: Restore handle_new_user() with SET search_path ───────────────────
--
-- SECURITY DEFINER ensures the trigger bypasses RLS on public.profiles
-- when inserting the new user's profile row (no active session at signup time).
-- SET search_path = public prevents search_path injection (Supabase security requirement).
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


-- ── STEP 3: Recreate on_auth_user_created trigger on auth.users ──────────────
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
-- This policy also covers OAuth flows where the frontend may insert directly.
--
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


-- ── STEP 5: Restore profiles_admin_update_all policy ─────────────────────────
--
-- Dropped by the dynamic DROP ALL loop in 20260804150000 and not consistently
-- restored by subsequent migrations. Recreate cleanly.
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

  -- Verify is_admin() queries profiles (not auth.users)
  SELECT pg_get_functiondef(oid) INTO v_func_body
  FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.is_admin() does not exist';
  END IF;

  IF v_func_body NOT LIKE '%public.profiles%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.is_admin() does not reference public.profiles — wrong version active';
  END IF;

  IF v_func_body NOT LIKE '%search_path%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.is_admin() missing SET search_path — security compliance not met';
  END IF;

  RAISE NOTICE 'VERIFIED: public.is_admin() queries public.profiles with SECURITY DEFINER + SET search_path';

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

  RAISE NOTICE '=== Fix applied. New users can register and profiles will be created automatically. ===';

END $$;
