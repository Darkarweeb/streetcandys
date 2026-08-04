'use client';
import React, { useState, useEffect } from 'react';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import Link from 'next/link';
import type { DbReview } from '@/lib/products/types';

type ReviewWithProduct = DbReview & {
  product_name?: string;
  product_slug?: string;
  product_thumbnail?: string;
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} width={size} height={size} viewBox="0 0 12 12"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1" className="text-amber-400" aria-hidden="true">
          <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
        </svg>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  approved: { label: 'Aprobada', color: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
  hidden: { label: 'Oculta', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

function EditReviewModal({ review, onClose, onSaved }: {
  review: ReviewWithProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ rating: review.rating, title: review.title ?? '', body: review.body ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState(0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${review.product_slug}/resenas/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.exito) { setError(data.error); return; }
      onSaved();
    } catch {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sc-forest">Editar Reseña</h3>
          <button onClick={onClose} className="text-sc-muted hover:text-sc-forest p-1" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-sc-forest mb-2">Calificación</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} type="button"
                onClick={() => setForm(f => ({ ...f, rating: star }))}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${star} estrellas`}
              >
                <svg width="24" height="24" viewBox="0 0 12 12"
                  fill={star <= (hover || form.rating) ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1" className="text-amber-400">
                  <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-sc-forest mb-1">Título</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-sc-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20" maxLength={120} />
        </div>

        <div>
          <label className="block text-sm font-medium text-sc-forest mb-1">Reseña</label>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4} className="w-full border border-sc-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20 resize-none" maxLength={1000} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-sc-border text-sc-forest font-medium py-2 rounded-pill text-sm hover:bg-sc-beige transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-sc-forest text-sc-cream font-bold py-2 rounded-pill text-sm hover:bg-sc-darkforest transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MisResenasPage() {
  const [resenas, setResenas] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<ReviewWithProduct | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadResenas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cuenta/resenas');
      const data = await res.json();
      if (data.exito) setResenas(data.datos);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResenas(); }, []);

  const handleDelete = async (review: ReviewWithProduct) => {
    if (!confirm('¿Eliminar esta reseña?')) return;
    setDeletingId(review.id);
    try {
      await fetch(`/api/productos/${review.product_slug}/resenas/${review.id}`, { method: 'DELETE' });
      await loadResenas();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CuentaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-black text-sc-forest tracking-tightest">Mis Reseñas</h1>
          <p className="text-sm text-sc-muted mt-1">Gestiona las reseñas que has enviado</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-sc-border rounded-card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-14 h-14 bg-sc-beige rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-sc-beige rounded w-1/2" />
                    <div className="h-3 bg-sc-beige rounded w-1/3" />
                    <div className="h-3 bg-sc-beige rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : resenas.length === 0 ? (
          <div className="bg-white border border-sc-border rounded-card p-8 text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-sc-border" aria-hidden="true">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 22s1.5 3 6 3 6-3 6-3M15 16h.01M25 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="font-semibold text-sc-forest mb-1">Aún no has escrito reseñas</p>
            <p className="text-sm text-sc-muted mb-4">Compra un producto y comparte tu experiencia</p>
            <Link href="/productos" className="inline-block bg-sc-forest text-sc-cream font-bold py-2 px-5 rounded-pill text-sm hover:bg-sc-darkforest transition-colors">
              Ver Productos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {resenas.map(review => {
              const statusInfo = STATUS_LABELS[review.status] ?? STATUS_LABELS.pending;
              return (
                <div key={review.id} className="bg-white border border-sc-border rounded-card p-4">
                  <div className="flex gap-3">
                    {/* Product thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-sc-beige flex-shrink-0">
                      {review.product_thumbnail ? (
                        <img src={review.product_thumbnail} alt={review.product_name ?? 'Producto'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-sc-border" aria-hidden="true">
                            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          {review.product_slug ? (
                            <Link href={`/productos/${review.product_slug}`} className="font-semibold text-sc-forest text-sm hover:underline">
                              {review.product_name ?? 'Producto'}
                            </Link>
                          ) : (
                            <span className="font-semibold text-sc-forest text-sm">{review.product_name ?? 'Producto'}</span>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={review.rating} size={12} />
                            <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {review.is_verified && (
                              <span className="text-xs text-green-700 font-semibold">✓ Verificada</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-sc-muted flex-shrink-0">
                          {new Date(review.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {review.title && <p className="font-medium text-sc-forest text-sm mt-2">{review.title}</p>}
                      {review.body && <p className="text-sm text-sc-forest/80 mt-1 line-clamp-2">{review.body}</p>}

                      {review.admin_reply && (
                        <div className="mt-2 bg-sc-beige border border-sc-border rounded-lg p-2.5">
                          <p className="text-xs font-semibold text-sc-forest mb-0.5">Respuesta de la tienda</p>
                          <p className="text-xs text-sc-forest/80">{review.admin_reply}</p>
                        </div>
                      )}

                      {/* Actions for pending reviews */}
                      {review.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setEditingReview(review)}
                            className="text-xs font-medium text-sc-forest border border-sc-border px-3 py-1.5 rounded-pill hover:bg-sc-beige transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(review)}
                            disabled={deletingId === review.id}
                            className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-pill hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === review.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingReview && (
        <EditReviewModal
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onSaved={() => { setEditingReview(null); loadResenas(); }}
        />
      )}
    </CuentaLayout>
  );
}
