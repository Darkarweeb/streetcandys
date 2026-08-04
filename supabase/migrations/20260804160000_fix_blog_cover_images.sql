-- Migration: Fix blog post cover images
-- Timestamp: 20260804160000
-- Problem: All blog posts had cover_image_url pointing to Unsplash CDN URLs.
--          Unsplash blocks hotlinking from production domains not registered with their API,
--          causing all non-featured articles to fail loading their cover image.
-- Fix: Replace all Unsplash URLs with local /assets/images/blog-*.png paths that are
--      already bundled in the project and always available.

DO $$
BEGIN

  -- ─── Articles about cannabis strains / variedades ───────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-variedades-cannabis.png'
  WHERE slug IN (
    'most-influential-cannabis-strains',
    'strongest-cannabis-strains',
    'what-is-kush',
    'what-is-skunk-cannabis',
    'indica-sativa-hybrid-guide',
    'sativa-indica-hibrida-guia',
    'variedades-cannabis-influyentes'
  );

  -- ─── Articles about cannabis science / ciencia ──────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-ciencia-cannabis.png'
  WHERE slug IN (
    'why-eyes-turn-red-after-cannabis',
    'cannabis-measurements-guide',
    'what-is-shake-trim-popcorn',
    'hash-vs-flower-guide',
    'cannabinoides-explicados',
    'thca-explicado',
    'thc-en-cuerpo'
  );

  -- ─── Articles about consumption methods / métodos de consumo ────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-consumo-responsable.png'
  WHERE slug IN (
    'joint-blunt-spliff-guide',
    'como-usar-cannabis',
    'metodos-consumo-cannabis'
  );

  -- ─── Articles about terpenes / terpenos ─────────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-terpenos-cannabis.png'
  WHERE slug IN (
    'terpenos-cannabis',
    'terpenes-guide',
    'cannabis-terpenes'
  );

  -- ─── Articles about edibles / comestibles ───────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-comestibles-cannabis.png'
  WHERE slug IN (
    'comestibles-cannabis',
    'edibles-guide',
    'cannabis-edibles'
  );

  -- ─── Articles about CBD / bienestar ─────────────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-bienestar-cbd.png'
  WHERE slug IN (
    'cbd-vs-thc',
    'cbd-thc-diferencia',
    'bienestar-cbd',
    'cbd-guide'
  );

  -- ─── Articles about lab testing / laboratorio ───────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-pruebas-laboratorio.png'
  WHERE slug IN (
    'como-leer-coa-cannabis',
    'lab-testing-guide',
    'cannabis-lab-tests'
  );

  -- ─── Articles for beginners / principiantes ─────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-principiantes.png'
  WHERE slug IN (
    'guia-principiantes-cannabis',
    'beginner-cannabis-guide',
    'cannabis-beginners'
  );

  -- ─── Articles about storage / almacenamiento ────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-almacenamiento-cannabis.png'
  WHERE slug IN (
    'como-guardar-cannabis',
    'cannabis-storage-guide',
    'almacenamiento-cannabis'
  );

  -- ─── Articles about dosing / dosificación ───────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-dosis-cannabis.png'
  WHERE slug IN (
    'guia-dosificacion-cannabis',
    'cannabis-dosing-guide',
    'dosificacion-cannabis'
  );

  -- ─── Articles about oils / aceites ──────────────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-aceites-tinturas.png'
  WHERE slug IN (
    'aceites-tinturas-cannabis',
    'cannabis-oils-guide',
    'cbd-oils-tinctures'
  );

  -- ─── Articles about legal / legal ───────────────────────────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-legal.png'
  WHERE slug IN (
    'guia-legal-cannabis',
    'cannabis-legal-guide',
    'legal-cannabis'
  );

  -- ─── Articles about indoor/outdoor/greenhouse / cultivo ─────────────────
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-ciencia-cannabis.png'
  WHERE slug IN (
    'cannabis-indoor-outdoor-greenhouse',
    'cultivo-cannabis',
    'cannabis-cultivation'
  );

  -- ─── Catch-all: any remaining post still pointing to an Unsplash URL ────
  -- Assign images based on keyword matching in the slug itself.
  -- This ensures future posts with Unsplash URLs also get fixed.

  -- Strains / variedades
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-variedades-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%strain%' OR slug LIKE '%variedad%' OR slug LIKE '%cepa%'
         OR slug LIKE '%kush%' OR slug LIKE '%skunk%' OR slug LIKE '%indica%'
         OR slug LIKE '%sativa%' OR slug LIKE '%hybrid%' OR slug LIKE '%hibrida%');

  -- Science / ciencia
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-ciencia-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%science%' OR slug LIKE '%ciencia%' OR slug LIKE '%cannabinoid%'
         OR slug LIKE '%thca%' OR slug LIKE '%thc%' OR slug LIKE '%cbd%'
         OR slug LIKE '%eyes%' OR slug LIKE '%ojos%' OR slug LIKE '%hash%'
         OR slug LIKE '%measurement%' OR slug LIKE '%medida%' OR slug LIKE '%shake%');

  -- Consumption / consumo
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-consumo-responsable.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%joint%' OR slug LIKE '%blunt%' OR slug LIKE '%spliff%'
         OR slug LIKE '%consumo%' OR slug LIKE '%consumption%' OR slug LIKE '%porro%');

  -- Terpenes / terpenos
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-terpenos-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%terpeno%' OR slug LIKE '%terpene%' OR slug LIKE '%aroma%');

  -- Edibles / comestibles
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-comestibles-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%edible%' OR slug LIKE '%comestible%' OR slug LIKE '%gomita%'
         OR slug LIKE '%chocolate%' OR slug LIKE '%gummy%');

  -- Dosing / dosificación
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-dosis-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%dosis%' OR slug LIKE '%dosificacion%' OR slug LIKE '%dosing%'
         OR slug LIKE '%dose%');

  -- Storage / almacenamiento
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-almacenamiento-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%almacen%' OR slug LIKE '%storage%' OR slug LIKE '%guardar%'
         OR slug LIKE '%conservar%');

  -- Lab / laboratorio
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-pruebas-laboratorio.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%laboratorio%' OR slug LIKE '%lab%' OR slug LIKE '%coa%'
         OR slug LIKE '%prueba%' OR slug LIKE '%test%' OR slug LIKE '%analisis%');

  -- Beginners / principiantes
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-principiantes.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%principiante%' OR slug LIKE '%beginner%' OR slug LIKE '%guia%'
         OR slug LIKE '%guide%' OR slug LIKE '%introduccion%');

  -- Oils / aceites
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-aceites-tinturas.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%aceite%' OR slug LIKE '%oil%' OR slug LIKE '%tintura%'
         OR slug LIKE '%tincture%' OR slug LIKE '%extracto%');

  -- Legal / legal
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-legal.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%legal%' OR slug LIKE '%ley%' OR slug LIKE '%regulacion%'
         OR slug LIKE '%normativa%');

  -- Wellness / bienestar
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-bienestar-cbd.png'
  WHERE cover_image_url LIKE '%unsplash%'
    AND (slug LIKE '%bienestar%' OR slug LIKE '%wellness%' OR slug LIKE '%salud%'
         OR slug LIKE '%health%' OR slug LIKE '%cbd%');

  -- Final fallback: any remaining Unsplash URL gets the education image
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-educacion-cannabis.png'
  WHERE cover_image_url LIKE '%unsplash%';

  RAISE NOTICE 'Blog cover images updated: all Unsplash URLs replaced with local assets.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating blog cover images: %', SQLERRM;
END $$;
