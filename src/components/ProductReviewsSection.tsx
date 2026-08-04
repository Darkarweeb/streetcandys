'use client';
import React, { useState, useEffect, useCallback } from 'react';
import type { DbReview } from '@/lib/products/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewsSummary {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

interface ReviewsData {
  resenas: DbReview[];
  resumen: ReviewsSummary;
  destacadas: DbReview[];
  paginacion: {
    pagina_actual: number;
    por_pagina: number;
    total: number;
    total_paginas: number;
    tiene_siguiente: boolean;
    tiene_anterior: boolean;
  };
}

interface ReviewFormData {
  rating: number;
  title: string;
  body: string;
}

interface ProductReviewsSectionProps {
  productSlug: string;
  productId: string;
  productName: string;
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14, interactive = false, onChange }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
          onMouseEnter={interactive ? () => setHover(star) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={interactive ? `${star} estrellas` : undefined}
        >
          <svg
            width={size} height={size}
            viewBox="0 0 12 12"
            fill={star <= (hover || Math.round(rating)) ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1"
            className="text-amber-400"
            aria-hidden="true"
          >
            <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Rating Distribution Bar ──────────────────────────────────────────────────

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-sc-muted w-4 text-right">{star}</span>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className="text-amber-400 flex-shrink-0" aria-hidden="true">
        <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
      </svg>
      <div className="flex-1 bg-sc-beige rounded-full h-2 overflow-hidden">
        <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sc-muted w-6 text-right">{count}</span>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: DbReview & { reviewer_name?: string; profiles?: { full_name: string } } }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const name = review.reviewer_name ?? (review as DbReview & { profiles?: { full_name: string } }).profiles?.full_name ?? 'Cliente';
  const photos = review.photos ?? [];

  return (
    <div className="pb-6 border-b border-sc-border last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sc-forest text-sm">{name}</span>
            {review.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Compra Verificada
              </span>
            )}
            {review.is_featured && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Destacada
              </span>
            )}
          </div>
          <StarRating rating={review.rating} size={12} />
        </div>
        <span className="text-xs text-sc-muted flex-shrink-0">
          {new Date(review.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {review.title && (
        <p className="font-semibold text-sc-forest text-sm mb-1">{review.title}</p>
      )}
      {review.body && (
        <p className="text-sc-forest/80 text-sm leading-relaxed">{review.body}</p>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setPhotoIdx(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${photoIdx === idx ? 'border-sc-forest' : 'border-sc-border'}`}
              aria-label={`Ver foto ${idx + 1}`}
            >
              <img src={photo.url} alt={photo.alt || `Foto de reseña ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Admin reply */}
      {review.admin_reply && (
        <div className="mt-3 bg-sc-beige border border-sc-border rounded-lg p-3">
          <p className="text-xs font-semibold text-sc-forest mb-1">Respuesta de Street Candy's</p>
          <p className="text-sm text-sc-forest/80">{review.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

// ─── Submit Review Form ───────────────────────────────────────────────────────

function SubmitReviewForm({ productSlug, onSuccess }: { productSlug: string; onSuccess: () => void }) {
  const [form, setForm] = useState<ReviewFormData>({ rating: 0, title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating === 0) { setError('Por favor selecciona una calificación'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${productSlug}/resenas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.exito) { setError(data.error); return; }
      onSuccess();
    } catch {
      setError('Error al enviar la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-sc-beige border border-sc-border rounded-card p-5 space-y-4">
      <h3 className="font-bold text-sc-forest">Escribe tu reseña</h3>

      <div>
        <label className="block text-sm font-medium text-sc-forest mb-2">Calificación *</label>
        <StarRating rating={form.rating} size={24} interactive onChange={(r) => setForm(f => ({ ...f, rating: r }))} />
      </div>

      <div>
        <label className="block text-sm font-medium text-sc-forest mb-1">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Resumen de tu experiencia"
          className="w-full border border-sc-border rounded-lg px-3 py-2 text-sm text-sc-forest bg-white focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
          maxLength={120}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-sc-forest mb-1">Reseña</label>
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Cuéntanos tu experiencia con el producto..."
          rows={4}
          className="w-full border border-sc-border rounded-lg px-3 py-2 text-sm text-sc-forest bg-white focus:outline-none focus:ring-2 focus:ring-sc-forest/20 resize-none"
          maxLength={1000}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-sc-forest text-sc-cream font-bold py-2.5 px-6 rounded-pill hover:bg-sc-darkforest transition-colors disabled:opacity-50 text-sm"
      >
        {submitting ? 'Enviando...' : 'Enviar Reseña'}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductReviewsSection({ productSlug, productId, productName }: ProductReviewsSectionProps) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('reciente');
  const [pagina, setPagina] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/productos/${productSlug}/resenas?pagina=${pagina}&sort=${sort}`);
      const json = await res.json();
      if (json.exito) setData(json.datos);
    } finally {
      setLoading(false);
    }
  }, [productSlug, pagina, sort]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      setIsLoggedIn(!!d?.user);
    }).catch(() => {});
  }, []);

  const resumen = data?.resumen;
  const resenas = data?.resenas ?? [];
  const destacadas = data?.destacadas ?? [];

  // AggregateRating JSON-LD (only approved reviews)
  const jsonLd = resumen && resumen.total_reviews > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: resumen.average_rating,
      reviewCount: resumen.total_reviews,
      bestRating: 5,
      worstRating: 1,
    },
  } : null;

  return (
    <section className="bg-white border-t border-sc-border py-12 lg:py-16" aria-labelledby="reviews-heading">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 id="reviews-heading" className="text-2xl lg:text-3xl font-black tracking-tightest text-sc-forest">
            Reseñas del Producto
          </h2>
          {isLoggedIn && !submitted && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="bg-sc-forest text-sc-cream font-bold py-2 px-5 rounded-pill text-sm hover:bg-sc-darkforest transition-colors"
            >
              {showForm ? 'Cancelar' : 'Escribir Reseña'}
            </button>
          )}
        </div>

        {/* Submit form */}
        {showForm && !submitted && (
          <div className="mb-8">
            <SubmitReviewForm
              productSlug={productSlug}
              onSuccess={() => { setSubmitted(true); setShowForm(false); loadReviews(); }}
            />
          </div>
        )}

        {submitted && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-card p-4 text-green-700 text-sm font-medium">
            ✓ Tu reseña fue enviada y está pendiente de revisión. Te notificaremos cuando sea publicada.
          </div>
        )}

        {/* Summary + Distribution */}
        {resumen && resumen.total_reviews > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pb-10 border-b border-sc-border">
            {/* Average */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-6xl font-black text-sc-forest">{resumen.average_rating.toFixed(1)}</span>
              <StarRating rating={resumen.average_rating} size={20} />
              <span className="text-sm text-sc-muted mt-2">{resumen.total_reviews} reseñas verificadas</span>
            </div>
            {/* Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => (
                <RatingBar
                  key={star}
                  star={star}
                  count={resumen.rating_distribution[String(star)] ?? 0}
                  total={resumen.total_reviews}
                />
              ))}
            </div>
          </div>
        )}

        {/* Featured reviews */}
        {destacadas.length > 0 && (
          <div className="mb-10">
            <h3 className="text-base font-bold text-sc-forest mb-4">Reseñas Destacadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {destacadas.map(r => (
                <div key={r.id} className="bg-sc-beige border border-sc-border rounded-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={r.rating} size={12} />
                    {r.is_verified && (
                      <span className="text-xs text-green-700 font-semibold">Verificada</span>
                    )}
                  </div>
                  {r.title && <p className="font-semibold text-sc-forest text-sm mb-1">{r.title}</p>}
                  <p className="text-sm text-sc-forest/80 line-clamp-3">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & Sort */}
        {resumen && resumen.total_reviews > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-sm font-medium text-sc-forest">Ordenar:</span>
            {[
              { value: 'reciente', label: 'Más reciente' },
              { value: 'mejor', label: 'Mejor calificación' },
              { value: 'peor', label: 'Peor calificación' },
              { value: 'util', label: 'Más útil' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSort(opt.value); setPagina(1); }}
                className={`text-sm px-3 py-1.5 rounded-pill border transition-all ${
                  sort === opt.value
                    ? 'bg-sc-forest text-sc-cream border-sc-forest'
                    : 'border-sc-border text-sc-forest hover:border-sc-forest'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Reviews list */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse pb-6 border-b border-sc-border">
                <div className="h-4 bg-sc-beige rounded w-32 mb-2" />
                <div className="h-3 bg-sc-beige rounded w-24 mb-3" />
                <div className="h-3 bg-sc-beige rounded w-full mb-1" />
                <div className="h-3 bg-sc-beige rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : resenas.length === 0 ? (
          <div className="text-center py-12 text-sc-muted">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-sc-border" aria-hidden="true">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 22s1.5 3 6 3 6-3 6-3M15 16h.01M25 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="font-medium">Aún no hay reseñas aprobadas</p>
            <p className="text-sm mt-1">Sé el primero en compartir tu experiencia</p>
          </div>
        ) : (
          <div className="space-y-0">
            {resenas.map(r => (
              <ReviewCard key={r.id} review={r as DbReview & { reviewer_name?: string }} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.paginacion && data.paginacion.total_paginas > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={!data.paginacion.tiene_anterior}
              className="px-4 py-2 rounded-pill border border-sc-border text-sm font-medium text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-sc-muted px-2">
              {data.paginacion.pagina_actual} / {data.paginacion.total_paginas}
            </span>
            <button
              onClick={() => setPagina(p => p + 1)}
              disabled={!data.paginacion.tiene_siguiente}
              className="px-4 py-2 rounded-pill border border-sc-border text-sm font-medium text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
