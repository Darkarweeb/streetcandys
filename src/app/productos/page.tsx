'use client';
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

import AnnouncementBar from '@/components/AnnouncementBar';
import Navigation from '@/components/Navigation';
import Breadcrumbs from '@/components/catalog/Breadcrumbs';
import CatalogProductCard from '@/components/catalog/CatalogProductCard';
import { ProductGridSkeleton } from '@/components/catalog/ProductCardSkeleton';
import { EmptyState, ErrorState } from '@/components/catalog/CatalogStates';
import type { ProductSummary, ProductSortField } from '@/lib/products/types';
import { formatPrice, type Country } from '@/lib/price';

const COUNTRY_KEY = 'sc_country';

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="bg-sc-darkforest h-64 animate-pulse" aria-hidden="true" />,
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
});

interface PaginationInfo {
  pagina_actual: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
  tiene_siguiente: boolean;
  tiene_anterior: boolean;
}

interface ApiResult {
  exito: boolean;
  datos?: {
    datos: ProductSummary[];
    paginacion: PaginationInfo;
  };
  error?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

const EFECTOS_COMUNES = [
  'Relajante', 'Energizante', 'Creativo', 'Enfocado', 'Eufórico',
  'Sedante', 'Analgésico', 'Ansiolítico', 'Estimulante', 'Calmante',
];

const OPCIONES_ORDEN: { value: ProductSortField; label: string }[] = [
  { value: 'nombre', label: 'Nombre A-Z' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'mas_nuevo', label: 'Más nuevos' },
  { value: 'mas_vendido', label: 'Más vendidos' },
  { value: 'mejor_valorado', label: 'Mejor valorados' },
  { value: 'destacado', label: 'Destacados' },
];

function ProductosPageInner() {
  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{ id: string; name: string; price: string; qty: number; image: string }[]>([]);

  // Country state — SSR-safe: default CO, resolve after mount
  const [country, setCountry] = useState<Country>('CO');

  // Products state
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL params
  const searchParams = useSearchParams();

  // Filters state — seed from URL on first render
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('busqueda') ?? '');
  const [searchInput, setSearchInput] = useState(() => searchParams?.get('busqueda') ?? '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams?.get('categoria') ?? '');
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [intensityMin, setIntensityMin] = useState(1);
  const [intensityMax, setIntensityMax] = useState(5);
  const [sortBy, setSortBy] = useState<ProductSortField>('nombre');
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Categories
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read country from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(COUNTRY_KEY);
    if (stored === 'CR' || stored === 'CO') setCountry(stored as Country);
    const handler = (e: StorageEvent) => {
      if (e.key === COUNTRY_KEY && (e.newValue === 'CR' || e.newValue === 'CO')) {
        setCountry(e.newValue as Country);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Load categories
  useEffect(() => {
    fetch('/api/categorias')
      .then((r) => r.json())
      .then((data) => {
        if (data.exito && Array.isArray(data.datos)) {
          setCategories(data.datos);
        }
      })
      .catch(() => {});
  }, []);

  // Build query string — pass country so API can filter by price_crc availability
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('busqueda', searchQuery);
    if (selectedCategory) params.set('categoria', selectedCategory);
    if (selectedEffects.length > 0) params.set('efectos', selectedEffects.join(','));
    if (priceMin) params.set('precio_min', priceMin);
    if (priceMax) params.set('precio_max', priceMax);
    if (intensityMin > 1) params.set('intensidad_min', String(intensityMin));
    if (intensityMax < 5) params.set('intensidad_max', String(intensityMax));
    params.set('ordenar', sortBy);
    params.set('pagina', String(currentPage));
    params.set('por_pagina', '12');
    params.set('pais', country);
    return params.toString();
  }, [searchQuery, selectedCategory, selectedEffects, priceMin, priceMax, intensityMin, intensityMax, sortBy, currentPage, country]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery();
      const res = await fetch(`/api/productos?${query}`);
      const data: ApiResult = await res.json();
      if (data.exito && data.datos) {
        setProducts(data.datos.datos);
        setPagination(data.datos.paginacion);
      } else {
        setError(data.error || 'Error al cargar productos');
        setProducts([]);
      }
    } catch {
      setError('No se pudo conectar con el servidor');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 400);
  };

  const handleEffectToggle = (effect: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
    setCurrentPage(1);
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
  };

  const handleSortChange = (value: ProductSortField) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setSelectedCategory('');
    setSelectedEffects([]);
    setPriceMin('');
    setPriceMax('');
    setIntensityMin(1);
    setIntensityMax(5);
    setSortBy('nombre');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery || selectedCategory || selectedEffects.length > 0 ||
    priceMin || priceMax || intensityMin > 1 || intensityMax < 5;

  const handleAddToCart = (product: ProductSummary) => {
    const priceStr = formatPrice(product, country) ?? '';
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        id: product.id,
        name: product.name,
        price: priceStr,
        qty: 1,
        image: product.thumbnail_url || product.images?.[0]?.url || '',
      }];
    });
    setCartOpen(true);
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-sc-cream font-sans text-sc-forest overflow-x-hidden">
      <AnnouncementBar />
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <main id="main-content">
        {/* Header */}
        <section className="bg-sc-beige border-b border-sc-border">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Productos' }]} />
            <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-sc-forest tracking-tightest">
                  Catálogo de Productos
                </h1>
                {pagination && !loading && (
                  <p className="text-sc-muted text-sm mt-1">
                    {pagination.total} {pagination.total === 1 ? 'producto' : 'productos'}
                    {searchQuery && ` para "${searchQuery}"`}
                  </p>
                )}
              </div>

              {/* Sort — desktop */}
              <div className="hidden sm:flex items-center gap-2">
                <label htmlFor="sort-select" className="text-sm text-sc-muted whitespace-nowrap">
                  Ordenar por:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as ProductSortField)}
                  className="border border-sc-border rounded-sm2 px-3 py-2 text-sm text-sc-forest bg-white focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
                >
                  {OPCIONES_ORDEN.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
          {/* Search bar */}
          <div className="mb-6">
            <div className="relative max-w-xl">
              <svg
                width="18" height="18" viewBox="0 0 20 20" fill="none"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sc-muted pointer-events-none"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-11 pr-4 py-3 border border-sc-border rounded-pill text-sm text-sc-forest bg-white focus:outline-none focus:ring-2 focus:ring-sc-forest/20 placeholder-sc-muted"
                aria-label="Buscar productos"
                inputMode="search"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters — desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0" aria-label="Filtros">
              <div className="sticky top-24 space-y-6">
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1.5 text-sm text-sc-periwinkle font-medium hover:underline"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Limpiar filtros
                  </button>
                )}

                {categories.length > 0 && (
                  <FilterSection title="Categoría">
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleCategoryChange('')}
                        className={`w-full text-left text-sm px-3 py-2 rounded-sm2 transition-colors ${
                          !selectedCategory ? 'bg-sc-forest text-sc-cream font-medium' : 'text-sc-forest hover:bg-sc-beige'
                        }`}
                      >
                        Todas las categorías
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryChange(cat.slug)}
                          className={`w-full text-left text-sm px-3 py-2 rounded-sm2 transition-colors ${
                            selectedCategory === cat.slug ? 'bg-sc-forest text-sc-cream font-medium' : 'text-sc-forest hover:bg-sc-beige'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                )}

                <FilterSection title="Precio">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => { setPriceMin(e.target.value); setCurrentPage(1); }}
                      placeholder="Mín"
                      min="0"
                      className="w-full border border-sc-border rounded-sm2 px-3 py-2 text-sm text-sc-forest focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
                      aria-label="Precio mínimo"
                    />
                    <span className="text-sc-muted text-sm flex-shrink-0">—</span>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => { setPriceMax(e.target.value); setCurrentPage(1); }}
                      placeholder="Máx"
                      min="0"
                      className="w-full border border-sc-border rounded-sm2 px-3 py-2 text-sm text-sc-forest focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
                      aria-label="Precio máximo"
                    />
                  </div>
                </FilterSection>

                <FilterSection title="Intensidad">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-sc-muted mb-1 block">Mínima: {intensityMin}</label>
                      <input type="range" min={1} max={5} value={intensityMin}
                        onChange={(e) => { setIntensityMin(Number(e.target.value)); setCurrentPage(1); }}
                        className="w-full accent-sc-forest" aria-label="Intensidad mínima"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sc-muted mb-1 block">Máxima: {intensityMax}</label>
                      <input type="range" min={1} max={5} value={intensityMax}
                        onChange={(e) => { setIntensityMax(Number(e.target.value)); setCurrentPage(1); }}
                        className="w-full accent-sc-forest" aria-label="Intensidad máxima"
                      />
                    </div>
                  </div>
                </FilterSection>

                <FilterSection title="Efectos">
                  <div className="flex flex-wrap gap-2">
                    {EFECTOS_COMUNES.map((efecto) => (
                      <button
                        key={efecto}
                        onClick={() => handleEffectToggle(efecto.toLowerCase())}
                        className={`text-xs px-3 py-1.5 rounded-badge border transition-all duration-150 ${
                          selectedEffects.includes(efecto.toLowerCase())
                            ? 'bg-sc-forest text-sc-cream border-sc-forest font-medium'
                            : 'border-sc-border text-sc-forest hover:border-sc-forest'
                        }`}
                        aria-pressed={selectedEffects.includes(efecto.toLowerCase())}
                      >
                        {efecto}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Mobile: filter + sort bar */}
              <div className="lg:hidden flex items-center gap-3 mb-4">
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="flex items-center gap-2 border border-sc-border rounded-pill px-4 py-2.5 text-sm text-sc-forest font-medium hover:bg-sc-beige transition-colors min-h-[44px]"
                  aria-expanded={filtersOpen}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Filtros
                  {hasActiveFilters && (
                    <span className="bg-sc-forest text-sc-cream text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">!</span>
                  )}
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as ProductSortField)}
                  className="flex-1 min-w-0 border border-sc-border rounded-pill px-4 py-2.5 text-sm text-sc-forest bg-white focus:outline-none min-h-[44px]"
                  aria-label="Ordenar productos"
                >
                  {OPCIONES_ORDEN.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Products */}
              {loading ? (
                <ProductGridSkeleton count={12} />
              ) : error ? (
                <ErrorState onRetry={fetchProducts} description={error} />
              ) : products.length === 0 ? (
                <EmptyState
                  title={
                    selectedCategory && !searchQuery && selectedEffects.length === 0 && !priceMin && !priceMax
                      ? 'Próximamente' :'Sin resultados'
                  }
                  description={
                    selectedCategory && !searchQuery && selectedEffects.length === 0 && !priceMin && !priceMax
                      ? 'Estamos trabajando para traerte productos en esta categoría. ¡Vuelve pronto!'
                      : hasActiveFilters
                      ? 'No encontramos productos con los filtros seleccionados.'
                      : 'No hay productos disponibles en este momento.'
                  }
                  action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: handleClearFilters } : undefined}
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6 animate-fade-in">
                    {products.map((product) => (
                      <CatalogProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        country={country}
                      />
                    ))}
                  </div>

                  {pagination && pagination.total_paginas > 1 && (
                    <Pagination
                      pagination={pagination}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {filtersOpen && (
        <MobileFiltersDrawer
          categories={categories}
          selectedCategory={selectedCategory}
          selectedEffects={selectedEffects}
          priceMin={priceMin}
          priceMax={priceMax}
          intensityMin={intensityMin}
          intensityMax={intensityMax}
          onCategoryChange={handleCategoryChange}
          onEffectToggle={handleEffectToggle}
          onPriceMinChange={(v) => { setPriceMin(v); setCurrentPage(1); }}
          onPriceMaxChange={(v) => { setPriceMax(v); setCurrentPage(1); }}
          onIntensityMinChange={(v) => { setIntensityMin(v); setCurrentPage(1); }}
          onIntensityMaxChange={(v) => { setIntensityMax(v); setCurrentPage(1); }}
          onClear={handleClearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        country={country}
        onUpdateQty={(id, qty) => {
          if (qty === 0) {
            setCartItems((prev) => prev.filter((i) => String(i.id) !== String(id)));
          } else {
            setCartItems((prev) => prev.map((i) => String(i.id) === String(id) ? { ...i, qty } : i));
          }
        }}
      />
    </div>
  );
}

// ─── Page export with Suspense boundary ───────────────────────────────────────

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sc-cream" />}>
      <ProductosPageInner />
    </Suspense>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-sc-border pb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sc-forest font-semibold text-sm">{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-sc-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { pagina_actual, total_paginas } = pagination;
  const pages: (number | '...')[] = [];
  if (total_paginas <= 7) {
    for (let i = 1; i <= total_paginas; i++) pages.push(i);
  } else {
    pages.push(1);
    if (pagina_actual > 3) pages.push('...');
    for (let i = Math.max(2, pagina_actual - 1); i <= Math.min(total_paginas - 1, pagina_actual + 1); i++) pages.push(i);
    if (pagina_actual < total_paginas - 2) pages.push('...');
    pages.push(total_paginas);
  }
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Paginación">
      <button onClick={() => onPageChange(pagina_actual - 1)} disabled={!pagination.tiene_anterior}
        className="p-2 rounded-sm2 border border-sc-border text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Página anterior">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`e-${i}`} className="px-2 text-sc-muted text-sm">…</span>
        ) : (
          <button key={page} onClick={() => onPageChange(page as number)}
            className={`w-9 h-9 rounded-sm2 text-sm font-medium transition-colors ${page === pagina_actual ? 'bg-sc-forest text-sc-cream' : 'border border-sc-border text-sc-forest hover:bg-sc-beige'}`}
            aria-label={`Página ${page}`} aria-current={page === pagina_actual ? 'page' : undefined}>
            {page}
          </button>
        )
      )}
      <button onClick={() => onPageChange(pagina_actual + 1)} disabled={!pagination.tiene_siguiente}
        className="p-2 rounded-sm2 border border-sc-border text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Página siguiente">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </nav>
  );
}

interface MobileFiltersDrawerProps {
  categories: CategoryOption[];
  selectedCategory: string;
  selectedEffects: string[];
  priceMin: string;
  priceMax: string;
  intensityMin: number;
  intensityMax: number;
  onCategoryChange: (slug: string) => void;
  onEffectToggle: (effect: string) => void;
  onPriceMinChange: (v: string) => void;
  onPriceMaxChange: (v: string) => void;
  onIntensityMinChange: (v: number) => void;
  onIntensityMaxChange: (v: number) => void;
  onClear: () => void;
  onClose: () => void;
}

function MobileFiltersDrawer({
  categories, selectedCategory, selectedEffects,
  priceMin, priceMax, intensityMin, intensityMax,
  onCategoryChange, onEffectToggle,
  onPriceMinChange, onPriceMaxChange,
  onIntensityMinChange, onIntensityMaxChange,
  onClear, onClose,
}: MobileFiltersDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Filtros">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative ml-auto w-full max-w-sm bg-sc-cream h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sc-border sticky top-0 bg-sc-cream z-10">
          <h2 className="text-sc-forest font-bold text-lg">Filtros</h2>
          <div className="flex items-center gap-3">
            <button onClick={onClear} className="text-sm text-sc-periwinkle font-medium hover:underline">Limpiar</button>
            <button onClick={onClose} className="p-1 text-sc-forest" aria-label="Cerrar filtros">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 px-5 py-4 space-y-6">
          {categories.length > 0 && (
            <div>
              <p className="text-sc-forest font-semibold text-sm mb-3">Categoría</p>
              <div className="space-y-1.5">
                <button onClick={() => onCategoryChange('')}
                  className={`w-full text-left text-sm px-3 py-2 rounded-sm2 transition-colors ${!selectedCategory ? 'bg-sc-forest text-sc-cream font-medium' : 'text-sc-forest hover:bg-sc-beige'}`}>
                  Todas
                </button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => onCategoryChange(cat.slug)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-sm2 transition-colors ${selectedCategory === cat.slug ? 'bg-sc-forest text-sc-cream font-medium' : 'text-sc-forest hover:bg-sc-beige'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-sc-forest font-semibold text-sm mb-3">Precio</p>
            <div className="flex gap-2 items-center">
              <input type="number" value={priceMin} onChange={(e) => onPriceMinChange(e.target.value)} placeholder="Mín" min="0"
                className="w-full border border-sc-border rounded-sm2 px-3 py-2 text-sm text-sc-forest focus:outline-none" aria-label="Precio mínimo" />
              <span className="text-sc-muted text-sm">—</span>
              <input type="number" value={priceMax} onChange={(e) => onPriceMaxChange(e.target.value)} placeholder="Máx" min="0"
                className="w-full border border-sc-border rounded-sm2 px-3 py-2 text-sm text-sc-forest focus:outline-none" aria-label="Precio máximo" />
            </div>
          </div>
          <div>
            <p className="text-sc-forest font-semibold text-sm mb-3">Intensidad</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-sc-muted mb-1 block">Mínima: {intensityMin}</label>
                <input type="range" min={1} max={5} value={intensityMin} onChange={(e) => onIntensityMinChange(Number(e.target.value))} className="w-full accent-sc-forest" aria-label="Intensidad mínima" />
              </div>
              <div>
                <label className="text-xs text-sc-muted mb-1 block">Máxima: {intensityMax}</label>
                <input type="range" min={1} max={5} value={intensityMax} onChange={(e) => onIntensityMaxChange(Number(e.target.value))} className="w-full accent-sc-forest" aria-label="Intensidad máxima" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sc-forest font-semibold text-sm mb-3">Efectos</p>
            <div className="flex flex-wrap gap-2">
              {EFECTOS_COMUNES.map((efecto) => (
                <button key={efecto} onClick={() => onEffectToggle(efecto.toLowerCase())}
                  className={`text-xs px-3 py-1.5 rounded-badge border transition-all ${selectedEffects.includes(efecto.toLowerCase()) ? 'bg-sc-forest text-sc-cream border-sc-forest font-medium' : 'border-sc-border text-sc-forest hover:border-sc-forest'}`}
                  aria-pressed={selectedEffects.includes(efecto.toLowerCase())}>
                  {efecto}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-sc-border sticky bottom-0 bg-sc-cream">
          <button onClick={onClose} className="w-full bg-sc-forest text-sc-cream font-bold py-3 rounded-pill hover:bg-sc-green transition-colors">
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}
