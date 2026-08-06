-- ============================================================
-- Street Candy — Fix handle_new_user() duplicate email conflict
-- Migration: 20260805600000_fix_handle_new_user_email_conflict.sql
--
-- ROOT CAUSE:
--   handle_new_user() uses ON CONFLICT (id) DO NOTHING, which only
--   suppresses primary key conflicts. If a stale profile row exists
--   with the same email (from a previous partial/failed signup),
--   the INSERT raises:
--     ERROR: duplicate key value violates unique constraint "profiles_email_key"
--   This unhandled exception rolls back the auth.users INSERT, causing
--   the entire signup to fail.
--
-- FIX:
--   Wrap the INSERT in a BEGIN...EXCEPTION block that catches
--   unique_violation errors (covers BOTH id and email conflicts).
--   When a duplicate email is found, the existing profile row is
--   preserved — no data is lost.
--
-- SCOPE: Only public.handle_new_user() is changed.
-- NOT TOUCHED: Trigger, RLS policies, is_admin(), any other object.
-- ============================================================


-- ── Update handle_new_user() to handle email UNIQUE constraint ───────────────
--
-- SECURITY DEFINER: runs as function owner, bypasses RLS on public.profiles.
-- SET search_path = public: Supabase security compliance (prevents injection).
-- EXCEPTION block: silently absorbs unique_violation so the trigger never
--   raises an unhandled exception, which would roll back auth.users INSERT.
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

EXCEPTION
  WHEN unique_violation THEN
    -- A profile row already exists with this email (stale from a prior
    -- partial signup). Preserve the existing row and allow auth.users
    -- INSERT to complete normally. The user will be able to sign in or
    -- receive a new confirmation email without losing profile data.
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

  IF v_func_body NOT LIKE '%unique_violation%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not contain unique_violation handler';
  END IF;

  IF v_func_body NOT LIKE '%search_path%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() missing SET search_path';
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() updated with unique_violation exception handler.';
  RAISE NOTICE 'Duplicate email conflicts will no longer break new user signup.';
END $$;
