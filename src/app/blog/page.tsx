'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navigation from '@/components/Navigation';
import { getBlogImageProps } from '@/lib/blog/blog-image-utils';

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="bg-sc-darkforest h-64 animate-pulse" aria-hidden="true" />,
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
});

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────
interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: string;
  is_featured: boolean;
  view_count: number;
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  blog_category_id: string | null;
  blog_categories?: { name: string; slug: string } | null;
  profiles?: { full_name: string } | null;
}

const PAGE_SIZE = 9;

// ─── Safe Date Formatter ──────────────────────────────────────
function safeFormatDate(dateStr: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', options);
  } catch {
    try {
      return new Date(dateStr).toLocaleDateString('es', options);
    } catch {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
}

// ─── Skeleton ─────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-sc-beige animate-pulse">
      <div className="aspect-[16/9] bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-5 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="flex gap-3 pt-2">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-sc-beige animate-pulse">
      <div className="grid lg:grid-cols-2">
        <div className="aspect-[4/3] lg:aspect-auto bg-gray-200 min-h-[320px]" />
        <div className="p-8 lg:p-12 flex flex-col justify-center space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-8 bg-gray-200 rounded w-4/5" />
          <div className="h-8 bg-gray-200 rounded w-3/5" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-10 bg-gray-200 rounded-pill w-40 mt-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────
function ArticleCard({ post }: { post: BlogPost }) {
  const date = post.published_at || post.created_at;
  const formattedDate = safeFormatDate(date, { day: '2-digit', month: 'long', year: 'numeric' });
  const imgProps = getBlogImageProps(post);

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-sc-beige hover:shadow-lg transition-all duration-300 group flex flex-col">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden aspect-[16/9] bg-sc-beige flex-shrink-0">
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
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.blog_categories && (
            <Link href={`/blog/categoria/${post.blog_categories.slug}`} className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/10 px-2.5 py-1 rounded-full hover:bg-sc-periwinkle/20 transition-colors">
              {post.blog_categories.name}
            </Link>
          )}
          {post.is_featured && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Destacado</span>
          )}
        </div>
        <Link href={`/blog/${post.slug}`} className="flex-1">
          <h3 className="text-sc-forest font-bold text-lg leading-snug mb-2 group-hover:text-sc-periwinkle transition-colors line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sc-muted text-sm leading-relaxed line-clamp-3 mb-4">{post.excerpt}</p>}
        </Link>
        <div className="flex items-center gap-3 text-xs text-sc-muted mt-auto pt-3 border-t border-sc-beige/60">
          <span>{formattedDate}</span>
          {post.read_time_minutes && (
            <><span>·</span><span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5V6l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>{post.read_time_minutes} min de lectura</span></>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Newsletter CTA ───────────────────────────────────────────
function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="bg-sc-forest rounded-2xl p-8 lg:p-12 text-center">
      <div className="max-w-xl mx-auto">
        <span className="inline-block text-sc-periwinkle text-sm font-semibold tracking-wide uppercase mb-3">Newsletter</span>
        <h2 className="text-white font-black text-2xl lg:text-3xl tracking-tightest mb-3">Mantente al día con Street Candy's</h2>
        <p className="text-white/70 text-sm mb-6 leading-relaxed">Recibe los últimos artículos sobre cannabis, bienestar y novedades directamente en tu correo.</p>
        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-sc-periwinkle font-semibold">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ¡Gracias! Te has suscrito exitosamente.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required className="flex-1 px-4 py-3 rounded-pill bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-sc-periwinkle transition-colors" />
            <button type="submit" disabled={loading} className="px-6 py-3 bg-sc-periwinkle text-white rounded-pill text-sm font-semibold hover:bg-sc-periwinkle/90 transition-colors disabled:opacity-60 whitespace-nowrap">
              {loading ? 'Suscribiendo...' : 'Suscribirme'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function BlogPage() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [featured, setFeatured] = useState<BlogPost | null | undefined>(undefined);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Supabase client ref — only created client-side
  const sbRef = useRef<SupabaseClient | null>(null);

  // Initialize supabase client only on client
  useEffect(() => {
    import('@/lib/supabase/client').then(mod => {
      sbRef.current = mod.createClient();

      // Fetch categories
      sbRef.current
        .from('blog_categories')
        .select('id, name, slug, description, is_active')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }: { data: BlogCategory[] | null }) => {
          if (data) setCategories(data);
        });

      // Fetch featured
      sbRef.current
        .from('blog_posts')
        .select('*, blog_categories(name, slug), profiles(full_name)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }: { data: BlogPost | null }) => {
          setFeatured(data || null);
        });
    });
  }, []);

  // Fetch posts whenever filters/page change
  const fetchPosts = useCallback(async () => {
    if (!sbRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const sb = sbRef.current;
      let query = sb
        .from('blog_posts')
        .select('*, blog_categories(name, slug), profiles(full_name)', { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (activeCategory) {
        const cat = categories.find((c: BlogCategory) => c.slug === activeCategory);
        if (cat) query = query.eq('blog_category_id', cat.id);
      }
      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
      }
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error: qErr } = await query;
      if (qErr) throw qErr;
      setPosts((data as BlogPost[]) || []);
      setTotal(count || 0);
    } catch {
      setError('No se pudieron cargar los artículos. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [page, search, activeCategory, categories]);

  // Trigger fetch once supabase is ready and on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sbRef.current) fetchPosts();
    }, 50);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCategory = (slug: string) => {
    setActiveCategory(slug === activeCategory ? '' : slug);
    setPage(1);
  };

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} />

      <main id="main-content" className="min-h-screen bg-sc-cream">
        {/* Hero Header */}
        <section className="bg-sc-forest px-4 lg:px-8 py-16 lg:py-24">
          <div className="max-w-[1400px] mx-auto text-center">
            <span className="inline-block text-sc-periwinkle text-sm font-semibold tracking-wide uppercase mb-4">Blog</span>
            <h1 className="text-white font-black text-4xl lg:text-6xl tracking-tightest mb-4">Aprende con Street Candy's</h1>
            <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">Artículos sobre cannabis, bienestar, ciencia y cultura. Todo lo que necesitas saber.</p>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto">
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar artículos..." className="w-full pl-10 pr-4 py-3 rounded-pill bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-sc-periwinkle transition-colors" />
              </div>
              <button type="submit" className="px-6 py-3 bg-sc-periwinkle text-white rounded-pill text-sm font-semibold hover:bg-sc-periwinkle/90 transition-colors">Buscar</button>
            </form>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-12 space-y-12">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleCategory('')} className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all ${!activeCategory ? 'bg-sc-forest text-white' : 'bg-white border border-sc-beige text-sc-forest hover:border-sc-forest'}`}>Todos</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => handleCategory(cat.slug)} className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all ${activeCategory === cat.slug ? 'bg-sc-forest text-white' : 'bg-white border border-sc-beige text-sc-forest hover:border-sc-forest'}`}>{cat.name}</button>
              ))}
            </div>
          )}

          {/* Active search indicator */}
          {search && (
            <div className="flex items-center gap-2 text-sm text-sc-muted">
              <span>Resultados para: <strong className="text-sc-forest">"{search}"</strong></span>
              <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="text-sc-periwinkle hover:underline">Limpiar</button>
            </div>
          )}

          {/* Featured Post */}
          {!search && !activeCategory && page === 1 && (
            <div>
              <h2 className="text-sc-forest font-black text-2xl tracking-tightest mb-6">Artículo Destacado</h2>
              {featured === undefined ? (
                <FeaturedSkeleton />
              ) : featured === null ? (
                <div className="bg-white rounded-2xl border border-sc-beige p-12 text-center text-sc-muted">No hay artículo destacado disponible.</div>
              ) : (
                <article className="bg-white rounded-2xl overflow-hidden border border-sc-beige hover:shadow-xl transition-all duration-300 group">
                  <div className="grid lg:grid-cols-2">
                    <Link href={`/blog/${featured.slug}`} className="block overflow-hidden aspect-[4/3] lg:aspect-auto min-h-[280px] bg-sc-beige">
                      {(() => { const fp = getBlogImageProps(featured); return (
                        <img src={fp.src} alt={fp.alt} title={fp.title} width={fp.width} height={fp.height} loading="eager" decoding="async" onError={fp.onError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ); })()}
                    </Link>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">⭐ Destacado</span>
                        {featured.blog_categories && (
                          <Link href={`/blog/categoria/${featured.blog_categories.slug}`} className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/10 px-2.5 py-1 rounded-full hover:bg-sc-periwinkle/20 transition-colors">{featured.blog_categories.name}</Link>
                        )}
                      </div>
                      <Link href={`/blog/${featured.slug}`}>
                        <h2 className="text-sc-forest font-black text-2xl lg:text-3xl tracking-tightest leading-snug mb-3 group-hover:text-sc-periwinkle transition-colors">{featured.title}</h2>
                      </Link>
                      {featured.excerpt && <p className="text-sc-muted text-base leading-relaxed mb-6 line-clamp-3">{featured.excerpt}</p>}
                      <div className="flex items-center gap-3 text-sm text-sc-muted mb-6 flex-wrap">
                        {featured.profiles?.full_name && <><span>{featured.profiles.full_name}</span><span>·</span></>}
                        <span>{safeFormatDate(featured.published_at || featured.created_at, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        {featured.read_time_minutes && <><span>·</span><span>{featured.read_time_minutes} min de lectura</span></>}
                      </div>
                      <Link href={`/blog/${featured.slug}`} className="inline-flex items-center gap-2 bg-sc-forest text-white px-6 py-3 rounded-pill text-sm font-semibold hover:bg-sc-darkforest transition-colors self-start">
                        Leer artículo
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                    </div>
                  </div>
                </article>
              )}
            </div>
          )}

          {/* Articles Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sc-forest font-black text-2xl tracking-tightest">
                {search ? 'Resultados de búsqueda' : activeCategory ? categories.find(c => c.slug === activeCategory)?.name || 'Artículos' : 'Todos los artículos'}
              </h2>
              {!loading && total > 0 && <span className="text-sc-muted text-sm">{total} artículo{total !== 1 ? 's' : ''}</span>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-red-400"><circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/><path d="M20 12v10M20 26v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <p className="text-red-700 font-semibold mb-2">Error al cargar artículos</p>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button onClick={fetchPosts} className="px-5 py-2.5 bg-red-600 text-white rounded-pill text-sm font-semibold hover:bg-red-700 transition-colors">Reintentar</button>
              </div>
            )}

            {loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div className="bg-white rounded-2xl border border-sc-beige p-12 text-center">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4 text-sc-border"><rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M16 24h16M16 30h10M16 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <p className="text-sc-forest font-bold text-lg mb-2">No se encontraron artículos</p>
                <p className="text-sc-muted text-sm mb-4">{search ? `No hay resultados para "${search}". Intenta con otras palabras.` : 'Aún no hay artículos publicados en esta categoría.'}</p>
                {(search || activeCategory) && (
                  <button onClick={() => { setSearch(''); setSearchInput(''); setActiveCategory(''); setPage(1); }} className="px-5 py-2.5 bg-sc-forest text-white rounded-pill text-sm font-semibold hover:bg-sc-darkforest transition-colors">Ver todos los artículos</button>
                )}
              </div>
            )}

            {!loading && !error && posts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => <ArticleCard key={post.id} post={post} />)}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-sc-beige text-sc-forest text-sm font-medium hover:bg-sc-beige transition-colors disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${p === page ? 'bg-sc-forest text-white' : 'border border-sc-beige text-sc-forest hover:bg-sc-beige'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-sc-beige text-sc-forest text-sm font-medium hover:bg-sc-beige transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
            </div>
          )}

          {/* Newsletter */}
          <NewsletterCTA />
        </div>
      </main>

      <Footer />
    </>
  );
}
