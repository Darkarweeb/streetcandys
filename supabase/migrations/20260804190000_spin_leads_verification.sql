-- ============================================================
-- Street Candy — Spin to Win: Email verification & security
-- Migration: 20260804190000_spin_leads_verification.sql
-- ============================================================
-- Changes:
--   1. Add user_id, verification_status, verified_at columns to spin_leads
--   2. Add unique constraint: one spin per email (server-enforced)
--   3. Tighten RLS: users cannot UPDATE/DELETE their own spin_leads
--   4. Admins can read and update spin_leads
-- ============================================================

-- ── 1. Add new columns to spin_leads ─────────────────────────────────────────

ALTER TABLE public.spin_leads
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ── 2. Unique index: one spin per email (prevents duplicates server-side) ─────

CREATE UNIQUE INDEX IF NOT EXISTS idx_spin_leads_email_unique
  ON public.spin_leads (lower(email));

-- ── 3. Index on user_id for fast lookups ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_spin_leads_user_id
  ON public.spin_leads (user_id);

CREATE INDEX IF NOT EXISTS idx_spin_leads_verification_status
  ON public.spin_leads (verification_status);

-- ── 4. RLS: drop all existing policies and recreate securely ─────────────────

ALTER TABLE public.spin_leads ENABLE ROW LEVEL SECURITY;

-- Remove old permissive insert policy
DROP POLICY IF EXISTS "spin_leads_insert_anon" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_select_admin" ON public.spin_leads;

-- Users/anon can INSERT a spin lead (server API validates uniqueness)
-- No UPDATE or DELETE allowed for regular users
DROP POLICY IF EXISTS "spin_leads_insert_any" ON public.spin_leads;
CREATE POLICY "spin_leads_insert_any"
ON public.spin_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Authenticated users can only SELECT their own spin lead (by email match via user_id)
DROP POLICY IF EXISTS "spin_leads_select_own" ON public.spin_leads;
CREATE POLICY "spin_leads_select_own"
ON public.spin_leads
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Admins/staff can SELECT all spin leads
DROP POLICY IF EXISTS "spin_leads_select_admin" ON public.spin_leads;
CREATE POLICY "spin_leads_select_admin"
ON public.spin_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'staff')
  )
);

-- Admins/staff can UPDATE spin leads (to mark verified)
DROP POLICY IF EXISTS "spin_leads_update_admin" ON public.spin_leads;
CREATE POLICY "spin_leads_update_admin"
ON public.spin_leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'staff')
  )
);

-- NO DELETE policy for regular users — only service role can delete
-- Admins can delete if needed
DROP POLICY IF EXISTS "spin_leads_delete_admin" ON public.spin_leads;
CREATE POLICY "spin_leads_delete_admin"
ON public.spin_leads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'staff')
  )
);
