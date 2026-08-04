'use client';
import React, { useState, useEffect, useRef } from 'react';
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

// ─── Content Cleaner ─────────────────────────────────────────────────────────
// Strips any <script> tags (including JSON-LD) and <style> tags from article
// body content so they never appear as visible text on the page.
function cleanArticleContent(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/^\s*<article[^>]*>/i, '')
    .replace(/<\/article>\s*$/i, '')
    .trim();
}

// ─── Article Content Renderer ────────────────────────────────────────────────
function ArticleContent({ content }: { content: string }) {
  const clean = cleanArticleContent(content);

  if (/<[a-z][\s\S]*>/i.test(clean)) {
    return (
      <div
        className="prose prose-sm max-w-none text-sc-forest/80 leading-relaxed
          prose-headings:text-sc-forest prose-headings:font-black
          prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
          prose-p:mb-5 prose-p:leading-7
          prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
          prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
          prose-li:mb-2
          prose-strong:text-sc-forest prose-strong:font-bold
          prose-a:text-sc-periwinkle prose-a:underline"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-sc-forest/80 leading-relaxed">
      {clean.split('\n\n').map((paragraph, idx) =>
        paragraph.trim() ? (
          <p key={idx} className="mb-5 leading-7">
            {paragraph}
          </p>
        ) : null
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: string;
  is_featured: boolean;
  view_count: number;
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  blog_category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  blog_categories?: { name: string; slug: string } | null;
  profiles?: { full_name: string; avatar_url: string | null } | null;
}

// ─── JSON-LD Article Schema ───────────────────────────────────────────────────
// Injected into <head> via useEffect to avoid rendering as visible body content.
function ArticleJsonLd({ post, baseUrl }: { post: BlogPost; baseUrl: string }) {
  useEffect(() => {
    // Remove any existing JSON-LD script injected by this component
    const existing = document.getElementById('article-jsonld');
    if (existing) existing.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || post.meta_description || '',
      image: [getBlogImageProps(post).src],
      datePublished: post.published_at || post.created_at,
      dateModified: post.published_at || post.created_at,
      author: post.profiles?.full_name
        ? { '@type': 'Person', name: post.profiles.full_name }
        : { '@type': 'Organization', name: "Street Candy\'s" },
      publisher: {
        '@type': 'Organization',
        name: "Street Candy\'s",
        url: baseUrl,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/blog/${post.slug}`,
      },
      keywords: (post.tags || []).join(', '),
      articleSection: post.blog_categories?.name || 'Blog',
      url: `${baseUrl}/blog/${post.slug}`,
    };

    const script = document.createElement('script');
    script.id = 'article-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('article-jsonld');
      if (el) el.remove();
    };
  }, [post, baseUrl]);

  // Renders nothing into the body — JSON-LD lives in <head> only
  return null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-[900px] mx-auto px-4 py-12">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded w-4/5" />
        <div className="h-10 bg-gray-200 rounded w-3/5" />
      </div>
      <div className="flex gap-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="aspect-[16/7] bg-gray-200 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-4 bg-gray-200 rounded ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Related Card ──────────────────────────────────────────────────────────────
function RelatedCard({ post }: { post: BlogPost }) {
  const imgProps = getBlogImageProps(post);
  return (
    <article className="bg-white rounded-xl overflow-hidden border border-sc-beige hover:shadow-md transition-all duration-300 group flex flex-col">
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
      <div className="p-4 flex flex-col flex-1">
        {post.blog_categories && (
          <span className="text-xs font-semibold text-sc-periwinkle mb-2">{post.blog_categories.name}</span>
        )}
        <Link href={`/blog/${post.slug}`}>
          <h4 className="text-sc-forest font-bold text-sm leading-snug mb-2 group-hover:text-sc-periwinkle transition-colors line-clamp-2">
            {post.title}
          </h4>
        </Link>
        <div className="flex items-center gap-2 text-xs text-sc-muted mt-auto">
          <span>
            {safeFormatDate(post.published_at || post.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {post.read_time_minutes && (
            <><span>·</span><span>{post.read_time_minutes} min</span></>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────
function ShareButton({ post, baseUrl }: { post: BlogPost; baseUrl: string }) {
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const articleUrl = `${baseUrl}/blog/${post.slug}`;
  const productionUrl = `https://streetcandys.shop/blog/${post.slug}`;
  const shareTitle = post.title;
  const shareText = post.excerpt || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showFallback) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFallback(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFallback]);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: articleUrl,
        });
      } catch (err: unknown) {
        // Silently ignore user cancellation (AbortError)
        if (err instanceof Error && err.name !== 'AbortError') {
          // Non-cancellation error — fall back to dropdown
          setShowFallback(true);
        }
      }
    } else {
      // Browser doesn't support Web Share API — show fallback dropdown
      setShowFallback((prev) => !prev);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = articleUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `🌿 Check out this article from Street Candys!\n\n*${shareTitle}*\n\n${shareText ? shareText + '\n\n' : ''}Read the full article here:\n${productionUrl}\n\n_Street Candys_\n_Premium Hemp-Derived Products_`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(articleUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleShare}
        className="flex items-center gap-2 text-sm font-semibold text-sc-forest bg-sc-beige hover:bg-sc-beige/80 border border-sc-border px-4 py-2 rounded-full transition-colors"
        aria-label="Compartir artículo"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartir
      </button>

      {/* Fallback dropdown — shown when Web Share API is unavailable */}
      {showFallback && (
        <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-2xl shadow-xl border border-sc-border overflow-hidden z-50">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-sc-forest hover:bg-sc-beige/60 transition-colors text-left"
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-green-600">¡Enlace copiado!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copiar enlace
              </>
            )}
          </button>

          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-sc-forest hover:bg-sc-beige/60 transition-colors"
            onClick={() => setShowFallback(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>

          {/* Facebook */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-sc-forest hover:bg-sc-beige/60 transition-colors"
            onClick={() => setShowFallback(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>

          {/* X (Twitter) */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-sc-forest hover:bg-sc-beige/60 transition-colors"
            onClick={() => setShowFallback(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X (Twitter)
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [baseUrl, setBaseUrl] = useState(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcand8616.builtwithrocket.new'
  );
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedViewCount, setFormattedViewCount] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!slug) return;

    const loadPost = async () => {
      try {
        setLoading(true);
        const [postRes, relatedRes] = await Promise.all([
          fetch(`/api/blog/${slug}`),
          fetch(`/api/blog/${slug}/relacionados`),
        ]);

        if (!postRes.ok) throw new Error('Artículo no encontrado');

        const postData = await postRes.json();
        const relatedData = await relatedRes.json();

        setPost(postData.datos);
        setRelated(relatedData.datos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el artículo');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const date = post.published_at || post.created_at;
    setFormattedDate(
      safeFormatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })
    );
    setFormattedViewCount(
      post.view_count > 0 ? post.view_count.toLocaleString('es-CO') : ''
    );
  }, [post]);

  if (loading) {
    return (
      <>
        <Navigation cartCount={0} onCartOpen={() => {}} />
        <main className="min-h-screen bg-sc-cream">
          <ArticleSkeleton />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Navigation cartCount={0} onCartOpen={() => {}} />
        <main className="min-h-screen bg-sc-cream flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-sc-forest font-bold text-xl mb-4">Artículo no encontrado</p>
            <Link href="/blog" className="text-sc-periwinkle hover:underline">← Volver al blog</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const date = post.published_at || post.created_at;

  return (
    <>
      {/* JSON-LD injected into <head> via useEffect — never renders in body */}
      <ArticleJsonLd post={post} baseUrl={baseUrl} />
      <Navigation cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={[]} />

      <main className="min-h-screen bg-sc-cream">
        {/* Header */}
        <header className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[900px] mx-auto px-4 lg:px-8">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Blog', href: '/blog' },
                ...(post.blog_categories ? [{ label: post.blog_categories.name, href: `/blog/categoria/${post.blog_categories.slug}` }] : []),
                { label: post.title, href: `/blog/${slug}` },
              ]}
            />
            <div className="flex items-center gap-2 mt-6 flex-wrap">
              {post.blog_categories && (
                <Link href={`/blog/categoria/${post.blog_categories.slug}`}
                  className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/20 px-2.5 py-1 rounded-full hover:bg-sc-periwinkle/30 transition-colors">
                  {post.blog_categories.name}
                </Link>
              )}
              {post.is_featured && (
                <span className="text-xs font-semibold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full">⭐ Destacado</span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tightest mt-4 leading-tight">{post.title}</h1>
            <div className="flex items-center gap-4 mt-6 text-sc-cream/70 text-sm flex-wrap">
              {post.profiles && (
                <div className="flex items-center gap-2">
                  {post.profiles.avatar_url ? (
                    <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sc-periwinkle/30 flex items-center justify-center text-xs font-bold text-sc-periwinkle">
                      {post.profiles.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{post.profiles.full_name}</span>
                </div>
              )}
              <span>·</span>
              <time dateTime={date}>{formattedDate}</time>
              {post.read_time_minutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {post.read_time_minutes} min de lectura
                  </span>
                </>
              )}
              {formattedViewCount && (
                <>
                  <span>·</span>
                  <span>{formattedViewCount} vistas</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {(() => {
          const imgProps = getBlogImageProps(post);
          return (
            <div className="aspect-[16/7] overflow-hidden max-h-[480px]">
              <img
                src={imgProps.src}
                alt={imgProps.alt}
                title={imgProps.title}
                width={imgProps.width}
                height={imgProps.height}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                onError={imgProps.onError}
              />
            </div>
          );
        })()}

        {/* Content */}
        <div className="max-w-[900px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
          {post.excerpt && (
            <p className="text-lg text-sc-forest/80 mb-8 leading-relaxed font-medium border-l-4 border-sc-periwinkle pl-4">
              {post.excerpt}
            </p>
          )}
          {post.content && (
            <ArticleContent content={post.content} />
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-sc-border">
              <p className="text-xs font-semibold text-sc-muted uppercase tracking-wide mb-3">Etiquetas</p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${encodeURIComponent(tag)}`}
                    className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/10 px-3 py-1.5 rounded-full hover:bg-sc-periwinkle/20 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Author Card */}
          {post.profiles && (
            <div className="mt-10 pt-8 border-t border-sc-border">
              <div className="flex items-center gap-4 bg-sc-beige/50 rounded-2xl p-5">
                {post.profiles.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-sc-periwinkle/20 flex items-center justify-center text-xl font-black text-sc-periwinkle flex-shrink-0">
                    {post.profiles.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-sc-muted uppercase tracking-wide mb-1">Escrito por</p>
                  <p className="text-sc-forest font-bold">{post.profiles.full_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 pt-6 border-t border-sc-border flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-sc-forest">Compartir:</span>
            <ShareButton post={post} baseUrl={baseUrl} />
          </div>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="bg-white border-t border-sc-border py-12 lg:py-16" aria-label="Artículos relacionados">
            <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
              <h2 className="text-2xl lg:text-3xl font-black tracking-tightest text-sc-forest mb-8">
                Artículos Relacionados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.slice(0, 3).map((relatedPost) => (
                  <RelatedCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}