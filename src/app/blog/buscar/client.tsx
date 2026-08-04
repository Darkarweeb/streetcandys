'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navigation from '@/components/Navigation';
import Breadcrumbs from '@/components/catalog/Breadcrumbs';
import { getBlogImageProps } from '@/lib/blog/blog-image-utils';

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="bg-sc-darkforest h-64 animate-pulse" aria-hidden="true" />,
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });

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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string; slug: string } | null;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-sc-beige animate-pulse flex gap-4 p-4">
      <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

function SearchResultCard({ post }: { post: BlogPost }) {
  const date = post.published_at || post.created_at;
  const formattedDate = safeFormatDate(date, { day: '2-digit', month: 'short', year: 'numeric' });
  const imgProps = getBlogImageProps(post);

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-sc-beige hover:shadow-md transition-all duration-300 group flex gap-4 p-4">
      <Link href={`/blog/${post.slug}`} className="block w-24 h-24 rounded-xl overflow-hidden bg-sc-beige flex-shrink-0">
        <img
          src={imgProps.src}
          alt={imgProps.alt}
          title={imgProps.title}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          onError={imgProps.onError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>
      <div className="flex-1 min-w-0">
        {post.blog_categories && (
          <Link href={`/blog/categoria/${post.blog_categories.slug}`} className="text-xs font-semibold text-sc-periwinkle mb-1 block hover:underline">
            {post.blog_categories.name}
          </Link>
        )}
        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-sc-forest font-bold text-base leading-snug mb-1 group-hover:text-sc-periwinkle transition-colors line-clamp-2">{post.title}</h3>
        </Link>
        {post.excerpt && <p className="text-sc-muted text-sm line-clamp-2 mb-2">{post.excerpt}</p>}
        <div className="flex items-center gap-2 text-xs text-sc-muted">
          <span>{formattedDate}</span>
          {post.read_time_minutes && <><span>·</span><span>{post.read_time_minutes} min</span></>}
        </div>
      </div>
    </article>
  );
}

export default function BlogSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams?.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setPosts([]); setTotal(0); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?q=${encodeURIComponent(q)}&por_pagina=20`);
      const data = await res.json();
      setPosts(data.datos || []);
      setTotal(data.total || 0);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) search(initialQ);
    inputRef.current?.focus();
  }, [initialQ, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    setQuery(q);
    if (q) router.replace(`/blog/buscar?q=${encodeURIComponent(q)}`);
    search(q);
  };

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} />

      <main className="min-h-screen bg-sc-cream">
        <div className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[800px] mx-auto px-4 lg:px-8">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: 'Buscar', href: '/blog/buscar' },
              ]}
            />
            <h1 className="text-3xl md:text-4xl font-black tracking-tightest mt-6 mb-6">Buscar artículos</h1>
            <form onSubmit={handleSubmit} role="search" aria-label="Buscar en el blog">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    ref={inputRef}
                    type="search"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Buscar artículos..."
                    aria-label="Término de búsqueda"
                    className="w-full pl-11 pr-4 py-3 rounded-pill bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-sc-periwinkle transition-colors"
                  />
                </div>
                <button type="submit" className="px-6 py-3 bg-sc-periwinkle text-white rounded-pill text-sm font-semibold hover:bg-sc-periwinkle/90 transition-colors">
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto px-4 lg:px-8 py-12">
          {query && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sc-muted text-sm">
                {loading ? 'Buscando...' : `${total} resultado${total !== 1 ? 's' : ''} para `}
                {!loading && <strong className="text-sc-forest">"{query}"</strong>}
              </p>
              {query && (
                <button onClick={() => { setQuery(''); setInputValue(''); setPosts([]); setTotal(0); router.replace('/blog/buscar'); }}
                  className="text-sc-periwinkle text-sm hover:underline">Limpiar</button>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && query && posts.length === 0 && (
            <div className="text-center py-16">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4 text-sc-border" aria-hidden="true">
                <circle cx="22" cy="22" r="16" stroke="currentColor" strokeWidth="2"/>
                <path d="M34 34l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 22h12M22 16v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-sc-forest font-bold text-lg mb-2">Sin resultados</p>
              <p className="text-sc-muted text-sm mb-4">No encontramos artículos para "{query}". Intenta con otras palabras.</p>
              <Link href="/blog" className="px-5 py-2.5 bg-sc-forest text-white rounded-pill text-sm font-semibold hover:bg-sc-darkforest transition-colors inline-block">
                Ver todos los artículos
              </Link>
            </div>
          )}

          {!loading && !query && (
            <div className="text-center py-16">
              <p className="text-sc-muted text-lg">Escribe algo para buscar artículos del blog.</p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map(post => <SearchResultCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
