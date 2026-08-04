-- ============================================================
-- Admin Setup System
-- Adds a secure function to check if any admin exists
-- and a function to promote a user to super_admin role.
-- The profiles table already has role enum: customer, admin, staff
-- We use 'admin' as the Super Admin role.
-- ============================================================

-- Function: Check if any admin exists (public, no auth required)
-- Used by /admin/setup to decide whether to allow setup
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'::public.user_role
  );
$$;

-- Grant execute to anon and authenticated so the setup page can check
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

-- Function: Promote a user to admin (SECURITY DEFINER — bypasses RLS)
-- Only works when NO admin exists yet (first-time setup guard)
CREATE OR REPLACE FUNCTION public.setup_first_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count INT;
BEGIN
  -- Guard: only allow if no admin exists
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'admin'::public.user_role;

  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Setup is disabled.';
  END IF;

  -- Promote the user
  UPDATE public.profiles
  SET role = 'admin'::public.user_role,
      updated_at = now()
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

-- Only authenticated users can call setup_first_admin
GRANT EXECUTE ON FUNCTION public.setup_first_admin(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.setup_first_admin(UUID) FROM anon;
