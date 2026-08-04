'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  is_featured: boolean;
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string; slug: string } | null;
  profiles?: { full_name: string } | null;
}

const PAGE_SIZE = 9;

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-sc-beige animate-pulse">
      <div className="aspect-[16/9] bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

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
        {post.blog_categories && (
          <Link href={`/blog/categoria/${post.blog_categories.slug}`} className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/10 px-2.5 py-1 rounded-full hover:bg-sc-periwinkle/20 transition-colors self-start mb-3">
            {post.blog_categories.name}
          </Link>
        )}
        <Link href={`/blog/${post.slug}`} className="flex-1">
          <h3 className="text-sc-forest font-bold text-lg leading-snug mb-2 group-hover:text-sc-periwinkle transition-colors line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sc-muted text-sm leading-relaxed line-clamp-3 mb-4">{post.excerpt}</p>}
        </Link>
        <div className="flex items-center gap-3 text-xs text-sc-muted mt-auto pt-3 border-t border-sc-beige/60">
          <span>{formattedDate}</span>
          {post.read_time_minutes && (
            <><span>·</span><span>{post.read_time_minutes} min de lectura</span></>
          )}
        </div>
      </div>
    </article>
  );
}

export default function BlogTagPage() {
  const params = useParams();
  const tag = decodeURIComponent(params?.tag as string || '');

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const fetchPosts = useCallback(async () => {
    if (!tag) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog?tag=${encodeURIComponent(tag)}&pagina=${page}&por_pagina=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Error al cargar artículos');
      const data = await res.json();
      setPosts(data.datos || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar artículos');
    } finally {
      setLoading(false);
    }
  }, [tag, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} />

      <main className="min-h-screen bg-sc-cream">
        <div className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: `#${tag}`, href: `/blog/tag/${encodeURIComponent(tag)}` },
              ]}
            />
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sc-periwinkle text-2xl font-black">#</span>
              <h1 className="text-3xl md:text-4xl font-black tracking-tightest">{tag}</h1>
            </div>
            <p className="text-sc-cream/70 mt-3">{total} artículo{total !== 1 ? 's' : ''} con esta etiqueta</p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={fetchPosts} className="px-5 py-2.5 bg-sc-forest text-white rounded-pill text-sm font-semibold hover:bg-sc-darkforest transition-colors">Reintentar</button>
            </div>
          )}

          {loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sc-forest font-bold text-lg mb-2">No hay artículos con esta etiqueta</p>
              <Link href="/blog" className="text-sc-periwinkle hover:underline text-sm">Ver todos los artículos</Link>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => <ArticleCard key={post.id} post={post} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap mt-12">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-sc-beige text-sc-forest text-sm font-medium hover:bg-sc-beige transition-colors disabled:opacity-40">← Anterior</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${p === page ? 'bg-sc-forest text-white' : 'border border-sc-beige text-sc-forest hover:bg-sc-beige'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-sc-beige text-sc-forest text-sm font-medium hover:bg-sc-beige transition-colors disabled:opacity-40">Siguiente →</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
