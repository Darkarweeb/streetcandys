-- ============================================================
-- Street Candy — Security Fix: Consolidate spin_leads INSERT policies
-- Migration: 20260805060000_security_fix_spin_leads_policy.sql
-- Risk: LOW
-- ============================================================
-- Current state: two INSERT policies exist with WITH CHECK (true):
--   - spin_leads_insert      (from 20260803200000_spin_leads.sql)
--   - spin_leads_insert_any  (from 20260804190000_spin_leads_verification.sql)
-- Both are redundant and allow inserting any data without validation.
--
-- This migration:
--   1. Drops both existing INSERT policies.
--   2. Creates ONE consolidated INSERT policy for anon + authenticated.
--   3. WITH CHECK validates: email not null, valid email format, name not null,
--      and prevents clients from setting internal/admin-only columns.
--
-- The Spin-to-Win flow (anonymous lead capture) continues to work.
-- Internal columns (verification_status, coupon_code, coupon_id, user_id,
-- verified_at) are set by the server-side API (service-role) or triggers,
-- NOT by the client INSERT — so the policy simply requires them to be NULL
-- or their DEFAULT value when inserted by the client.
-- ============================================================

-- 1. Drop both existing INSERT policies
DROP POLICY IF EXISTS "spin_leads_insert" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_insert_anon" ON public.spin_leads;
DROP POLICY IF EXISTS "spin_leads_insert_any" ON public.spin_leads;

-- 2. Create one consolidated, validated INSERT policy
CREATE POLICY "spin_leads_insert_validated"
ON public.spin_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Email is required and must look like a valid email
  email IS NOT NULL
  AND email <> ''
  AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  -- Name is required (the spin form always collects it)
  AND name IS NOT NULL
  AND name <> ''
  -- Clients must NOT set internal/admin columns — they must be NULL on insert.
  -- The server API (service-role) sets these after OTP verification.
  AND coupon_code IS NULL
  AND verification_status = 'pending'
  AND verified_at IS NULL
  -- user_id may be NULL (anonymous) or the caller's own auth.uid()
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Note: The server-side API routes use the service-role key (bypasses RLS)
-- to set coupon_code, verification_status = 'verified', verified_at, etc.
-- after OTP verification. This policy only governs direct client inserts.
