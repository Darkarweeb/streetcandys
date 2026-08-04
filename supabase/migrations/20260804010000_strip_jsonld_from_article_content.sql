-- Migration: Strip JSON-LD <script> blocks from blog article body content
-- Root cause: article content was stored with embedded <script type="application/ld+json">
-- blocks that should only appear in the page <head>, not in the article body.

-- Step 1: Strip all <script type="application/ld+json">...</script> blocks from content.
-- Uses regexp_replace with 'g' flag (global) to remove ALL occurrences per row.
-- The regex matches from <script type="application/ld+json"> through the closing </script>
-- including any whitespace/newlines between them (using [\s\S] to match newlines).

UPDATE public.blog_posts
SET content = TRIM(
  regexp_replace(
    content,
    '<script[^>]*type=[''"]application/ld\+json[''"][^>]*>[\s\S]*?</script>',
    '',
    'gi'
  )
)
WHERE content IS NOT NULL
  AND content ~ '<script[^>]*type=[''"]application/ld\+json[''"]';

-- Step 2: Also strip any remaining <script> tags of any type from content (safety net).
UPDATE public.blog_posts
SET content = TRIM(
  regexp_replace(
    content,
    '<script[\s\S]*?</script>',
    '',
    'gi'
  )
)
WHERE content IS NOT NULL
  AND content ~ '<script';

-- Step 3: Clean up leading/trailing <article> wrapper tags if present,
-- since the content was wrapped in <article>...</article> in the original data.
UPDATE public.blog_posts
SET content = TRIM(
  regexp_replace(
    regexp_replace(content, '^\s*<article[^>]*>', '', 'i'),
    '</article>\s*$', '', 'i'
  )
)
WHERE content IS NOT NULL
  AND (content ~ '^\s*<article' OR content ~ '</article>\s*$');

-- Verification notice
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.blog_posts
  WHERE content ~ '<script';

  IF remaining_count = 0 THEN
    RAISE NOTICE 'SUCCESS: All <script> tags removed from blog article content. Articles are clean.';
  ELSE
    RAISE NOTICE 'WARNING: % article(s) still contain <script> tags. Manual review required.', remaining_count;
  END IF;
END $$;
