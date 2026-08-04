-- ============================================================
-- Street Candy — Spin to Win: spin_leads table
-- Migration: 20260803200000_spin_leads.sql
-- ============================================================

-- spin_leads table
CREATE TABLE IF NOT EXISTS public.spin_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT,
  consent     BOOLEAN NOT NULL DEFAULT FALSE,
  prize       TEXT,
  coupon_code TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_leads_email ON public.spin_leads(email);
CREATE INDEX IF NOT EXISTS idx_spin_leads_created_at ON public.spin_leads(created_at);

ALTER TABLE public.spin_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (lead capture does not require auth)
DROP POLICY IF EXISTS "spin_leads_insert_anon" ON public.spin_leads;
CREATE POLICY "spin_leads_insert_anon"
ON public.spin_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins/staff can read leads
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
