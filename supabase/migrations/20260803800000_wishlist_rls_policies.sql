-- ============================================================
-- Street Candy — Wishlist / Customer Favorites RLS Policies
-- Migration: 20260803800000_wishlist_rls_policies.sql
-- Adds RLS policies and unique constraint to the existing
-- wishlist table to support the Customer Favorites feature.
-- ============================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Unique constraint to prevent duplicate favorites
-- (profile_id, product_id) must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_profile_product
  ON public.wishlist (profile_id, product_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- SELECT: customers can only see their own favorites
DROP POLICY IF EXISTS "wishlist_select_own" ON public.wishlist;
CREATE POLICY "wishlist_select_own"
  ON public.wishlist
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- INSERT: customers can only add to their own wishlist
DROP POLICY IF EXISTS "wishlist_insert_own" ON public.wishlist;
CREATE POLICY "wishlist_insert_own"
  ON public.wishlist
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- DELETE: customers can only remove their own favorites
DROP POLICY IF EXISTS "wishlist_delete_own" ON public.wishlist;
CREATE POLICY "wishlist_delete_own"
  ON public.wishlist
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "wishlist_admin_all" ON public.wishlist;
CREATE POLICY "wishlist_admin_all"
  ON public.wishlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
