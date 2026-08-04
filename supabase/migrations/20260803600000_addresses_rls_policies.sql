-- ============================================================
-- Street Candy — Addresses RLS Policies
-- Migration: 20260803600000_addresses_rls_policies.sql
-- ============================================================

-- Enable RLS on addresses table
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Users can select their own addresses
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
CREATE POLICY "addresses_select_own"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Users can insert their own addresses (country must be CO or CR)
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
CREATE POLICY "addresses_insert_own"
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND public.is_allowed_country(country_code)
  );

-- Users can update their own addresses
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
CREATE POLICY "addresses_update_own"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND public.is_allowed_country(country_code)
  );

-- Users can delete their own addresses
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;
CREATE POLICY "addresses_delete_own"
  ON public.addresses
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Admins can read all addresses
DROP POLICY IF EXISTS "addresses_admin_select_all" ON public.addresses;
CREATE POLICY "addresses_admin_select_all"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can update all addresses
DROP POLICY IF EXISTS "addresses_admin_update_all" ON public.addresses;
CREATE POLICY "addresses_admin_update_all"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
