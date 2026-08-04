/**
 * Blog Image Utility — Street Candys Visual Standard
 *
 * VISUAL STANDARD:
 * - Luxury editorial photography
 * - Botanical, modern, educational, premium
 * - Natural lighting, soft shadows, shallow depth of field
 * - Minimalist composition, earthy green palette, warm wood textures
 * - Clean white backgrounds when appropriate
 * - High-end commercial quality
 * - NO third-party branding, logos, trademarks, watermarks, or recognizable commercial products
 *
 * UNIQUENESS GUARANTEE:
 * Every article slug maps to exactly ONE image. No two articles share the same image.
 * The SLUG_IMAGE_MAP is the authoritative source of truth.
 *
 * VALIDATION:
 * Use BlogImageValidator.validate() before publishing any new post to enforce:
 *   ✓ Unique featured image (not used by another article)
 *   ✓ Alt text present
 *   ✓ Image optimization (local path preferred)
 *   ✓ Correct aspect ratio (16:9 = 1600×900)
 *   ✓ No duplicate image already used by another article
 */

import type { SyntheticEvent } from 'react';

// ─── Image Metadata Interface ─────────────────────────────────────────────────

export interface BlogImageMeta {
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
}

export interface BlogImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Complete Image Library ───────────────────────────────────────────────────
// 20 unique premium images — all local, all compliant with Street Candys visual standard.
// No third-party branding. No watermarks. No logos.

const IMAGE_LIBRARY: Record<string, BlogImageMeta> = {
  // ── Existing 16 images ──────────────────────────────────────────────────────
  'guia-dosis': {
    src: '/assets/images/blog-guia-dosis-cannabis.png',
    alt: 'Gomitas de CBD y aceite de cáñamo con herramientas de dosificación sobre mármol blanco',
    title: 'Guía de dosificación de productos de cannabis derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'variedades': {
    src: '/assets/images/blog-variedades-cannabis.png',
    alt: 'Múltiples cogollos de cannabis premium de diferentes variedades sobre pizarra oscura',
    title: 'Variedades premium de cannabis con detalle de tricomas y pistillos',
    width: 1600,
    height: 900,
  },
  'cbd-thc': {
    src: '/assets/images/blog-cbd-vs-thc.png',
    alt: 'Botella de aceite CBD y gomitas THC comparadas sobre fondo blanco',
    title: 'Comparación de productos CBD y THC derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'terpenos': {
    src: '/assets/images/blog-terpenos-cannabis.png',
    alt: 'Cogollo de cannabis rodeado de cítricos, pino, lavanda y mango representando perfiles de terpenos',
    title: 'Terpenos del cannabis: aromas y perfiles de sabor',
    width: 1600,
    height: 900,
  },
  'almacenamiento': {
    src: '/assets/images/blog-almacenamiento-cannabis.png',
    alt: 'Frascos herméticos de vidrio con control de humedad para almacenamiento de cannabis',
    title: 'Almacenamiento correcto de productos de cannabis derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'comestibles': {
    src: '/assets/images/blog-comestibles-cannabis.png',
    alt: 'Gomitas artesanales y chocolates infusionados con cannabis sobre mármol',
    title: 'Comestibles premium de cannabis: gomitas y chocolates artesanales',
    width: 1600,
    height: 900,
  },
  'principiantes': {
    src: '/assets/images/blog-guia-principiantes.png',
    alt: 'Persona leyendo guía educativa de cannabis en ambiente moderno',
    title: 'Guía para principiantes sobre productos de cannabis derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'laboratorio': {
    src: '/assets/images/blog-pruebas-laboratorio.png',
    alt: 'Científico analizando muestras de cáñamo en laboratorio moderno con certificados de análisis',
    title: 'Pruebas de laboratorio y control de calidad de productos de cannabis',
    width: 1600,
    height: 900,
  },
  'legal': {
    src: '/assets/images/blog-guia-legal.png',
    alt: 'Productos de cáñamo con empaque legal y sellos de certificación sobre fondo neutro',
    title: 'Marco legal de productos derivados del cáñamo y cannabis',
    width: 1600,
    height: 900,
  },
  'bienestar': {
    src: '/assets/images/blog-bienestar-cbd.png',
    alt: 'Productos de bienestar CBD sobre mármol blanco con planta suculenta',
    title: 'Bienestar y salud con productos de CBD derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'retail': {
    src: '/assets/images/blog-experiencia-retail.png',
    alt: 'Vitrina de tienda premium de cannabis con productos organizados elegantemente',
    title: 'Experiencia de compra premium en tienda de cannabis legal',
    width: 1600,
    height: 900,
  },
  'ciencia': {
    src: '/assets/images/blog-ciencia-cannabis.png',
    alt: 'Macro fotografía de tricomas y glándulas de resina en cogollo de cannabis premium',
    title: 'Ciencia del cannabis: tricomas, cannabinoides y compuestos activos',
    width: 1600,
    height: 900,
  },
  'aceites': {
    src: '/assets/images/blog-aceites-tinturas.png',
    alt: 'Botellas de aceite de cáñamo en vidrio ámbar con semillas de cáñamo sobre madera',
    title: 'Aceites y tinturas de CBD derivados del cáñamo premium',
    width: 1600,
    height: 900,
  },
  'consumo': {
    src: '/assets/images/blog-consumo-responsable.png',
    alt: 'Configuración de consumo responsable con vaporizador premium y cápsulas CBD',
    title: 'Consumo responsable de productos de cannabis derivados del cáñamo',
    width: 1600,
    height: 900,
  },
  'empaque': {
    src: '/assets/images/blog-empaque-premium.png',
    alt: 'Empaque premium de productos de cáñamo con diseño de marca elegante sobre fondo blanco',
    title: 'Empaque y presentación premium de productos de cannabis',
    width: 1600,
    height: 900,
  },
  'educacion': {
    src: '/assets/images/blog-educacion-cannabis.png',
    alt: 'Materiales educativos sobre ciencia del cáñamo con cogollo de cannabis sobre madera',
    title: 'Educación sobre cannabis: guías y recursos informativos',
    width: 1600,
    height: 900,
  },
  // ── 4 New images (generated for unique article coverage) ────────────────────
  'shake-trim': {
    src: '/assets/images/blog-cannabis-shake-trim.png',
    alt: 'Cannabis shake y trim — fragmentos de flor y pequeños cogollos sobre mármol blanco',
    title: 'Cannabis shake y trim: qué son y cómo usarlos',
    width: 1600,
    height: 900,
  },
  'hash-concentrado': {
    src: '/assets/images/blog-hash-concentrado.png',
    alt: 'Trozo de hachís dorado ámbar junto a cogollo de cannabis sobre superficie de madera cálida',
    title: 'Hachís y concentrados de cannabis: producción y diferencias',
    width: 1600,
    height: 900,
  },
  'tricomas': {
    src: '/assets/images/blog-tricomas-cannabis.png',
    alt: 'Macro extremo de tricomas y glándulas de resina cristalinas en cogollo de cannabis premium',
    title: 'Tricomas de cannabis: potencia, cannabinoides y calidad',
    width: 1600,
    height: 900,
  },
  'cultivo-indoor': {
    src: '/assets/images/blog-cultivo-indoor.png',
    alt: 'Plantas de cannabis creciendo bajo luces LED profesionales en sala de cultivo indoor moderna',
    title: 'Cultivo indoor de cannabis: calidad y métodos de producción',
    width: 1600,
    height: 900,
  },
};

// ─── Authoritative Slug → Image Key Map ──────────────────────────────────────
// This is the single source of truth for unique image assignment.
// Every slug maps to exactly ONE image key. No duplicates.
// When adding a new article, add its slug here with a unique image key.

const SLUG_IMAGE_MAP: Record<string, string> = {
  // Batch 1 (English articles)
  'most-influential-cannabis-strains':    'variedades',
  'strongest-cannabis-strains':           'tricomas',
  'cannabis-measurements-guide':          'guia-dosis',
  'what-is-cannabis-shake':               'shake-trim',
  'hash-vs-cannabis-flower':              'hash-concentrado',
  // Batch 2 (English articles)
  'why-eyes-turn-red-after-cannabis':     'ciencia',
  'what-is-skunk-cannabis':               'empaque',
  'what-is-kush':                         'educacion',
  'blunt-joint-spliff-comparison':        'consumo',
  'indica-sativa-hybrid-guide':           'bienestar',
  // Batch 3 (Spanish educational articles)
  'como-leer-coa-cannabis':               'laboratorio',
  'thca-explicado':                       'aceites',
  'guia-principiantes-primer-producto':   'principiantes',
  'cannabinoides-explicados':             'cbd-thc',
  'terpenos-cannabis':                    'terpenos',
  'cannabis-indoor-outdoor-greenhouse':   'cultivo-indoor',
  'cuanto-tiempo-permanece-thc-cuerpo':   'legal',
  'sativa-indica-hibrida-diferencias':    'retail',
  'como-guardar-cannabis':                'almacenamiento',
  'guia-dosificacion-cannabis':           'comestibles',
};

// ─── Keyword → Image Key Mapping ─────────────────────────────────────────────
// Used as fallback when a slug is not in SLUG_IMAGE_MAP (e.g., future articles).
// Ordered from most specific to least specific.

const KEYWORD_MAP: Array<{ keywords: string[]; imageKey: string }> = [
  { keywords: ['dosis', 'dosificaci', 'cuánto', 'cuanto', 'cantidad', 'mg', 'miligramo'], imageKey: 'guia-dosis' },
  { keywords: ['shake', 'trim', 'popcorn', 'restos', 'fragmento'], imageKey: 'shake-trim' },
  { keywords: ['hash', 'hachís', 'hashish', 'concentrado', 'rosin', 'bho', 'kief'], imageKey: 'hash-concentrado' },
  { keywords: ['tricoma', 'trichome', 'resina', 'potencia', 'strongest', 'más fuerte', 'mas fuerte'], imageKey: 'tricomas' },
  { keywords: ['variedad', 'strain', 'cepa', 'indica', 'sativa', 'híbrido', 'hibrido', 'flor', 'flores', 'cogollo'], imageKey: 'variedades' },
  { keywords: ['cbd vs thc', 'thc vs cbd', 'diferencia entre cbd', 'diferencia entre thc', 'cannabinoide'], imageKey: 'cbd-thc' },
  { keywords: ['terpeno', 'aroma', 'sabor', 'limoneno', 'mirceno', 'linalool', 'pineno', 'skunk'], imageKey: 'terpenos' },
  { keywords: ['almacen', 'guardar', 'conservar', 'humedad', 'temperatura', 'frasco', 'envase'], imageKey: 'almacenamiento' },
  { keywords: ['comestible', 'gomita', 'gummy', 'chocolate', 'infusion', 'infusión', 'brownie', 'edible'], imageKey: 'comestibles' },
  { keywords: ['principiante', 'beginner', 'empezar', 'comenzar', 'primera vez', 'guía básica', 'guia basica', 'introducción', 'primer producto'], imageKey: 'principiantes' },
  { keywords: ['laboratorio', 'prueba', 'análisis', 'analisis', 'certificado', 'coa', 'test', 'calidad'], imageKey: 'laboratorio' },
  { keywords: ['legal', 'ley', 'regulación', 'regulacion', 'cumplimiento', 'normativa', 'permitido', 'licencia', 'detección', 'deteccion'], imageKey: 'legal' },
  { keywords: ['bienestar', 'wellness', 'salud', 'ansiedad', 'estrés', 'estres', 'sueño', 'sueno', 'dolor', 'inflamación'], imageKey: 'bienestar' },
  { keywords: ['tienda', 'dispensario', 'comprar', 'retail', 'experiencia', 'servicio', 'atención'], imageKey: 'retail' },
  { keywords: ['ciencia', 'cannabinoide', 'endocannabinoide', 'receptor', 'sistema', 'neurología', 'bioquímica', 'ojos', 'eyes'], imageKey: 'ciencia' },
  { keywords: ['aceite', 'tintura', 'tinctura', 'gotas', 'sublingual', 'extracto', 'thca'], imageKey: 'aceites' },
  { keywords: ['consumo', 'uso', 'método', 'metodo', 'forma de usar', 'cómo usar', 'como usar', 'vaporizador', 'joint', 'blunt', 'spliff'], imageKey: 'consumo' },
  { keywords: ['empaque', 'packaging', 'presentación', 'presentacion', 'etiqueta', 'diseño', 'marca'], imageKey: 'empaque' },
  { keywords: ['cultivo', 'indoor', 'outdoor', 'greenhouse', 'invernadero', 'grow', 'planta', 'cultivar'], imageKey: 'cultivo-indoor' },
  { keywords: ['cbd', 'cannabidiol'], imageKey: 'bienestar' },
  { keywords: ['thc', 'tetrahidrocannabinol'], imageKey: 'variedades' },
  { keywords: ['cáñamo', 'cañamo', 'hemp', 'cannabis'], imageKey: 'educacion' },
];

// ─── Category → Image Key Mapping ────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'educacion': 'educacion',
  'educación': 'educacion',
  'cannabis-education': 'educacion',
  'guias': 'principiantes',
  'guías': 'principiantes',
  'guias-principiantes': 'principiantes',
  'ciencia': 'ciencia',
  'cannabis-science': 'ciencia',
  'productos': 'comestibles',
  'bienestar': 'bienestar',
  'wellness': 'bienestar',
  'legal': 'legal',
  'noticias': 'retail',
  'cultura': 'consumo',
  'recetas': 'comestibles',
  'laboratorio': 'laboratorio',
  'variedades': 'variedades',
  'cannabis-strains': 'variedades',
  'consumption-methods': 'consumo',
  'cultivo-calidad': 'cultivo-indoor',
};

// ─── Fallback Pool ────────────────────────────────────────────────────────────
// Used only when no slug, keyword, or category match is found.
// Rotates deterministically by slug hash — never random.
const FALLBACK_POOL = [
  'guia-dosis', 'variedades', 'bienestar', 'comestibles',
  'terpenos', 'aceites', 'laboratorio', 'principiantes',
  'ciencia', 'consumo', 'empaque', 'educacion',
  'shake-trim', 'hash-concentrado', 'tricomas', 'cultivo-indoor',
];

function deterministicIndex(str: string, poolLength: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % poolLength;
}

// ─── Main Resolver ────────────────────────────────────────────────────────────

/**
 * Resolves the best image for a blog post.
 * Priority order:
 *   1. DB cover_image_url (if set and not an Unsplash URL)
 *   2. Authoritative SLUG_IMAGE_MAP (exact slug match)
 *   3. Keyword match against title + slug + category
 *   4. Category slug/name match
 *   5. Deterministic fallback from pool (stable per slug, never random)
 */
export function resolveBlogImage(post: {
  cover_image_url?: string | null;
  title?: string | null;
  slug?: string | null;
  blog_categories?: { name?: string; slug?: string } | null;
}): BlogImageMeta {
  // 1. Use DB image if available and not an Unsplash URL
  if (post.cover_image_url && !post.cover_image_url.includes('unsplash')) {
    return {
      src: post.cover_image_url,
      alt: post.title || 'Artículo del blog de Street Candys',
      title: post.title || 'Artículo del blog de Street Candys',
      width: 1600,
      height: 900,
    };
  }

  // 2. Authoritative slug map (exact match — guarantees uniqueness)
  const slug = (post.slug || '').toLowerCase();
  if (slug && SLUG_IMAGE_MAP[slug]) {
    return IMAGE_LIBRARY[SLUG_IMAGE_MAP[slug]];
  }

  const searchText = [
    post.title || '',
    slug,
    post.blog_categories?.name || '',
    post.blog_categories?.slug || '',
  ].join(' ').toLowerCase();

  // 3. Keyword match against title + slug + category
  for (const { keywords, imageKey } of KEYWORD_MAP) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return IMAGE_LIBRARY[imageKey];
    }
  }

  // 4. Category slug/name match
  const catSlug = (post.blog_categories?.slug || '').toLowerCase();
  const catName = (post.blog_categories?.name || '').toLowerCase();
  for (const [key, imageKey] of Object.entries(CATEGORY_MAP)) {
    if (catSlug.includes(key) || catName.includes(key)) {
      return IMAGE_LIBRARY[imageKey];
    }
  }

  // 5. Deterministic fallback from pool (never random, always stable per slug)
  const fallbackKey = FALLBACK_POOL[deterministicIndex(slug || post.title || 'default', FALLBACK_POOL.length)];
  return IMAGE_LIBRARY[fallbackKey];
}

/**
 * Returns a BlogImageMeta for use in <img> tags with full SEO attributes.
 * Guarantees a real image is always returned — never a placeholder.
 * Attaches onError handler for external URLs to prevent silent failures.
 */
export function getBlogImageProps(post: {
  cover_image_url?: string | null;
  title?: string | null;
  slug?: string | null;
  blog_categories?: { name?: string; slug?: string } | null;
}): BlogImageMeta & { onError?: (e: SyntheticEvent<HTMLImageElement>) => void } {
  const resolved = resolveBlogImage(post);

  // If the resolved src is an external URL (not a local /assets path),
  // attach an onError handler that logs the failure and swaps to the
  // keyword-matched local fallback so the user never sees a broken image.
  if (resolved.src.startsWith('http')) {
    const fallbackResolved = resolveBlogImage({ ...post, cover_image_url: null });

    return {
      ...resolved,
      onError: (e: SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.src !== fallbackResolved.src) {
          console.warn(
            `[BlogImage] External cover image failed to load for "${post.slug || post.title}". ` +
            `URL: ${img.src}. Falling back to local asset: ${fallbackResolved.src}`
          );
          img.src = fallbackResolved.src;
          img.alt = fallbackResolved.alt;
        }
      },
    };
  }

  return resolved;
}

// ─── Blog Image Validator ─────────────────────────────────────────────────────
/**
 * BlogImageValidator — Future-proofing system.
 *
 * Use this before publishing any new blog post to enforce:
 *   ✓ A unique featured image (not used by another article)
 *   ✓ Alt text present
 *   ✓ Image optimization (local path preferred)
 *   ✓ Correct aspect ratio (16:9)
 *   ✓ No duplicate image already used by another article
 *
 * Usage:
 *   const result = BlogImageValidator.validate({
 *     slug: 'my-new-article',
 *     cover_image_url: '/assets/images/my-image.png',
 *     alt_text: 'Description of the image',
 *     existingSlugs: ['other-article-1', 'other-article-2'],
 *   });
 *   if (!result.valid) console.error(result.errors);
 */
export class BlogImageValidator {
  /**
   * Returns the set of image URLs currently assigned to known articles.
   * Used to detect duplicate image assignments.
   */
  static getAssignedImages(): Set<string> {
    const assigned = new Set<string>();
    for (const imageKey of Object.values(SLUG_IMAGE_MAP)) {
      const meta = IMAGE_LIBRARY[imageKey];
      if (meta) assigned.add(meta.src);
    }
    return assigned;
  }

  /**
   * Returns the image URL that would be assigned to a given slug.
   */
  static getImageForSlug(slug: string): string | null {
    const key = SLUG_IMAGE_MAP[slug.toLowerCase()];
    return key ? IMAGE_LIBRARY[key]?.src ?? null : null;
  }

  /**
   * Validates a new blog post's image configuration before publishing.
   */
  static validate(post: {
    slug: string;
    cover_image_url?: string | null;
    alt_text?: string | null;
    existingSlugs?: string[];
  }): BlogImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Must have a featured image
    if (!post.cover_image_url) {
      errors.push('❌ Missing featured image. Every article must have a cover_image_url.');
    }

    // Rule 2: Must have alt text
    if (!post.alt_text || post.alt_text.trim().length === 0) {
      errors.push('❌ Missing alt text. Every featured image must have descriptive alt text.');
    }

    if (post.cover_image_url) {
      // Rule 3: Prefer local images over external URLs
      if (post.cover_image_url.startsWith('http')) {
        warnings.push('⚠️ External image URL detected. Prefer local /assets/images/ paths for reliability and performance.');
      }

      // Rule 4: No Unsplash or stock agency URLs
      const blockedDomains = ['unsplash.com', 'shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'stock.adobe.com'];
      for (const domain of blockedDomains) {
        if (post.cover_image_url.includes(domain)) {
          errors.push(`❌ Blocked image source: ${domain}. Use local assets or Street Candys-owned images only.`);
        }
      }

      // Rule 5: No watermark indicators in URL
      const watermarkIndicators = ['watermark', 'preview', 'sample', 'demo', 'placeholder'];
      for (const indicator of watermarkIndicators) {
        if (post.cover_image_url.toLowerCase().includes(indicator)) {
          errors.push(`❌ Possible watermarked image detected (URL contains "${indicator}"). Use clean, licensed images only.`);
        }
      }

      // Rule 6: Check for duplicate image across existing articles
      const assignedImages = BlogImageValidator.getAssignedImages();
      if (assignedImages.has(post.cover_image_url)) {
        errors.push(`❌ Duplicate image detected. This image is already used by another article. Every article must have a UNIQUE featured image.`);
      }

      // Rule 7: Check if slug already has an assigned image in the map
      if (SLUG_IMAGE_MAP[post.slug.toLowerCase()]) {
        const assignedSrc = IMAGE_LIBRARY[SLUG_IMAGE_MAP[post.slug.toLowerCase()]]?.src;
        if (assignedSrc && assignedSrc !== post.cover_image_url) {
          warnings.push(`⚠️ This slug has a pre-assigned image in SLUG_IMAGE_MAP (${assignedSrc}). Update SLUG_IMAGE_MAP if you want to use a different image.`);
        }
      } else {
        warnings.push(`⚠️ Slug "${post.slug}" is not in SLUG_IMAGE_MAP. Add it to guarantee uniqueness for future validation.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generates a validation report for all known articles.
   * Returns a summary of compliance status.
   */
  static generateComplianceReport(): {
    totalArticles: number;
    compliant: number;
    issues: Array<{ slug: string; issue: string }>;
  } {
    const issues: Array<{ slug: string; issue: string }> = [];
    const imageUsage = new Map<string, string[]>();

    // Check all mapped slugs for duplicate images
    for (const [slug, imageKey] of Object.entries(SLUG_IMAGE_MAP)) {
      const src = IMAGE_LIBRARY[imageKey]?.src;
      if (!src) {
        issues.push({ slug, issue: `Image key "${imageKey}" not found in IMAGE_LIBRARY` });
        continue;
      }
      if (!imageUsage.has(src)) {
        imageUsage.set(src, []);
      }
      imageUsage.get(src)!.push(slug);
    }

    // Flag any image used by more than one article
    for (const [src, slugs] of imageUsage.entries()) {
      if (slugs.length > 1) {
        for (const slug of slugs) {
          issues.push({ slug, issue: `Duplicate image: ${src} shared with ${slugs.filter(s => s !== slug).join(', ')}` });
        }
      }
    }

    const totalArticles = Object.keys(SLUG_IMAGE_MAP).length;
    return {
      totalArticles,
      compliant: totalArticles - issues.length,
      issues,
    };
  }
}
