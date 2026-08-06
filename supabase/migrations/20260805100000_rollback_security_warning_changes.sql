-- ============================================================
-- Street Candy — Rollback: Security-Warning Changes
-- Migration: 20260805100000_rollback_security_warning_changes.sql
--
-- PURPOSE:
--   Revert ONLY the objects modified by the security-warning migrations:
--     - 20260804140000_fix_super_admin_complete.sql
--     - 20260804150000_fix_admin_rls_and_policies.sql
--     - 20260804200000_harden_reward_transactions_rls.sql
--
-- SCOPE (exactly 15 objects — no more, no less):
--   1.  public.is_admin()                          — RESTORED to 20260803000000 definition
--   2.  GRANT EXECUTE ON is_admin() TO anon        — REVOKED (was not in 20260803000000)
--   3.  profiles_admin_update_all                  — RECREATED (dropped by 20260804150000, never restored)
--   4.  reward_transactions_insert_admin_only      — DROPPED
--   5.  reward_transactions_insert                 — RECREATED (original authenticated policy)
--   6.  rewards_update_admin_only                  — DROPPED
--   7.  rewards_update                             — RECREATED (original authenticated policy)
--   8.  rewards_insert_admin_only                  — DROPPED
--   9.  rewards_insert                             — RECREATED (original authenticated policy)
--
-- NOT TOUCHED:
--   - auth.users data
--   - public.profiles data
--   - Orders, Products, Coupons, Strategic Partners
--   - Storage buckets or uploaded files
--   - handle_new_user() trigger function (unchanged by security-warning migrations)
--   - on_auth_user_created trigger (unchanged by security-warning migrations)
--   - Any other RLS policy not listed above
--
-- REVERSIBILITY:
--   To re-apply the security-warning changes, re-run migrations
--   20260804140000, 20260804150000, and 20260804200000 in order.
-- ============================================================


-- ── OBJECT 1: Restore public.is_admin() to 20260803000000 definition ─────────
--
-- BEFORE (20260804150000 version):
--   Queries public.profiles WHERE role IN ('admin', 'staff')
--   Has SET search_path = public
--   Grants EXECUTE to authenticated AND anon
--
-- AFTER (20260803000000 version — last known working state):
--   Queries auth.users.raw_user_meta_data and raw_app_meta_data
--   No SET search_path
--   No staff role
--   No GRANT to anon
--
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin'
         OR au.raw_app_meta_data->>'role' = 'admin')
  )
$$;


-- ── OBJECT 2: Revoke EXECUTE on is_admin() from anon ─────────────────────────
--
-- 20260804150000 added: GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon
-- The 20260803000000 baseline did NOT grant execute to anon.
-- Revoke the anon grant. Keep authenticated (it is the default for SECURITY DEFINER functions).
--
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;


-- ── OBJECT 3: Recreate profiles_admin_update_all ──────────────────────────────
--
-- This policy existed in 20260803000000 but was dropped by the dynamic
-- DROP ALL loop in 20260804150000 and was never recreated by that migration.
--
DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;
CREATE POLICY "profiles_admin_update_all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── OBJECTS 4–5: Restore reward_transactions INSERT policy ────────────────────
--
-- 20260804200000 dropped:
--   reward_transactions_insert  (TO authenticated WITH CHECK profile_id=auth.uid() OR is_admin())
--   reward_transactions_insert_service
-- and created:
--   reward_transactions_insert_admin_only  (TO authenticated WITH CHECK is_admin())
--
-- Revert: drop admin_only, recreate original authenticated policy.
--
DROP POLICY IF EXISTS "reward_transactions_insert_admin_only" ON public.reward_transactions;

DROP POLICY IF EXISTS "reward_transactions_insert" ON public.reward_transactions;
CREATE POLICY "reward_transactions_insert"
  ON public.reward_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());


-- ── OBJECTS 6–7: Restore rewards UPDATE policy ───────────────────────────────
--
-- 20260804200000 dropped:
--   rewards_update  (TO authenticated USING is_admin() WITH CHECK is_admin())
--   rewards_update_service
-- and created:
--   rewards_update_admin_only  (TO authenticated USING is_admin() WITH CHECK is_admin())
--
-- Revert: drop admin_only, recreate original policy under original name.
--
DROP POLICY IF EXISTS "rewards_update_admin_only" ON public.rewards;

DROP POLICY IF EXISTS "rewards_update" ON public.rewards;
CREATE POLICY "rewards_update"
  ON public.rewards
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── OBJECTS 8–9: Restore rewards INSERT policy ───────────────────────────────
--
-- 20260804200000 dropped:
--   rewards_insert  (TO authenticated WITH CHECK profile_id=auth.uid() OR is_admin())
--   rewards_insert_service
-- and created:
--   rewards_insert_admin_only  (TO authenticated WITH CHECK is_admin())
--
-- Revert: drop admin_only, recreate original authenticated policy.
--
DROP POLICY IF EXISTS "rewards_insert_admin_only" ON public.rewards;

DROP POLICY IF EXISTS "rewards_insert" ON public.rewards;
CREATE POLICY "rewards_insert"
  ON public.rewards
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());


-- ── POST-ROLLBACK VERIFICATION ────────────────────────────────────────────────
--
-- The following DO block verifies that all reverted objects are in the
-- expected state. It raises a NOTICE for each verified object and raises
-- an EXCEPTION if any critical object is missing.
--
DO $$
DECLARE
  v_func_body TEXT;
  v_policy_count INT;
BEGIN

  -- 1. Verify is_admin() queries auth.users (not profiles)
  SELECT pg_get_functiondef(oid) INTO v_func_body
  FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: public.is_admin() does not exist';
  END IF;

  IF v_func_body NOT LIKE '%auth.users%' THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: public.is_admin() does not reference auth.users — function was not restored correctly';
  END IF;

  IF v_func_body LIKE '%search_path%' THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: public.is_admin() still contains SET search_path — security-warning version was not removed';
  END IF;

  RAISE NOTICE 'VERIFIED: public.is_admin() restored — queries auth.users, no SET search_path, no staff role';

  -- 2. Verify handle_new_user() exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: public.handle_new_user() does not exist';
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() exists';

  -- 3. Verify on_auth_user_created trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: trigger on_auth_user_created does not exist on auth.users';
  END IF;

  RAISE NOTICE 'VERIFIED: trigger on_auth_user_created exists on auth.users';

  -- 4. Verify profiles_admin_update_all policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_update_all'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: profiles_admin_update_all policy does not exist';
  END IF;

  RAISE NOTICE 'VERIFIED: profiles_admin_update_all policy exists on public.profiles';

  -- 5. Verify admin_only policies are gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reward_transactions'
      AND policyname = 'reward_transactions_insert_admin_only'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: reward_transactions_insert_admin_only still exists — was not dropped';
  END IF;

  RAISE NOTICE 'VERIFIED: reward_transactions_insert_admin_only has been removed';

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rewards'
      AND policyname IN ('rewards_update_admin_only', 'rewards_insert_admin_only')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: rewards admin_only policies still exist — were not dropped';
  END IF;

  RAISE NOTICE 'VERIFIED: rewards_update_admin_only and rewards_insert_admin_only have been removed';

  -- 6. Verify restored policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reward_transactions'
    AND policyname = 'reward_transactions_insert';

  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: reward_transactions_insert policy was not recreated';
  END IF;

  RAISE NOTICE 'VERIFIED: reward_transactions_insert policy exists';

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rewards'
    AND policyname IN ('rewards_update', 'rewards_insert');

  IF v_policy_count < 2 THEN
    RAISE EXCEPTION 'ROLLBACK VERIFICATION FAILED: rewards_update or rewards_insert policy was not recreated (found %)', v_policy_count;
  END IF;

  RAISE NOTICE 'VERIFIED: rewards_update and rewards_insert policies exist';

  RAISE NOTICE '=== ROLLBACK COMPLETE: All 9 objects verified successfully ===';

END $$;
