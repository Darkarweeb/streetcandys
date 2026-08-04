-- ============================================================
-- Street Candy — Reviews & Ratings System
-- Migration: 20260804090000_reviews_system.sql
-- Extends existing reviews table with full moderation workflow
-- ============================================================

-- ============================================================
-- STEP 1: ADD REVIEW STATUS ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
  END IF;
END $$;

-- ============================================================
-- STEP 2: ADD MISSING COLUMNS TO reviews TABLE
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status public.review_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Migrate existing is_approved=true to status='approved', is_approved=false to status='pending'
UPDATE public.reviews
SET status = CASE
  WHEN is_approved = TRUE THEN 'approved'::public.review_status
  ELSE 'pending'::public.review_status
END
WHERE status = 'pending';

-- ============================================================
-- STEP 3: ADD notification_type VALUES (if not already present)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'review_rejected'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'review_rejected';
  END IF;
END $$;

-- ============================================================
-- STEP 4: STORAGE BUCKET FOR REVIEW PHOTOS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 5: RLS POLICIES FOR reviews TABLE
-- ============================================================

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "reviews_select_approved" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_auth" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;

-- Public: only approved reviews visible
CREATE POLICY "reviews_select_approved" ON public.reviews
  FOR SELECT USING (status = 'approved');

-- Authenticated users can see their own reviews (any status)
CREATE POLICY "reviews_select_own" ON public.reviews
  FOR SELECT USING (auth.uid() = profile_id);

-- Authenticated users can insert reviews
CREATE POLICY "reviews_insert_auth" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can update their own PENDING reviews only
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (auth.uid() = profile_id AND status = 'pending')
  WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own PENDING reviews only
CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING (auth.uid() = profile_id AND status = 'pending');

-- Admins/staff have full access
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  );

-- ============================================================
-- STEP 6: STORAGE POLICIES FOR review-photos
-- ============================================================

DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_own_delete" ON storage.objects;

CREATE POLICY "review_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "review_photos_own_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'review-photos'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- STEP 7: HELPER FUNCTION — is_admin_or_staff
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  );
$$;

-- ============================================================
-- STEP 8: FUNCTION — verify_purchase (check if user bought product)
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_purchased_product(p_profile_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.profile_id = p_profile_id
      AND oi.product_id = p_product_id
      AND o.status IN ('delivered', 'shipped', 'processing', 'confirmed')
  );
$$;

-- ============================================================
-- STEP 9: FUNCTION — get_product_rating_summary (approved only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_product_rating_summary(p_product_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_reviews', COUNT(*),
    'average_rating', ROUND(AVG(rating)::numeric, 1),
    'rating_distribution', jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    )
  )
  FROM public.reviews
  WHERE product_id = p_product_id
    AND status = 'approved';
$$;

-- ============================================================
-- STEP 10: FUNCTION — notify_review_status (send notification)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_review_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify on approval
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (profile_id, notification_type, title, body, data)
    VALUES (
      NEW.profile_id,
      'review_approved',
      '¡Tu reseña fue aprobada!',
      'Tu reseña ha sido publicada y ya es visible en la tienda.',
      jsonb_build_object('review_id', NEW.id, 'product_id', NEW.product_id)
    );
  END IF;

  -- Notify on rejection
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO public.notifications (profile_id, notification_type, title, body, data)
    VALUES (
      NEW.profile_id,
      'review_rejected',
      'Tu reseña no fue aprobada',
      'Tu reseña no cumple con nuestras políticas de contenido.',
      jsonb_build_object('review_id', NEW.id, 'product_id', NEW.product_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_review_status ON public.reviews;
CREATE TRIGGER trg_notify_review_status
  AFTER UPDATE OF status ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review_status_change();

-- ============================================================
-- STEP 11: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON public.reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_profile_id ON public.reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured ON public.reviews(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- ============================================================
-- STEP 12: ENABLE REALTIME ON reviews
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
END $$;
