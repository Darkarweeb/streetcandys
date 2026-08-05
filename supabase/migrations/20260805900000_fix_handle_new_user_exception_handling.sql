-- ============================================================
-- Street Candy — Fix handle_new_user() exception handling
-- Migration: 20260805900000_fix_handle_new_user_exception_handling.sql
--
-- CONFIRMED ROOT CAUSE:
--   public.handle_new_user() only catches unique_violation (SQLSTATE 23505).
--   Any other exception — including:
--     23502 not_null_violation  (e.g. NEW.email IS NULL)
--     23503 foreign_key_violation (e.g. country_code FK race condition)
--     42501 insufficient_privilege (e.g. RLS context edge case)
--   — propagates out of the function, rolls back the AFTER INSERT trigger,
--   and because the trigger is within the same transaction as auth.users,
--   the entire auth.users INSERT is rolled back. Supabase Auth returns {}
--   to the client with no error surfaced.
--
-- FIX (minimum change — function body only):
--   Add explicit EXCEPTION handlers for:
--     WHEN not_null_violation  → RETURN NEW (allow auth.users to persist)
--     WHEN foreign_key_violation → RETURN NEW (allow auth.users to persist)
--     WHEN insufficient_privilege → RETURN NEW (allow auth.users to persist)
--   Preserve existing unique_violation handler.
--   No WHEN OTHERS blind catch-all added (per requirements).
--
-- PRESERVED (unchanged):
--   SECURITY DEFINER
--   SET search_path = public
--   Owner: postgres (set by _800000, not changed here)
--   Role sanitization (v_raw_role guard)
--   Country code protection (EXISTS check against public.countries)
--   ON CONFLICT (id) DO NOTHING
--   INSERT column list and VALUES
--   Trigger definition (not touched)
--   All RLS policies (not touched)
-- ============================================================


-- ── Replace handle_new_user() with improved exception handling ────────────────
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
    -- SQLSTATE 23505: profile row already exists with this email or id.
    -- Preserve the existing row and allow auth.users INSERT to complete.
    RETURN NEW;

  WHEN not_null_violation THEN
    -- SQLSTATE 23502: a NOT NULL column received NULL (e.g. NEW.email is NULL
    -- for phone-only or magic-link signups before email is confirmed).
    -- The profile row cannot be created now; allow auth.users to persist.
    -- The profile can be created later via upsert once email is available.
    RETURN NEW;

  WHEN foreign_key_violation THEN
    -- SQLSTATE 23503: country_code FK failed despite the EXISTS guard
    -- (race condition or stale countries data). Allow auth.users to persist
    -- with no profile row; the ON CONFLICT guard prevents a duplicate later.
    RETURN NEW;

  WHEN insufficient_privilege THEN
    -- SQLSTATE 42501: RLS policy blocked the INSERT despite SECURITY DEFINER
    -- (e.g. execution context mismatch or policy configuration edge case).
    -- Never roll back auth.users for a privilege error on the profile table.
    RETURN NEW;
END;
$$;

-- Re-assert ownership to postgres (belt-and-suspenders after CREATE OR REPLACE)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;


-- ── Verification ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_func_body TEXT;
  v_owner     TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid), pg_get_userbyid(p.proowner)
  INTO v_func_body, v_owner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'handle_new_user'
    AND n.nspname = 'public';

  IF v_func_body IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: public.handle_new_user() does not exist';
  END IF;

  IF v_owner != 'postgres' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: owner is "%" — expected "postgres"', v_owner;
  END IF;

  IF v_func_body NOT LIKE '%not_null_violation%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: not_null_violation handler missing';
  END IF;

  IF v_func_body NOT LIKE '%foreign_key_violation%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: foreign_key_violation handler missing';
  END IF;

  IF v_func_body NOT LIKE '%insufficient_privilege%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: insufficient_privilege handler missing';
  END IF;

  IF v_func_body NOT LIKE '%unique_violation%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: unique_violation handler missing';
  END IF;

  IF v_func_body NOT LIKE '%v_raw_role%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: role sanitization missing';
  END IF;

  IF v_func_body NOT LIKE '%search_path%' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: SET search_path missing';
  END IF;

  RAISE NOTICE 'VERIFIED: public.handle_new_user() owner = %', v_owner;
  RAISE NOTICE 'VERIFIED: unique_violation handler present';
  RAISE NOTICE 'VERIFIED: not_null_violation handler present';
  RAISE NOTICE 'VERIFIED: foreign_key_violation handler present';
  RAISE NOTICE 'VERIFIED: insufficient_privilege handler present';
  RAISE NOTICE 'VERIFIED: role sanitization present';
  RAISE NOTICE 'VERIFIED: SET search_path = public present';
  RAISE NOTICE '=== handle_new_user() exception handling is complete. ===';
END $$;
