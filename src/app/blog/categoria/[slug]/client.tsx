'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
});

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  is_featured: boolean;
  view_count: number;
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  blog_categories?: { name: string; slug: string } | null;
  profiles?: { full_name: string } | null;
}

const PAGE_SIZE = 9;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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

// ─── Article Card ──────────────────────────────────────────────────────
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
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-sc-forest font-bold text-lg leading-snug mb-3 group-hover:text-sc-periwinkle transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="text-sc-forest/70 text-sm leading-relaxed mb-4 line-clamp-2">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-sc-muted mt-auto">
          <span>{formattedDate}</span>
          {post.read_time_minutes && (
            <>
              <span>·</span>
              <span>{post.read_time_minutes} min</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogCategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [category, setCategory] = useState<BlogCategory | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!slug) return;

    const loadCategory = async () => {
      try {
        setLoading(true);
        const [catRes, postsRes] = await Promise.all([
          fetch(`/api/blog/categorias/${slug}`),
          fetch(`/api/blog?categoria=${slug}&pagina=${page}&por_pagina=${PAGE_SIZE}`),
        ]);

        if (!catRes.ok) throw new Error('Categoría no encontrada');

        const catData = await catRes.json();
        const postsData = await postsRes.json();

        setCategory(catData.datos);
        setPosts(postsData.datos || []);
        setTotal(postsData.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la categoría');
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [slug, page]);

  if (error) return <div className="text-center py-12">Categoría no encontrada</div>;

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} />

      <main className="min-h-screen bg-sc-cream">
        {/* Header */}
        <div className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: category?.name || 'Categoría', href: `/blog/categoria/${slug}` },
              ]}
            />
            <h1 className="text-3xl md:text-4xl font-black tracking-tightest mt-6">
              {category?.name || 'Categoría'}
            </h1>
            {category?.description && (
              <p className="text-sc-cream/70 mt-4 max-w-2xl">{category.description}</p>
            )}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: Math.ceil(total / PAGE_SIZE) }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        page === i + 1
                          ? 'bg-sc-forest text-sc-cream'
                          : 'bg-white border border-sc-border text-sc-forest hover:bg-sc-beige'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sc-forest/70">No hay artículos en esta categoría</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}