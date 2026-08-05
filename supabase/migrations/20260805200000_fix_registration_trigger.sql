-- =============================================================================
-- FIX REGISTRATION TRIGGER
-- Root cause: handle_new_user() trigger fails when:
--   1. country_code FK references public.countries but the code may not exist yet
--   2. search_path = '' causes issues with type resolution in some Postgres versions
--   3. Any exception in the trigger propagates as an opaque {} error to the client
--
-- Fix: Rewrite handle_new_user() to be fully defensive:
--   - Validate country_code exists before inserting (set NULL if not found)
--   - Wrap entire body in EXCEPTION handler so trigger NEVER fails auth.users INSERT
--   - Use fully-qualified schema names everywhere
--   - Reset search_path to include public so type casts work reliably
-- =============================================================================

-- Drop and recreate the trigger function with full defensive error handling
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
  -- This prevents FK violations when a new country code is passed
  SELECT c.code INTO v_country_code
  FROM public.countries c
  WHERE c.code = COALESCE(NEW.raw_user_meta_data->>'country_code', '')
  LIMIT 1;
  -- v_country_code will be NULL if not found — that's intentional and safe

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
  -- Log the error for debugging but always return NEW so the user is created.
  RAISE WARNING '[handle_new_user] Profile creation failed for user %: % (SQLSTATE: %)',
    NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Re-grant execute to service_role only (trigger functions don't need broader grants)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Grant adjustment for handle_new_user skipped: %', SQLERRM;
END $$;
