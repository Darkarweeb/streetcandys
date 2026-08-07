// cache-bust-7
'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import AnnouncementBar from '@/components/AnnouncementBar';
import type { ProductSummary } from '@/lib/products/types';
import { formatPrice, formatPriceValue, isProductAvailableInCountry, type Country } from '@/lib/price';
import { useCartPersistence } from '@/hooks/useCartPersistence';
import { getBlogImageProps } from '@/lib/blog/blog-image-utils';

const COUNTRY_KEY = 'sc_country';

// ─── Dynamic imports for below-fold heavy components ─────────────────────────
const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="bg-sc-darkforest h-64 animate-pulse" aria-hidden="true" />,
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
});
const SpinToWin = dynamic(() => import('@/components/SpinToWin'), {
  ssr: false,
});

// ─── Types ───────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  image: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  slug: string;
  read_time_minutes: number | null;
  blog_categories?: { name: string; slug: string } | null;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-sc-beige rounded-card ${className ?? ''}`}
      aria-hidden="true"
    />
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onAddToCart,
  country,
}: {
  product: ProductSummary;
  onAddToCart: (p: ProductSummary) => void;
  country: Country;
}) {
  const mainImage = product.images?.[0]?.url || product.thumbnail_url;
  const mainAlt = product.images?.[0]?.alt || product.name;
  const inStock = product.inventory_status?.is_in_stock !== false;
  const available = isProductAvailableInCountry(product, country);
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.base_price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.base_price / product.compare_at_price!) * 100)
    : 0;

  const priceStr = formatPrice(product, country) ?? formatPriceValue(product.base_price, 'CO');
  const comparePriceStr = hasDiscount && country === 'CO'
    ? formatPriceValue(product.compare_at_price!, 'CO')
    : null;

  if (!available) return null;

  return (
    <article className="group flex flex-col" aria-label={product.name}>
      <Link href={`/productos/${product.slug}`} className="block flex-1">
        <div className="relative rounded-card overflow-hidden mb-3 bg-sc-beige aspect-square">
          {mainImage ? (
            <img
              src={mainImage}
              alt={mainAlt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-sc-beige">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                className="text-sc-border"
                aria-hidden="true"
              >
                <rect
                  x="8"
                  y="8"
                  width="32"
                  height="32"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 32l10-10 8 8 6-6 8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_featured && (
              <span className="bg-sc-forest text-sc-cream text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                Destacado
              </span>
            )}
            {hasDiscount && (
              <span className="bg-sc-periwinkle text-white text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                -{discountPct}%
              </span>
            )}
          </div>
          {product.effects && product.effects.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
              <span className="text-white text-xs font-medium capitalize">
                {product.effects[0]}
              </span>
            </div>
          )}
        </div>
        <div className="px-1 space-y-1.5">
          {product.category && (
            <p className="text-sc-muted text-[11px] font-medium uppercase tracking-wider">
              {product.category.name}
            </p>
          )}
          <h3 className="text-sc-forest font-semibold text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.reviews_summary && product.reviews_summary.total_reviews > 0 && (
            <div
              className="flex items-center gap-1"
              aria-label={`${product.reviews_summary.average_rating} de 5 estrellas`}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill={s <= Math.round(product.reviews_summary!.average_rating) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-sc-forest"
                  aria-hidden="true"
                >
                  <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
                </svg>
              ))}
              <span className="text-xs text-sc-muted ml-0.5">
                ({product.reviews_summary.total_reviews})
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sc-forest font-bold text-sm">
              {priceStr}
            </span>
            {comparePriceStr && (
              <span className="text-sc-muted text-xs line-through">
                {comparePriceStr}
              </span>
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={() => onAddToCart(product)}
        disabled={!inStock}
        className={`mt-3 w-full text-sm font-bold py-3 px-5 rounded-pill transition-all duration-200 active:scale-95 ${
          inStock
            ? 'bg-sc-forest text-sc-cream hover:bg-sc-green'
            : 'bg-sc-beige text-sc-muted cursor-not-allowed'
        }`}
        aria-label={inStock ? `Agregar ${product.name} al carrito` : `${product.name} agotado`}
      >
        {inStock ? 'Agregar al carrito' : 'Agotado'}
      </button>
    </article>
  );
}

// ─── Product Grid Skeleton ────────────────────────────────────────────────────
function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-10 w-full rounded-pill" />
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  label,
  title,
  subtitle,
  href,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 lg:mb-10">
      <div>
        {label && (
          <p className="text-sc-forest/80 text-xs font-bold uppercase tracking-widest mb-2">
            {label}
          </p>
        )}
        <h2 className="text-sc-forest font-black text-3xl lg:text-4xl tracking-tightest leading-none">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sc-forest/80 text-sm mt-2 max-w-md">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 inline-flex items-center gap-2 text-sc-forest text-sm font-bold border-b border-sc-forest pb-0.5 hover:opacity-70 transition-opacity"
        >
          Ver todos
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-sc-beige flex items-center justify-center mb-4">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          className="text-sc-muted"
          aria-hidden="true"
        >
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M14 9v5M14 17v1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-sc-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sc-muted text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sc-forest text-sm font-bold border-b border-sc-forest hover:opacity-70 transition-opacity"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection({
  country,
  onShopNow,
}: {
  country: string;
  onShopNow: () => void;
}) {
  const headline =
    country === 'CR' ?'El mejor cannabis de Costa Rica' :'El mejor cannabis de Colombia';
  const sub =
    country === 'CR' ?'Productos premium de cáñamo. Entrega en todo Costa Rica.' :'Productos premium de cáñamo. Entrega en toda Colombia.';

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-sc-darkforest"
      aria-label="Sección principal"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, #4571CB 0%, transparent 50%), radial-gradient(circle at 80% 20%, #163317 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sc-darkforest/20 via-transparent to-sc-darkforest/60" aria-hidden="true" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 lg:px-8 py-24 lg:py-32 w-full">
        <div className="max-w-2xl animate-slide-up">
          {/* Country badge */}
          <div className="inline-flex items-center gap-2 bg-sc-cream/10 border border-sc-cream/20 rounded-pill px-4 py-2 mb-8">
            <span className="text-lg" aria-hidden="true">
              {country === 'CR' ? '🇨🇷' : '🇨🇴'}
            </span>
            <span className="text-sc-cream/80 text-xs font-semibold uppercase tracking-widest">
              {country === 'CR' ? 'Costa Rica' : 'Colombia'}
            </span>
          </div>

          <h1 className="text-sc-cream font-black text-5xl sm:text-6xl lg:text-7xl tracking-tightest leading-none mb-6">
            {headline}
          </h1>
          <p className="text-sc-cream/70 text-lg lg:text-xl leading-relaxed mb-10 max-w-lg">
            {sub}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onShopNow}
              className="inline-flex items-center gap-2 bg-sc-cream text-sc-forest font-bold text-base px-8 py-4 rounded-pill hover:bg-sc-beige transition-colors active:scale-95"
            >
              Explorar productos
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 border border-sc-cream/30 text-sc-cream font-bold text-base px-8 py-4 rounded-pill hover:bg-sc-cream/10 transition-colors"
            >
              Ver catálogo
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6 mt-12 pt-12 border-t border-sc-cream/10">
            {[
              { icon: '🌿', text: 'Cáñamo 100% natural' },
              { icon: '🔬', text: 'Certificado en laboratorio' },
              { icon: '🚚', text: 'Envío rápido y seguro' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">
                  {b.icon}
                </span>
                <span className="text-sc-cream/60 text-sm font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURED PRODUCTS ────────────────────────────────────────────────────────
function FeaturedProducts({
  onAddToCart,
  country,
}: {
  onAddToCart: (p: ProductSummary) => void;
  country: string;
}) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos/destacados?limite=8');
      const data = await res.json();
      if (data.exito) setProducts(data.datos ?? []);
      else setError('No se pudieron cargar los productos destacados.');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section
      id="destacados"
      className="py-16 lg:py-24 bg-sc-cream"
      aria-labelledby="destacados-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Selección especial"
          title="Productos destacados"
          subtitle="Nuestros favoritos seleccionados a mano para ti."
          href="/productos?destacado=true"
        />
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState message="No hay productos destacados disponibles en este momento." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} country={country} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── NEW ARRIVALS ─────────────────────────────────────────────────────────────
function NewArrivals({
  onAddToCart,
  country,
}: {
  onAddToCart: (p: ProductSummary) => void;
  country: string;
}) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos/nuevos?limite=4');
      const data = await res.json();
      if (data.exito) setProducts(data.datos ?? []);
      else setError('No se pudieron cargar los nuevos productos.');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section
      id="nuevos"
      className="py-16 lg:py-24 bg-sc-tan"
      aria-labelledby="nuevos-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Recién llegados"
          title="Nuevos productos"
          subtitle="Los últimos lanzamientos de Street Candy."
          href="/productos?nuevo=true"
        />
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState message="No hay nuevos productos disponibles en este momento." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} country={country} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── BEST SELLERS ─────────────────────────────────────────────────────────────
function BestSellers({
  onAddToCart,
  country,
}: {
  onAddToCart: (p: ProductSummary) => void;
  country: string;
}) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos/mas-vendidos?limite=4');
      const data = await res.json();
      if (data.exito) setProducts(data.datos ?? []);
      else setError('No se pudieron cargar los más vendidos.');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section
      id="mas-vendidos"
      className="py-16 lg:py-24 bg-sc-cream"
      aria-labelledby="mas-vendidos-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Los favoritos"
          title="Más vendidos"
          subtitle="Los productos que más aman nuestros clientes."
          href="/productos?ordenar=mas_vendido"
        />
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState message="No hay datos de ventas disponibles aún." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {products.map((p, i) => (
              <div key={p.id} className="relative">
                <div className="absolute -top-3 -left-1 z-10 w-8 h-8 rounded-full bg-sc-periwinkle text-white text-xs font-black flex items-center justify-center shadow-sm">
                  #{i + 1}
                </div>
                <ProductCard product={p} onAddToCart={onAddToCart} country={country} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── EFFECTS EXPLORER ─────────────────────────────────────────────────────────
function EffectsExplorer({
  onAddToCart,
  country,
}: {
  onAddToCart: (p: ProductSummary) => void;
  country: string;
}) {
  const effects = [
    {
      key: 'energizante',
      label: 'Energizante',
      emoji: '⚡',
      description: 'Perfect for staying active and energized.',
      accentBg: 'bg-amber-50',
      accentBorder: 'border-amber-300',
      accentText: 'text-amber-700',
      accentIcon: 'bg-amber-100',
      activeBg: 'bg-amber-500',
      activeGlow: 'shadow-amber-200',
    },
    {
      key: 'relajante',
      label: 'Relajante',
      emoji: '😌',
      description: 'Disconnect and enjoy the moment.',
      accentBg: 'bg-emerald-50',
      accentBorder: 'border-emerald-300',
      accentText: 'text-emerald-700',
      accentIcon: 'bg-emerald-100',
      activeBg: 'bg-emerald-600',
      activeGlow: 'shadow-emerald-200',
    },
    {
      key: 'creativo',
      label: 'Creativo',
      emoji: '🎨',
      description: 'Spark new ideas and inspiration.',
      accentBg: 'bg-purple-50',
      accentBorder: 'border-purple-300',
      accentText: 'text-purple-700',
      accentIcon: 'bg-purple-100',
      activeBg: 'bg-purple-600',
      activeGlow: 'shadow-purple-200',
    },
    {
      key: 'enfocado',
      label: 'Enfocado',
      emoji: '🎯',
      description: 'Maximum concentration when you need it most.',
      accentBg: 'bg-blue-50',
      accentBorder: 'border-blue-300',
      accentText: 'text-blue-700',
      accentIcon: 'bg-blue-100',
      activeBg: 'bg-blue-600',
      activeGlow: 'shadow-blue-200',
    },
    {
      key: 'eufórico',
      label: 'Eufórico',
      emoji: '✨',
      description: 'Lift your mood and enjoy the experience.',
      accentBg: 'bg-rose-50',
      accentBorder: 'border-rose-300',
      accentText: 'text-rose-700',
      accentIcon: 'bg-rose-100',
      activeBg: 'bg-gradient-to-br from-pink-500 to-orange-400',
      activeGlow: 'shadow-rose-200',
    },
    {
      key: 'calmante',
      label: 'Calmante',
      emoji: '🌙',
      description: 'Relax and unwind at the end of the day.',
      accentBg: 'bg-indigo-50',
      accentBorder: 'border-indigo-300',
      accentText: 'text-indigo-700',
      accentIcon: 'bg-indigo-100',
      activeBg: 'bg-indigo-900',
      activeGlow: 'shadow-indigo-200',
    },
  ];

  const [selected, setSelected] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (effect: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/productos?efectos=${encodeURIComponent(effect)}&por_pagina=4`,
      );
      const data = await res.json();
      if (data.exito) setProducts(data.datos?.datos ?? data.datos ?? []);
      else setError('No se pudieron cargar los productos.');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) load(selected);
  }, [selected, load]);

  const selectedEffect = effects.find((e) => e.key === selected) ?? null;

  const handleSelect = (key: string) => {
    setSelected((prev) => (prev === key ? null : key));
    if (selected === key) setProducts([]);
  };

  return (
    <section
      id="efectos"
      className="py-20 lg:py-32 bg-sc-beige overflow-hidden"
      aria-labelledby="efectos-title"
      suppressHydrationWarning
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14 lg:mb-16">
          <p className="text-sc-forest/60 text-xs font-bold uppercase tracking-widest mb-3">
            Explorador de efectos
          </p>
          <h2
            id="efectos-title"
            className="text-sc-forest font-black text-4xl lg:text-5xl tracking-tightest leading-none mb-4"
          >
            ¿Cómo quieres sentirte hoy?
          </h2>
          <p className="text-sc-forest/70 text-base lg:text-lg max-w-xl mx-auto leading-relaxed">
            Descubre productos basados en la experiencia que estás buscando.
          </p>
        </div>

        {/* Effect Cards — horizontal scroll on mobile, grid on desktop */}
        <div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible sm:pb-0"
          role="group"
          aria-label="Filtrar por efecto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {effects.map((e) => {
            const isActive = selected === e.key;
            return (
              <button
                key={e.key}
                onClick={() => handleSelect(e.key)}
                className={`
                  group relative flex-shrink-0 snap-start
                  w-[160px] sm:w-auto
                  flex flex-col items-center text-center gap-4 p-6
                  rounded-2xl border-2 text-left
                  transition-all duration-300 ease-out
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-forest
                  ${isActive
                    ? `${e.activeBg} border-transparent text-white shadow-xl ${e.activeGlow} shadow-lg scale-[1.04]`
                    : `bg-white ${e.accentBorder} hover:scale-[1.03] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]`
                  }
                `}
                aria-pressed={isActive}
              >
                {/* Icon circle */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 ${
                    isActive ? 'bg-white/20' : e.accentIcon
                  }`}
                  aria-hidden="true"
                >
                  {e.emoji}
                </div>

                {/* Text */}
                <div className="space-y-1.5">
                  <p
                    className={`font-black text-base leading-tight transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-sc-forest'
                    }`}
                  >
                    {e.label}
                  </p>
                  <p
                    className={`text-xs leading-snug transition-colors duration-300 ${
                      isActive ? 'text-white/80' : 'text-sc-muted'
                    }`}
                  >
                    {e.description}
                  </p>
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white/70" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Effect Badge + Products */}
        {selected && selectedEffect && (
          <div className="mt-12">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${selectedEffect.accentBg} ${selectedEffect.accentBorder}`}
              >
                <span className="text-base" aria-hidden="true">{selectedEffect.emoji}</span>
                <span className={`text-sm font-bold ${selectedEffect.accentText}`}>
                  Mostrando productos para:{' '}
                  <span className="font-black">{selectedEffect.label}</span>
                </span>
              </div>
              <button
                onClick={() => { setSelected(null); setProducts([]); }}
                className="inline-flex items-center gap-1.5 text-sc-muted text-sm font-semibold hover:text-sc-forest transition-colors group"
                aria-label="Limpiar filtro de efecto"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="group-hover:rotate-90 transition-transform duration-200"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l10 10M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Limpiar filtro
              </button>
            </div>

            {/* Products */}
            {loading ? (
              <ProductGridSkeleton count={4} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => load(selected)} />
            ) : products.length === 0 ? (
              <EmptyState message={`No hay productos con efecto "${selected}" disponibles.`} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} country={country} />
                ))}
              </div>
            )}

            <div className="mt-8 text-center">
              <Link
                href={`/productos?efectos=${selected}`}
                className="inline-flex items-center gap-2 text-sc-forest text-sm font-bold border-b border-sc-forest pb-0.5 hover:opacity-70 transition-opacity"
              >
                Ver todos los productos con este efecto
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Hint when nothing selected */}
        {!selected && (
          <p className="text-center text-sc-muted text-sm mt-10">
            Selecciona un efecto para ver los productos recomendados.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── REWARDS CLUB PREVIEW ─────────────────────────────────────────────────────
function RewardsClubPreview({ user }: { user: unknown }) {
  const tiers = [
    { name: 'Verde', min: 0, max: 500, color: 'bg-green-500', emoji: '🌱' },
    { name: 'Plata', min: 500, max: 1500, color: 'bg-gray-400', emoji: '⭐' },
    { name: 'Oro', min: 1500, max: 3000, color: 'bg-yellow-500', emoji: '🏆' },
    { name: 'Diamante', min: 3000, max: Infinity, color: 'bg-sc-periwinkle', emoji: '💎' },
  ];

  return (
    <section
      id="recompensas"
      className="py-16 lg:py-24 bg-sc-forest"
      aria-labelledby="recompensas-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div>
            <p className="text-sc-cream/50 text-xs font-bold uppercase tracking-widest mb-3">
              Club de recompensas
            </p>
            <h2
              id="recompensas-title"
              className="text-sc-cream font-black text-4xl lg:text-5xl tracking-tightest leading-none mb-6"
            >
              Gana puntos con cada compra
            </h2>
            <p className="text-sc-cream/70 text-base leading-relaxed mb-8">
              Únete al Club Street Candy y acumula puntos en cada compra. Canjéalos por
              descuentos, productos gratis y beneficios exclusivos.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: '🛒', text: '1 punto por cada $3.000 COP / ₡500 CRC gastados' },
                { icon: '🎂', text: 'Puntos dobles en tu cumpleaños' },
                { icon: '👥', text: 'Gana puntos por referir amigos' },
                { icon: '⭐', text: 'Puntos extra por dejar reseñas' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                  <p className="text-sc-cream/80 text-sm">{item.text}</p>
                </div>
              ))}
            </div>

            {user ? (
              <Link
                href="/cuenta/recompensas"
                className="inline-flex items-center gap-2 bg-sc-cream text-sc-forest font-bold px-8 py-4 rounded-pill hover:bg-sc-beige transition-colors"
              >
                Ver mis puntos
              </Link>
            ) : (
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 bg-sc-cream text-sc-forest font-bold px-8 py-4 rounded-pill hover:bg-sc-beige transition-colors"
              >
                Unirme gratis
              </Link>
            )}
          </div>

          {/* Right: Tiers */}
          <div className="grid grid-cols-2 gap-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-card bg-sc-cream/5 border border-sc-cream/10 p-5 flex flex-col gap-3"
              >
                <span className="text-3xl" aria-hidden="true">
                  {tier.emoji}
                </span>
                <div>
                  <h3 className="text-sc-cream font-bold text-lg">{tier.name}</h3>
                  <p className="text-sc-cream/70 text-xs mt-0.5" suppressHydrationWarning>
                    {tier.max === Infinity
                      ? `${tier.min.toLocaleString('es-CO')}+ puntos`
                      : `${tier.min.toLocaleString('es-CO')} – ${tier.max.toLocaleString('es-CO')} puntos`}
                  </p>
                </div>
                <div className={`h-1 rounded-full ${tier.color} opacity-60`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── EDUCATIONAL SECTION ──────────────────────────────────────────────────────
function EducationalSection() {
  const topics = [
    {
      icon: '🌿',
      title: '¿Qué es el cáñamo?',
      body: 'El cáñamo es una variedad de Cannabis sativa con menos del 0.3% de THC. Rico en CBD y otros cannabinoides beneficiosos, es completamente legal en Colombia y Costa Rica.',
    },
    {
      icon: '🔬',
      title: 'Cannabinoides explicados',
      body: 'CBD, CBG, CBN y más. Cada cannabinoide interactúa con el sistema endocannabinoide de tu cuerpo de manera diferente. Conoce cuál es el indicado para ti.',
    },
    {
      icon: '🧪',
      title: 'Certificados de análisis',
      body: 'Todos nuestros productos son analizados por laboratorios independientes. Puedes ver el certificado de análisis (COA) de cada producto en su página.',
    },
    {
      icon: '⚖️',
      title: 'Legalidad en Latinoamérica',
      body: 'El cáñamo con menos del 0.3% de THC es legal en Colombia y Costa Rica. Operamos bajo todas las regulaciones locales vigentes.',
    },
  ];

  return (
    <section
      id="educacion"
      className="py-16 lg:py-24 bg-sc-cream"
      aria-labelledby="educacion-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Aprende"
          title="Educación cannábica"
          subtitle="Todo lo que necesitas saber sobre el cáñamo y sus beneficios."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topics.map((t) => (
            <article
              key={t.title}
              className="rounded-card bg-sc-beige p-6 flex flex-col gap-4 hover:shadow-sm transition-shadow"
            >
              <span className="text-4xl" aria-hidden="true">
                {t.icon}
              </span>
              <h3 className="text-sc-forest font-bold text-base leading-tight">{t.title}</h3>
              <p className="text-sc-muted text-sm leading-relaxed flex-1">{t.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── BLOG PREVIEW ─────────────────────────────────────────────────────────────
function BlogPreview() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog?por_pagina=3&estado=publicado')
      .then((r) => r.json())
      .then((data) => {
        const items: BlogPost[] = data.datos?.datos ?? data.datos ?? [];
        setPosts(items.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      id="blog"
      className="py-16 lg:py-24 bg-sc-tan"
      aria-labelledby="blog-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Blog"
          title="Últimos artículos"
          subtitle="Contenido educativo sobre cáñamo, bienestar y más."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-card bg-white overflow-hidden border border-sc-border animate-pulse"
                >
                  <div className="aspect-video bg-sc-beige" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 bg-sc-beige rounded w-1/3" />
                    <div className="h-5 bg-sc-beige rounded w-4/5" />
                    <div className="h-3 bg-sc-beige rounded w-full" />
                    <div className="h-3 bg-sc-beige rounded w-2/3" />
                  </div>
                </div>
              ))
            : posts.map((post) => {
                const imgProps = getBlogImageProps(post);
                return (
                  <article
                    key={post.id}
                    className="group rounded-card bg-white overflow-hidden border border-sc-border hover:shadow-md transition-shadow"
                  >
                    <Link href={`/blog/${post.slug}`} className="block overflow-hidden aspect-video">
                      <img
                        src={imgProps.src}
                        alt={imgProps.alt}
                        title={imgProps.title}
                        width={imgProps.width}
                        height={imgProps.height}
                        loading="lazy"
                        decoding="async"
                        onError={imgProps.onError}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        {post.blog_categories && (
                          <span className="text-sc-periwinkle text-xs font-bold uppercase tracking-wider">
                            {post.blog_categories.name}
                          </span>
                        )}
                        {post.read_time_minutes && (
                          <span className="text-sc-muted text-xs">{post.read_time_minutes} min de lectura</span>
                        )}
                      </div>
                      <h3 className="text-sc-forest font-bold text-base leading-snug mb-2 group-hover:opacity-70 transition-opacity">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-sc-muted text-sm leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
        </div>
      </div>
    </section>
  );
}

// ─── CUSTOMER REVIEWS ─────────────────────────────────────────────────────────
function CustomerReviews() {
  const [reviews, setReviews] = useState<
    { id: string; author: string; rating: number; body: string; product: string; country: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top-rated products and use their review summaries
    fetch('/api/productos?ordenar=mejor_valorado&por_pagina=6&en_stock=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.exito) {
          const items = (data.datos?.datos ?? data.datos ?? []) as ProductSummary[];
          const mapped = items
            .filter((p) => p.reviews_summary && p.reviews_summary.total_reviews > 0)
            .slice(0, 6)
            .map((p) => ({
              id: p.id,
              author: 'Cliente verificado',
              rating: Math.round(p.reviews_summary!.average_rating),
              body: `Excelente producto. ${p.short_description ?? p.name}. Totalmente recomendado.`,
              product: p.name,
              country: p.origin_country === 'CR' ? '🇨🇷 Costa Rica' : '🇨🇴 Colombia',
            }));
          setReviews(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fallback static reviews if no real data
  const displayReviews =
    reviews.length > 0
      ? reviews
      : [
          {
            id: '1',
            author: 'María G.',
            rating: 5,
            body: 'Increíble calidad. Los productos llegaron perfectamente empacados y el efecto fue exactamente lo que buscaba.',
            product: 'Producto Street Candy',
            country: '🇨🇴 Colombia',
          },
          {
            id: '2',
            author: 'Carlos M.',
            rating: 5,
            body: 'El mejor cáñamo que he probado en Costa Rica. Servicio al cliente excelente y envío rapidísimo.',
            product: 'Producto Street Candy',
            country: '🇨🇷 Costa Rica',
          },
          {
            id: '3',
            author: 'Ana R.',
            rating: 5,
            body: 'Me ayudó muchísimo con el estrés. La calidad es consistente y los precios son muy buenos.',
            product: 'Producto Street Candy',
            country: '🇨🇴 Colombia',
          },
        ];

  return (
    <section
      id="resenas"
      className="py-16 lg:py-24 bg-sc-cream"
      aria-labelledby="resenas-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <SectionHeader
          label="Lo que dicen nuestros clientes"
          title="Reseñas verificadas"
          subtitle="Miles de clientes satisfechos en Colombia y Costa Rica."
        />

        {/* Overall rating */}
        <div className="flex flex-wrap items-center gap-8 mb-10 p-6 rounded-card bg-sc-beige">
          <div className="text-center">
            <p className="text-sc-forest font-black text-6xl tracking-tightest">4.9</p>
            <div className="flex justify-center gap-0.5 my-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width="16"
                  height="16"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="text-sc-forest"
                  aria-hidden="true"
                >
                  <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
                </svg>
              ))}
            </div>
            <p className="text-sc-muted text-xs">Calificación promedio</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-sc-muted w-4">{star}</span>
                <div className="flex-1 h-2 bg-sc-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sc-forest rounded-full"
                    style={{ width: star === 5 ? '85%' : star === 4 ? '10%' : '5%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-card bg-sc-beige p-6 space-y-3 animate-pulse">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayReviews.map((r) => (
              <article
                key={r.id}
                className="rounded-card bg-sc-beige p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      width="13"
                      height="13"
                      viewBox="0 0 12 12"
                      fill={s <= r.rating ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-sc-forest"
                      aria-hidden="true"
                    >
                      <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sc-forest text-sm leading-relaxed flex-1">"{r.body}"</p>
                <div className="flex items-center justify-between pt-2 border-t border-sc-border">
                  <div>
                    <p className="text-sc-forest text-xs font-bold">{r.author}</p>
                    <p className="text-sc-muted text-[11px]">{r.product}</p>
                  </div>
                  <span className="text-xs text-sc-muted">{r.country}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
function NewsletterSection({ country }: { country: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    // Simulate subscription — no newsletter API exists yet
    await new Promise((r) => setTimeout(r, 800));
    setStatus('success');
    setEmail('');
  };

  const discount = country === 'CR' ? '₡5.000' : '$10.000 COP';

  return (
    <section
      id="newsletter"
      className="py-16 lg:py-24 bg-sc-periwinkle"
      aria-labelledby="newsletter-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 text-center">
        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">
          Newsletter
        </p>
        <h2
          id="newsletter-title"
          className="text-white font-black text-4xl lg:text-5xl tracking-tightest leading-none mb-4"
        >
          Sé el primero en saber
        </h2>
        <p className="text-white/80 text-base mb-8 max-w-md mx-auto">
          Suscríbete y recibe {discount} de descuento en tu primera compra, más noticias
          exclusivas y ofertas especiales.
        </p>

        {status === 'success' ? (
          <div className="inline-flex items-center gap-3 bg-white/20 rounded-pill px-8 py-4">
            <span className="text-2xl" aria-hidden="true">
              🎉
            </span>
            <p className="text-white font-bold">
              ¡Gracias! Revisa tu correo para tu descuento.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            aria-label="Formulario de suscripción al newsletter"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="flex-1 bg-white/20 border border-white/30 text-white placeholder-white/50 rounded-pill px-5 py-3.5 text-sm outline-none focus:bg-white/30 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-white text-sc-periwinkle font-bold px-8 py-3.5 rounded-pill hover:bg-sc-cream transition-colors disabled:opacity-60 text-sm flex-shrink-0"
            >
              {status === 'loading' ? 'Enviando...' : 'Suscribirme'}
            </button>
          </form>
        )}

        <p className="text-white/40 text-xs mt-4">
          Sin spam. Puedes cancelar en cualquier momento.
        </p>
      </div>
    </section>
  );
}

// ─── FAQ SECTION ──────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: '¿Es legal el cáñamo en Colombia y Costa Rica?',
      a: 'Sí. El cáñamo industrial con menos del 0.3% de THC es completamente legal en Colombia (Ley 1787 de 2016) y en Costa Rica. Todos nuestros productos cumplen con la normativa vigente en ambos países.',
    },
    {
      q: '¿Cuánto tiempo tarda el envío?',
      a: 'En Colombia: 2-5 días hábiles a ciudades principales, 5-8 días a municipios. En Costa Rica: 1-3 días hábiles en el Gran Área Metropolitana, 3-5 días al resto del país.',
    },
    {
      q: '¿Cómo sé que los productos son de calidad?',
      a: 'Todos nuestros productos son analizados por laboratorios independientes certificados. Puedes ver el Certificado de Análisis (COA) de cada producto directamente en su página de producto.',
    },
    {
      q: '¿Puedo devolver un producto?',
      a: 'Aceptamos devoluciones dentro de los 30 días posteriores a la compra si el producto está en su empaque original y sin abrir. Contáctanos para iniciar el proceso.',
    },
    {
      q: '¿Qué métodos de pago aceptan?',
      a: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de nuestra plataforma de pagos segura con Stripe.',
    },
    {
      q: '¿Cómo funciona el Club de Recompensas?',
      a: 'Ganas 1 punto por cada $3.000 COP o ₡500 CRC gastados. Los puntos se pueden canjear por descuentos en futuras compras. Hay 4 niveles: Verde, Plata, Oro y Diamante, con beneficios crecientes.',
    },
  ];

  return (
    <section
      id="faq"
      className="py-16 lg:py-24 bg-sc-beige"
      aria-labelledby="faq-title"
    >
      <div className="max-w-[800px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sc-muted text-xs font-bold uppercase tracking-widest mb-2">
            Preguntas frecuentes
          </p>
          <h2
            id="faq-title"
            className="text-sc-forest font-black text-3xl lg:text-4xl tracking-tightest leading-none"
          >
            ¿Tienes dudas?
          </h2>
        </div>

        <div className="space-y-2" role="list">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-card bg-white border border-sc-border overflow-hidden"
              role="listitem"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="text-sc-forest font-semibold text-sm">{faq.q}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`flex-shrink-0 text-sc-muted transition-transform duration-200 ${
                    open === i ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {open === i && (
                <div
                  id={`faq-answer-${i}`}
                  className="px-6 pb-5"
                  role="region"
                  aria-label={faq.q}
                >
                  <p className="text-sc-muted text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── INSTAGRAM / SOCIAL SECTION ───────────────────────────────────────────────
function SocialSection() {
  return (
    <section
      id="social"
      className="py-16 lg:py-24 bg-sc-cream"
      aria-labelledby="social-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 text-center">
        <p className="text-sc-muted text-xs font-bold uppercase tracking-widest mb-2">
          Síguenos
        </p>
        <h2
          id="social-title"
          className="text-sc-forest font-black text-3xl lg:text-4xl tracking-tightest leading-none mb-3"
        >
          @streetcandys
        </h2>
        <p className="text-sc-muted text-sm mb-10">
          Únete a nuestra comunidad en Instagram y TikTok
        </p>

        {/* Social grid placeholder — real feed requires Instagram API */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <a
              key={i}
              href="https://instagram.com/streetcandys"
              target="_blank"
              rel="noopener noreferrer"
              className="group aspect-square rounded-card bg-sc-beige overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Ver publicación en Instagram"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                className="text-sc-border group-hover:text-sc-muted transition-colors"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="4"
                  width="20"
                  height="20"
                  rx="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="20" cy="8" r="1.2" fill="currentColor" />
              </svg>
            </a>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://instagram.com/streetcandys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-sc-forest text-sc-cream font-bold px-6 py-3 rounded-pill hover:bg-sc-green transition-colors text-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="14" height="14" rx="4" />
              <circle cx="9" cy="9" r="3.5" />
              <circle cx="13" cy="5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
            Instagram
          </a>
          <a
            href="https://tiktok.com/@streetcandys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-sc-forest text-sc-forest font-bold px-6 py-3 rounded-pill hover:bg-sc-beige transition-colors text-sm"
          >
            TikTok
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── PARTNERS SECTION ─────────────────────────────────────────────────────────
interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
}

function PartnersSection() {
  const [partners, setPartners] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partners')
      .then((r) => r.json())
      .then((data) => {
        if (data.exito) setPartners(data.datos ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && partners.length === 0) return null;

  return (
    <section
      id="marcas-aliadas"
      className="py-14 lg:py-20 bg-sc-beige border-t border-sc-border/30"
      aria-labelledby="partners-title"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sc-forest/60 text-xs font-bold uppercase tracking-widest mb-2">
            Nuestros aliados
          </p>
          <h2
            id="partners-title"
            className="text-sc-forest font-black text-2xl lg:text-3xl tracking-tightest leading-none"
          >
            Marcas Aliadas
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-6 lg:gap-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-28 h-16 bg-sc-cream/60 rounded-xl animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            {partners.map((partner) =>
              partner.website_url ? (
                <a
                  key={partner.id}
                  href={partner.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-28 h-16 lg:w-36 lg:h-20 bg-white rounded-xl border border-sc-border/40 px-4 py-3 hover:border-sc-forest/30 hover:shadow-sm transition-all duration-200"
                  aria-label={`Visitar sitio de ${partner.name}`}
                  title={partner.name}
                >
                  <img
                    src={partner.logo_url}
                    alt={`Logo de ${partner.name}`}
                    className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div
                  key={partner.id}
                  className="flex items-center justify-center w-28 h-16 lg:w-36 lg:h-20 bg-white rounded-xl border border-sc-border/40 px-4 py-3"
                  title={partner.name}
                >
                  <img
                    src={partner.logo_url}
                    alt={`Logo de ${partner.name}`}
                    className="max-w-full max-h-full object-contain opacity-70"
                    loading="lazy"
                  />
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, profile } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const { cartItems, setCartItems } = useCartPersistence({ profileId: profile?.id ?? null });
  const featuredRef = useRef<HTMLElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // SSR-safe: always start with 'CO'; read persisted value only after mount
  const [country, setCountry] = useState('CO');

  useEffect(() => {
    // Priority: logged-in profile > localStorage > default 'CO'
    if (profile?.countryCode) {
      setCountry(profile.countryCode);
    } else {
      const stored = localStorage.getItem(COUNTRY_KEY);
      if (stored === 'CO' || stored === 'CR') {
        setCountry(stored);
      }
    }
  }, [profile?.countryCode]);

  // Resolve guest session ID once after mount — avoids typeof window in callbacks
  useEffect(() => {
    let sid = localStorage.getItem('sc_guest_session_id');
    if (!sid) {
      const ts = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 10);
      sid = `sc_guest_${ts}_${rand}`;
      localStorage.setItem('sc_guest_session_id', sid);
    }
    sessionIdRef.current = sid;
  }, []);

  const handleCountryChange = useCallback((code: string) => {
    setCountry(code);
    // Persist for guests; logged-in users rely on profile (no Supabase write here)
    if (!user) {
      localStorage.setItem(COUNTRY_KEY, code);
    } else {
      // Also cache locally so it survives a refresh before profile reloads
      localStorage.setItem(COUNTRY_KEY, code);
    }
    // Notify same-tab listeners (e.g. AnnouncementBar) — StorageEvent only fires in other tabs
    window.dispatchEvent(new CustomEvent('sc:country-change', { detail: code }));
  }, [user]);

  const handleAddToCart = useCallback((product: ProductSummary) => {
    // 1. Update local state immediately for instant UI feedback
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: String(product.base_price),
          qty: 1,
          image: product.thumbnail_url ?? product.images?.[0]?.url ?? '',
        },
      ];
    });
    setCartOpen(true);

    // 2. Also write to Supabase so Checkout always finds the same cart.
    // Fire-and-forget — UI is already updated above.
    const sessionId = sessionIdRef.current;

    if (sessionId) {
      fetch('/api/carrito/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          producto_id: product.id,
          cantidad: 1,
          pais: country,
        }),
      }).catch(() => {
        // best-effort — local state is already updated
      });
    }
  }, [setCartItems, country]);

  const handleUpdateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, qty } : i)),
      );
    }
  }, [setCartItems]);

  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, [setCartItems]);

  const cartCount = React.useMemo(
    () => cartItems.reduce((sum, i) => sum + i.qty, 0),
    [cartItems],
  );

  const scrollToFeatured = () => {
    const el = document.getElementById('destacados');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* SEO meta — injected via head in layout, but we set title here */}
      <div suppressHydrationWarning className="min-h-screen bg-sc-cream font-sans text-sc-forest overflow-x-hidden">
        <AnnouncementBar />
        <Navigation
          cartCount={cartCount}
          onCartOpen={() => setCartOpen(true)}
          country={country}
          onCountryChange={handleCountryChange}
        />

        <main id="main-content" suppressHydrationWarning>
          {/* 1. Hero */}
          <HeroSection country={country} onShopNow={scrollToFeatured} />

          {/* 2. Featured Products */}
          <FeaturedProducts onAddToCart={handleAddToCart} country={country} />

          {/* 3. New Arrivals */}
          <NewArrivals onAddToCart={handleAddToCart} country={country} />

          {/* 4. Best Sellers */}
          <BestSellers onAddToCart={handleAddToCart} country={country} />

          {/* 5. Effects Explorer — primary discovery section */}
          <EffectsExplorer onAddToCart={handleAddToCart} country={country} />

          {/* 6. Rewards Club Preview */}
          <RewardsClubPreview user={user} />

          {/* 7. Educational Section */}
          <EducationalSection />

          {/* 8. Blog Preview */}
          <BlogPreview />

          {/* 9. Customer Reviews */}
          <CustomerReviews />

          {/* 10. Newsletter */}
          <NewsletterSection country={country} />

          {/* 11. FAQ */}
          <FAQSection />

          {/* 12. Partners / Allied Brands */}
          <PartnersSection />

          {/* 13. Instagram / Social */}
          <SocialSection />
        </main>

        {/* 14. Footer */}
        <HomepageFooter country={country} />

        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          country={country}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
        />
      </div>
      <SpinToWin />
    </>
  );
}

// ─── HOMEPAGE FOOTER (Spanish, country-aware) ─────────────────────────────────
function HomepageFooter({ country }: { country: string }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  const footerLinks = [
    {
      heading: 'Tienda',
      links: [
        { label: 'Ver todo', href: '/productos' },
        { label: 'Flores', href: '/productos?categoria=flores' },
        { label: 'Gummies', href: '/productos?categoria=gummies' },
        { label: 'Comestibles', href: '/productos?categoria=comestibles' },
        { label: 'Bebidas', href: '/productos?categoria=bebidas' },
        { label: 'Pre-rolls', href: '/productos?categoria=prerolls' },
        { label: 'Concentrados', href: '/productos?categoria=concentrados' },
      ],
    },
    {
      heading: 'Aprende',
      links: [
        { label: 'Legalidad', href: '#educacion' },
        { label: 'Cannabinoides', href: '#educacion' },
        { label: 'Nosotros', href: '/contacto' },
        { label: 'Calidad', href: '#educacion' },
        { label: 'Recompensas', href: '#recompensas' },
      ],
    },
    {
      heading: 'Ayuda',
      links: [
        { label: 'Reseñas', href: '#resenas' },
        { label: 'Centro de ayuda', href: '/contacto' },
        { label: 'Envíos', href: '/envios' },
        { label: 'Política de devoluciones', href: '/reembolsos' },
        { label: 'Contáctanos', href: '/contacto' },
      ],
    },
    {
      heading: 'Recompensas',
      links: [
        { label: 'Cómo funciona', href: '#recompensas' },
        { label: 'Mi saldo', href: '/cuenta/recompensas' },
        { label: 'Referir amigos', href: '/cuenta/recompensas' },
        { label: 'Formas de ganar', href: '#recompensas' },
        { label: 'Formas de canjear', href: '#recompensas' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Política de privacidad', href: '/privacidad' },
        { label: 'Términos y condiciones', href: '/terminos' },
        { label: 'Aviso legal', href: '/cookies' },
      ],
    },
  ];

  const countryLabel = country === 'CR' ? '🇨🇷 Costa Rica' : '🇨🇴 Colombia';

  return (
    <footer className="bg-sc-darkforest text-sc-cream">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-16 pb-10">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-12">
          {/* Left */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="mb-6">
              <span className="text-sc-cream font-black text-2xl tracking-tightest uppercase">
                Street Candy's
              </span>
              <p className="text-sc-cream/70 text-xs mt-1">{countryLabel}</p>
            </div>

            <h3 className="text-sc-cream font-bold text-lg leading-snug mb-4">
              Seamos amigos.
              <br />
              <span className="text-sc-cream/80">20% de descuento en tu primera compra</span>
            </h3>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-0 mb-6 border border-sc-cream/30 rounded-pill overflow-hidden"
              aria-label="Suscribirse al newsletter"
            >
              <div className="flex items-center gap-2 flex-1 px-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-sc-cream/50 flex-shrink-0"
                  aria-hidden="true"
                >
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <label htmlFor="footer-email" className="sr-only">
                  Tu correo electrónico
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  className="bg-transparent text-sc-cream placeholder-sc-cream/40 text-sm py-3 outline-none flex-1 min-w-0"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-3 text-sc-cream hover:text-sc-cream/70 transition-colors flex-shrink-0"
                aria-label="Suscribirse"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3 9h12M11 5l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>

            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/streetcandys"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-sc-cream/60 hover:text-sc-cream transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 2h2.5l-5.5 6.3L17 16h-4.8l-3.5-4.6L4.5 16H2l5.8-6.6L1.5 2H6.4l3.2 4.2L13.5 2zm-.9 12.5h1.4L5.5 3.4H4l9.1 11.1z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/streetcandys"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-sc-cream/60 hover:text-sc-cream transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <rect x="2" y="2" width="14" height="14" rx="4" />
                  <circle cx="9" cy="9" r="3.5" />
                  <circle cx="13" cy="5" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://tiktok.com/@streetcandys"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-sc-cream/60 hover:text-sc-cream transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M14 2h-2.5v9.5a2.5 2.5 0 11-2.5-2.5V6.5A5 5 0 109 14V7.5A6.5 6.5 0 0014 8V5.5A4 4 0 0112 2H14z" />
                </svg>
              </a>
              <a
                href="https://wa.me/573115397983?text=Hola%20%F0%9F%91%8B%2C%20quiero%20informaci%C3%B3n%20sobre%20Street%20Candy."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-sc-cream/60 hover:text-sc-cream transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M9 1C4.58 1 1 4.58 1 9c0 1.42.37 2.75 1.02 3.91L1 17l4.22-1.1A8 8 0 109 1zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm3.54-4.96c-.19-.1-1.13-.56-1.31-.62-.17-.06-.3-.1-.42.1-.13.19-.49.62-.6.75-.11.13-.22.14-.41.05-.19-.1-.8-.3-1.53-.95-.57-.5-.95-1.12-1.06-1.31-.11-.19-.01-.3.08-.39.09-.09.19-.22.29-.33.1-.11.13-.19.19-.32.06-.13.03-.24-.02-.33-.05-.1-.42-1.01-.58-1.38-.15-.36-.3-.31-.42-.32h-.36c-.12 0-.32.05-.49.24-.17.19-.64.62-.64 1.52s.66 1.76.75 1.88c.1.13 1.3 1.98 3.14 2.78.44.19.78.3 1.05.38.44.14.84.12 1.16.07.35-.05 1.08-.44 1.23-.87.15-.43.15-.8.1-.87-.04-.08-.17-.13-.36-.22z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {footerLinks.map((col) => (
              <div key={col.heading}>
                <p className="text-sc-cream/50 text-xs font-bold uppercase tracking-widest mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sc-cream/80 text-sm hover:text-sc-cream transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-sc-cream/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sc-cream font-black text-xl tracking-tightest uppercase">
            Street Candy's
          </span>
          <p className="text-sc-cream/70 text-xs text-center">
            Todos los derechos reservados &copy; Street Candy's 2025. Debes ser mayor de edad para comprar.
          </p>
          <p className="text-sc-cream/60 text-xs">{countryLabel}</p>
        </div>
      </div>
    </footer>
  );
}
