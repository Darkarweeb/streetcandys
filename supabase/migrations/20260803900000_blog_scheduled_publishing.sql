-- ============================================================
-- Blog System: Scheduled Publishing & RLS Enhancements
-- Migration: 20260803900000_blog_scheduled_publishing.sql
-- ============================================================

-- Add 'scheduled' to blog_post_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'scheduled'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'blog_post_status')
  ) THEN
    ALTER TYPE public.blog_post_status ADD VALUE 'scheduled';
  END IF;
END;
$$;

-- Function to auto-publish scheduled posts
CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.blog_posts
  SET status = 'published'
  WHERE status = 'draft'
    AND published_at IS NOT NULL
    AND published_at <= NOW();
END;
$$;

-- Index for efficient scheduled post queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled
  ON public.blog_posts(published_at)
  WHERE status = 'draft' AND published_at IS NOT NULL;

-- Full-text search index on blog posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_title_search
  ON public.blog_posts USING GIN(to_tsvector('spanish', title));

-- Index for tag filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured
  ON public.blog_posts(is_featured)
  WHERE is_featured = TRUE;
