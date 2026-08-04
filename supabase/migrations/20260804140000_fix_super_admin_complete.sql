-- ============================================================
-- Fix Super Admin Authentication — Complete End-to-End Fix
-- Migration: 20260804140000_fix_super_admin_complete.sql
--
-- Root causes fixed:
-- 1. is_admin() checked metadata instead of profiles table → always returned false
-- 2. Super admin profile row may not exist (no trigger if created via Supabase dashboard)
-- 3. Email confirmation state may be incomplete
-- ============================================================

-- ============================================================
-- STEP 1: Fix is_admin() — was checking metadata, not profiles
-- The correct source of truth is public.profiles.role
-- This was causing ALL admin RLS policies to fail silently
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'::public.user_role
  )
$$;

-- ============================================================
-- STEP 2: Ensure super admin exists in auth.users and profiles
-- Uses DO block with full idempotency (ON CONFLICT DO UPDATE)
-- ============================================================
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'streetcandysbackoffice@gmail.com';
BEGIN
  -- Find the user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- User does not exist at all — create them with a known password hash
    -- Password: StreetCandy2024! (admin must reset after first login)
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      is_anonymous,
      banned_until,
      deleted_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at,
      phone,
      phone_change,
      phone_change_token,
      phone_change_sent_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt('StreetCandy2024!', gen_salt('bf', 10)),
      now(),
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      '',
      NULL,
      false,
      false,
      NULL,
      NULL,
      jsonb_build_object('full_name', 'Street Candy Admin', 'role', 'admin'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      now(),
      now(),
      NULL,
      '',
      '',
      NULL
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created new auth user for % with id %', v_email, v_user_id;
  ELSE
    -- User exists — ensure email is confirmed, account is active, no bans
    UPDATE auth.users
    SET
      email_confirmed_at      = COALESCE(email_confirmed_at, now()),
      confirmation_token      = '',
      confirmation_sent_at    = NULL,
      recovery_token          = '',
      email_change_token_new  = '',
      email_change_token_current = '',
      banned_until            = NULL,
      deleted_at              = NULL,
      raw_user_meta_data      = COALESCE(raw_user_meta_data, '{}') ||
                                jsonb_build_object('role', 'admin', 'full_name', 'Street Candy Admin'),
      updated_at              = now()
    WHERE id = v_user_id;

    RAISE NOTICE 'Updated existing auth user % (id: %)', v_email, v_user_id;
  END IF;

  -- ============================================================
  -- STEP 3: Ensure profile row exists with role = 'admin'
  -- Uses UPSERT so it works whether profile exists or not
  -- ============================================================
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    age_verified,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_email,
    'Street Candy Admin',
    'admin'::public.user_role,
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      role       = 'admin'::public.user_role,
      is_active  = true,
      email      = EXCLUDED.email,
      updated_at = now();

  RAISE NOTICE 'Profile upserted for % with role=admin', v_email;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in super admin setup: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- ============================================================
-- STEP 4: Verify the fix — log current state
-- ============================================================
DO $$
DECLARE
  v_user_id UUID;
  v_email_confirmed TIMESTAMPTZ;
  v_profile_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  SELECT
    au.id,
    au.email_confirmed_at
  INTO v_user_id, v_email_confirmed
  FROM auth.users au
  WHERE lower(au.email) = lower('streetcandysbackoffice@gmail.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT role::TEXT, is_active
    INTO v_profile_role, v_is_active
    FROM public.profiles
    WHERE id = v_user_id;

    RAISE NOTICE '=== Super Admin Verification ===';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Email confirmed: %', v_email_confirmed;
    RAISE NOTICE 'Profile role: %', COALESCE(v_profile_role, 'NO PROFILE FOUND');
    RAISE NOTICE 'Is active: %', COALESCE(v_is_active::TEXT, 'NO PROFILE FOUND');
    RAISE NOTICE '================================';
  ELSE
    RAISE NOTICE 'ERROR: User streetcandysbackoffice@gmail.com still not found after setup!';
  END IF;
END $$;
