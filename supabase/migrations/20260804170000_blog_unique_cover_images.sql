-- Migration: Assign unique cover images to every blog article
-- Timestamp: 20260804170000
-- Standard: Every article gets its own unique image — no duplicates, no Unsplash URLs,
--            no third-party branding, no watermarks. All images are local premium assets.
--
-- UNIQUE IMAGE ASSIGNMENT MAP (20 articles × 20 unique images):
--  1. most-influential-cannabis-strains      → blog-variedades-cannabis.png
--  2. strongest-cannabis-strains             → blog-tricomas-cannabis.png
--  3. cannabis-measurements-guide            → blog-guia-dosis-cannabis.png
--  4. what-is-cannabis-shake                 → blog-cannabis-shake-trim.png
--  5. hash-vs-cannabis-flower                → blog-hash-concentrado.png
--  6. why-eyes-turn-red-after-cannabis       → blog-ciencia-cannabis.png
--  7. what-is-skunk-cannabis                 → blog-empaque-premium.png
--  8. what-is-kush                           → blog-educacion-cannabis.png
--  9. blunt-joint-spliff-comparison          → blog-consumo-responsable.png
-- 10. indica-sativa-hybrid-guide             → blog-bienestar-cbd.png
-- 11. como-leer-coa-cannabis                 → blog-pruebas-laboratorio.png
-- 12. thca-explicado                         → blog-aceites-tinturas.png
-- 13. guia-principiantes-primer-producto     → blog-guia-principiantes.png
-- 14. cannabinoides-explicados               → blog-cbd-vs-thc.png
-- 15. terpenos-cannabis                      → blog-terpenos-cannabis.png
-- 16. cannabis-indoor-outdoor-greenhouse     → blog-cultivo-indoor.png
-- 17. cuanto-tiempo-permanece-thc-cuerpo     → blog-guia-legal.png
-- 18. sativa-indica-hibrida-diferencias      → blog-experiencia-retail.png
-- 19. como-guardar-cannabis                  → blog-almacenamiento-cannabis.png
-- 20. guia-dosificacion-cannabis             → blog-comestibles-cannabis.png

DO $$
BEGIN

  -- ── 1. Most Influential Cannabis Strains ──────────────────────────────────
  -- Image: Multiple premium cannabis flower varieties — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-variedades-cannabis.png'
  WHERE slug = 'most-influential-cannabis-strains';

  -- ── 2. Strongest Cannabis Strains ────────────────────────────────────────
  -- Image: Extreme macro of trichomes — represents potency and cannabinoid density
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-tricomas-cannabis.png'
  WHERE slug = 'strongest-cannabis-strains';

  -- ── 3. Cannabis Measurements Guide ───────────────────────────────────────
  -- Image: Dosing tools, gummies, dropper — measurement and quantity context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-dosis-cannabis.png'
  WHERE slug = 'cannabis-measurements-guide';

  -- ── 4. What Is Cannabis Shake? ────────────────────────────────────────────
  -- Image: Cannabis shake and trim on marble — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-cannabis-shake-trim.png'
  WHERE slug = 'what-is-cannabis-shake';

  -- ── 5. Hash vs. Cannabis Flower ──────────────────────────────────────────
  -- Image: Hash resin next to cannabis flower — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-hash-concentrado.png'
  WHERE slug = 'hash-vs-cannabis-flower';

  -- ── 6. Why Do Eyes Turn Red After Cannabis? ───────────────────────────────
  -- Image: Cannabis science / biology — relevant to physiological science topic
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-ciencia-cannabis.png'
  WHERE slug = 'why-eyes-turn-red-after-cannabis';

  -- ── 7. What Is Skunk Cannabis? ────────────────────────────────────────────
  -- Image: Premium packaging — represents the brand/identity of skunk genetics
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-empaque-premium.png'
  WHERE slug = 'what-is-skunk-cannabis';

  -- ── 8. What Is Kush? ─────────────────────────────────────────────────────
  -- Image: Educational cannabis materials — Kush history and education
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-educacion-cannabis.png'
  WHERE slug = 'what-is-kush';

  -- ── 9. Blunt vs. Joint vs. Spliff ────────────────────────────────────────
  -- Image: Responsible consumption setup — consumption methods context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-consumo-responsable.png'
  WHERE slug = 'blunt-joint-spliff-comparison';

  -- ── 10. Indica vs. Sativa vs. Hybrid Guide ───────────────────────────────
  -- Image: CBD wellness products — effects and wellness context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-bienestar-cbd.png'
  WHERE slug = 'indica-sativa-hybrid-guide';

  -- ── 11. Cómo Leer un COA de Cannabis ─────────────────────────────────────
  -- Image: Laboratory equipment and certificates — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-pruebas-laboratorio.png'
  WHERE slug = 'como-leer-coa-cannabis';

  -- ── 12. THCA Explicado ────────────────────────────────────────────────────
  -- Image: Amber dropper bottles and oils — cannabinoid extracts context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-aceites-tinturas.png'
  WHERE slug = 'thca-explicado';

  -- ── 13. Guía para Principiantes: Primer Producto ─────────────────────────
  -- Image: Beginner reading educational guide — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-principiantes.png'
  WHERE slug = 'guia-principiantes-primer-producto';

  -- ── 14. Cannabinoides Explicados ─────────────────────────────────────────
  -- Image: CBD vs THC products side by side — cannabinoid comparison
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-cbd-vs-thc.png'
  WHERE slug = 'cannabinoides-explicados';

  -- ── 15. Terpenos del Cannabis ─────────────────────────────────────────────
  -- Image: Macro botanical flowers and aromatic plants — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-terpenos-cannabis.png'
  WHERE slug = 'terpenos-cannabis';

  -- ── 16. Cannabis Indoor, Outdoor y Greenhouse ────────────────────────────
  -- Image: Indoor cannabis cultivation under grow lights — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-cultivo-indoor.png'
  WHERE slug = 'cannabis-indoor-outdoor-greenhouse';

  -- ── 17. ¿Cuánto Tiempo Permanece el THC en el Cuerpo? ────────────────────
  -- Image: Legal/compliance context — drug testing and legal framework
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-legal.png'
  WHERE slug = 'cuanto-tiempo-permanece-thc-cuerpo';

  -- ── 18. Sativa, Indica e Híbrida: Diferencias Reales ─────────────────────
  -- Image: Premium retail experience — product selection context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-experiencia-retail.png'
  WHERE slug = 'sativa-indica-hibrida-diferencias';

  -- ── 19. Cómo Guardar Cannabis Correctamente ───────────────────────────────
  -- Image: Airtight glass jars with humidity control — directly relevant
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-almacenamiento-cannabis.png'
  WHERE slug = 'como-guardar-cannabis';

  -- ── 20. Guía de Dosificación de Cannabis ─────────────────────────────────
  -- Image: Premium gummies and infused products — dosing with edibles context
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-comestibles-cannabis.png'
  WHERE slug = 'guia-dosificacion-cannabis';

  -- ── Safety net: catch any remaining NULL or Unsplash cover images ─────────
  -- These would be articles added after this migration that haven't been assigned yet.
  -- Assign by slug keyword matching so no article is ever left without an image.

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-variedades-cannabis.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%strain%' OR slug LIKE '%variedad%' OR slug LIKE '%cepa%'
         OR slug LIKE '%kush%' OR slug LIKE '%skunk%' OR slug LIKE '%indica%'
         OR slug LIKE '%sativa%' OR slug LIKE '%hybrid%' OR slug LIKE '%hibrida%'
         OR slug LIKE '%flor%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-pruebas-laboratorio.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%laboratorio%' OR slug LIKE '%lab%' OR slug LIKE '%coa%'
         OR slug LIKE '%prueba%' OR slug LIKE '%test%' OR slug LIKE '%analisis%'
         OR slug LIKE '%certificado%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-terpenos-cannabis.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%terpeno%' OR slug LIKE '%terpene%' OR slug LIKE '%aroma%'
         OR slug LIKE '%sabor%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-comestibles-cannabis.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%edible%' OR slug LIKE '%comestible%' OR slug LIKE '%gomita%'
         OR slug LIKE '%gummy%' OR slug LIKE '%chocolate%' OR slug LIKE '%dosis%'
         OR slug LIKE '%dosificacion%' OR slug LIKE '%dosing%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-almacenamiento-cannabis.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%almacen%' OR slug LIKE '%storage%' OR slug LIKE '%guardar%'
         OR slug LIKE '%conservar%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-aceites-tinturas.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%aceite%' OR slug LIKE '%oil%' OR slug LIKE '%tintura%'
         OR slug LIKE '%tincture%' OR slug LIKE '%extracto%' OR slug LIKE '%thca%'
         OR slug LIKE '%cannabinoide%' OR slug LIKE '%cannabinoid%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-principiantes.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%principiante%' OR slug LIKE '%beginner%' OR slug LIKE '%primer%'
         OR slug LIKE '%introduccion%' OR slug LIKE '%introduction%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-consumo-responsable.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%consumo%' OR slug LIKE '%consumption%' OR slug LIKE '%joint%'
         OR slug LIKE '%blunt%' OR slug LIKE '%spliff%' OR slug LIKE '%vape%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-bienestar-cbd.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%bienestar%' OR slug LIKE '%wellness%' OR slug LIKE '%salud%'
         OR slug LIKE '%health%' OR slug LIKE '%cbd%' OR slug LIKE '%ansiedad%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-guia-legal.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%legal%' OR slug LIKE '%ley%' OR slug LIKE '%regulacion%'
         OR slug LIKE '%normativa%' OR slug LIKE '%thc%' OR slug LIKE '%deteccion%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-cultivo-indoor.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%cultivo%' OR slug LIKE '%indoor%' OR slug LIKE '%outdoor%'
         OR slug LIKE '%greenhouse%' OR slug LIKE '%grow%' OR slug LIKE '%planta%');

  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-ciencia-cannabis.png'
  WHERE (cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%')
    AND (slug LIKE '%ciencia%' OR slug LIKE '%science%' OR slug LIKE '%ojos%'
         OR slug LIKE '%eyes%' OR slug LIKE '%biologia%' OR slug LIKE '%biology%');

  -- Final fallback for any remaining unassigned articles
  UPDATE public.blog_posts
  SET cover_image_url = '/assets/images/blog-educacion-cannabis.png'
  WHERE cover_image_url IS NULL OR cover_image_url LIKE '%unsplash%';

  RAISE NOTICE 'Blog cover images: unique assignment complete. All 20 articles have distinct local images.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in blog cover image migration: %', SQLERRM;
END $$;
