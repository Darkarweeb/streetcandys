-- Migration: Final Blog Content Cleanup
-- Timestamp: 20260804020000
-- Purpose: Strip all JSON-LD <script> blocks and <style> tags from blog_posts.content
-- This runs AFTER the batch article migrations so it catches all dirty content.

DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN

  -- Step 1: Strip all <script type="application/ld+json">...</script> blocks
  UPDATE public.blog_posts
  SET content = regexp_replace(
    content,
    '<script[^>]*type\s*=\s*[''"]application/ld\+json[''"][^>]*>[\s\S]*?</script>',
    '',
    'gi'
  )
  WHERE content IS NOT NULL
    AND content ~* '<script[^>]*type\s*=\s*[''"]application/ld\+json[''"]';

  -- Step 2: Strip any remaining <script> tags (safety net)
  UPDATE public.blog_posts
  SET content = regexp_replace(
    content,
    '<script[\s\S]*?</script>',
    '',
    'gi'
  )
  WHERE content IS NOT NULL
    AND content ~* '<script';

  -- Step 3: Strip <style> tags
  UPDATE public.blog_posts
  SET content = regexp_replace(
    content,
    '<style[\s\S]*?</style>',
    '',
    'gi'
  )
  WHERE content IS NOT NULL
    AND content ~* '<style';

  -- Step 4: Unwrap bare <article> wrapper tags
  UPDATE public.blog_posts
  SET content = regexp_replace(
    regexp_replace(
      trim(content),
      '^\s*<article[^>]*>\s*',
      '',
      'i'
    ),
    '\s*</article>\s*$',
    '',
    'i'
  )
  WHERE content IS NOT NULL
    AND content ~* '^\s*<article';

  -- Step 5: Trim leading/trailing whitespace
  UPDATE public.blog_posts
  SET content = trim(content)
  WHERE content IS NOT NULL;

  -- Verification
  SELECT COUNT(*) INTO cleaned_count
  FROM public.blog_posts
  WHERE content ~* '<script';

  IF cleaned_count > 0 THEN
    RAISE WARNING 'WARNING: % blog posts still contain <script> tags after cleanup!', cleaned_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All blog post content is clean — zero <script> tags remain.';
  END IF;

END $$;
