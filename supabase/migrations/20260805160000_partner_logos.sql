-- ─── Strategic Partners (Aliados Estratégicos) ───────────────────────────────
-- Migration: 20260805160000_partner_logos.sql

-- 1. Create partner_logos table
CREATE TABLE IF NOT EXISTS public.partner_logos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  logo_url     text        NOT NULL,
  website_url  text        NULL,
  country_code text        NOT NULL CHECK (country_code IN ('CO', 'CR')),
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_partner_logos_country_active
  ON public.partner_logos (country_code, is_active, sort_order);

-- 3. Enable RLS
ALTER TABLE public.partner_logos ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Public SELECT: only active rows
DROP POLICY IF EXISTS "partner_logos_public_select" ON public.partner_logos;
CREATE POLICY "partner_logos_public_select"
  ON public.partner_logos
  FOR SELECT
  TO public
  USING (is_active = true);

-- Admin/staff INSERT
DROP POLICY IF EXISTS "partner_logos_admin_insert" ON public.partner_logos;
CREATE POLICY "partner_logos_admin_insert"
  ON public.partner_logos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff());

-- Admin/staff UPDATE
DROP POLICY IF EXISTS "partner_logos_admin_update" ON public.partner_logos;
CREATE POLICY "partner_logos_admin_update"
  ON public.partner_logos
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Admin/staff DELETE
DROP POLICY IF EXISTS "partner_logos_admin_delete" ON public.partner_logos;
CREATE POLICY "partner_logos_admin_delete"
  ON public.partner_logos
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_staff());

-- Admin/staff SELECT (all rows, including inactive)
DROP POLICY IF EXISTS "partner_logos_admin_select_all" ON public.partner_logos;
CREATE POLICY "partner_logos_admin_select_all"
  ON public.partner_logos
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- 5. Storage bucket: partner-logos (public bucket, no broad SELECT policy needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-logos',
  'partner-logos',
  true,
  5242880,
  ARRAY['image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies: upload/delete restricted to admin/staff only
DROP POLICY IF EXISTS "partner_logos_storage_admin_insert" ON storage.objects;
CREATE POLICY "partner_logos_storage_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-logos'
    AND public.is_admin_or_staff()
  );

DROP POLICY IF EXISTS "partner_logos_storage_admin_update" ON storage.objects;
CREATE POLICY "partner_logos_storage_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-logos'
    AND public.is_admin_or_staff()
  )
  WITH CHECK (
    bucket_id = 'partner-logos'
    AND public.is_admin_or_staff()
  );

DROP POLICY IF EXISTS "partner_logos_storage_admin_delete" ON storage.objects;
CREATE POLICY "partner_logos_storage_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partner-logos'
    AND public.is_admin_or_staff()
  );
