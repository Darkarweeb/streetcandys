-- Partners / Allied Brands RLS Policies
-- Table partner_logos already exists. This migration adds RLS policies and updated_at column.

-- Add updated_at column if not present
ALTER TABLE public.partner_logos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS (idempotent)
ALTER TABLE public.partner_logos ENABLE ROW LEVEL SECURITY;

-- Public read: only active partners
DROP POLICY IF EXISTS "partners_public_read" ON public.partner_logos;
CREATE POLICY "partners_public_read"
ON public.partner_logos
FOR SELECT
TO public
USING (is_active = true);

-- Admin/staff full access
DROP POLICY IF EXISTS "partners_admin_all" ON public.partner_logos;
CREATE POLICY "partners_admin_all"
ON public.partner_logos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  )
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_partner_logos_sort_order ON public.partner_logos(sort_order);
CREATE INDEX IF NOT EXISTS idx_partner_logos_is_active ON public.partner_logos(is_active);

-- Updated_at trigger function (reuse or create)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_partner_logos_updated_at ON public.partner_logos;
CREATE TRIGGER set_partner_logos_updated_at
BEFORE UPDATE ON public.partner_logos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
