'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import type { DbReview } from '@/lib/products/types';
import { createClient } from '@/lib/supabase/client';

import { useConfirm } from '@/components/ui/UXHelpers';

type AdminReview = DbReview & {
  product_name?: string;
  reviewer_name?: string;
  reviewer_email?: string;
  country_code?: string;
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  approved: { label: 'Aprobada', color: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
  hidden: { label: 'Oculta', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} width="12" height="12" viewBox="0 0 12 12"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1" className="text-amber-400" aria-hidden="true">
          <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewDetailDrawer({ review, onClose, onAction }: {
  review: AdminReview;
  onClose: () => void;
  onAction: (id: string, accion: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [reply, setReply] = useState(review.admin_reply ?? '');
  const [savingReply, setSavingReply] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const handleModerate = async (status: string) => {
    setActionLoading(status);
    await onAction(review.id, 'moderar', { status });
    setActionLoading(null);
  };

  const handleFeature = async () => {
    setActionLoading('feature');
    await onAction(review.id, 'destacar', { is_featured: !review.is_featured });
    setActionLoading(null);
  };

  const handleReply = async () => {
    setSavingReply(true);
    await onAction(review.id, 'responder', { reply });
    setSavingReply(false);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '¿Eliminar esta reseña?',
      message: 'La reseña será eliminada permanentemente. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    setActionLoading('delete');
    await onAction(review.id, 'eliminar');
    setActionLoading(null);
    onClose();
  };

  const statusInfo = STATUS_CONFIG[review.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      {confirmDialog}
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-sc-forest">Detalle de Reseña</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Product & Reviewer */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Producto</span>
              <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
            <p className="font-semibold text-sc-forest">{review.product_name ?? '—'}</p>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Autor</span>
              <p className="font-medium text-sc-forest text-sm">{review.reviewer_name ?? 'Anónimo'}</p>
              <p className="text-xs text-gray-500">{review.reviewer_email}</p>
              {review.country_code && (
                <p className="text-xs text-gray-500">{review.country_code === 'CO' ? '🇨🇴 Colombia' : '🇨🇷 Costa Rica'}</p>
              )}
            </div>
          </div>

          {/* Review content */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StarRating rating={review.rating} />
              <span className="font-bold text-sc-forest">{review.rating}/5</span>
              {review.is_verified && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                  ✓ Compra Verificada
                </span>
              )}
              {review.is_featured && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                  ⭐ Destacada
                </span>
              )}
            </div>
            {review.title && <p className="font-semibold text-sc-forest mb-2">{review.title}</p>}
            {review.body && <p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>}
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {review.photos.map((photo, idx) => (
                  <img key={idx} src={photo.url} alt={photo.alt || `Foto ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              {new Date(review.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Moderation actions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Moderación</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleModerate('approved')} disabled={actionLoading !== null || review.status === 'approved'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-40 transition-colors">
                {actionLoading === 'approved' ? '...' : '✓ Aprobar'}
              </button>
              <button onClick={() => handleModerate('rejected')} disabled={actionLoading !== null || review.status === 'rejected'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40 transition-colors">
                {actionLoading === 'rejected' ? '...' : '✕ Rechazar'}
              </button>
              <button onClick={() => handleModerate('hidden')} disabled={actionLoading !== null || review.status === 'hidden'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                {actionLoading === 'hidden' ? '...' : '👁 Ocultar'}
              </button>
              <button onClick={() => handleModerate('pending')} disabled={actionLoading !== null || review.status === 'pending'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-40 transition-colors">
                {actionLoading === 'pending' ? '...' : '⏳ Pendiente'}
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleFeature} disabled={actionLoading !== null}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${
                  review.is_featured
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {actionLoading === 'feature' ? '...' : review.is_featured ? '⭐ Quitar Destacado' : '☆ Destacar'}
              </button>
              <button onClick={handleDelete} disabled={actionLoading !== null}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
                {actionLoading === 'delete' ? '...' : '🗑 Eliminar'}
              </button>
            </div>
          </div>

          {/* Admin reply */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Respuesta de la Tienda</p>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              placeholder="Escribe una respuesta pública a esta reseña..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20 resize-none"
            />
            <button onClick={handleReply} disabled={savingReply}
              className="mt-2 w-full bg-sc-forest text-sc-cream font-bold py-2 rounded-lg text-sm hover:bg-sc-darkforest transition-colors disabled:opacity-50">
              {savingReply ? 'Guardando...' : 'Guardar Respuesta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminResenasPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [pagina, setPagina] = useState(1);
  const [filters, setFilters] = useState({
    busqueda: '',
    status: 'all',
    rating: '',
    pais: '',
  });

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        por_pagina: '20',
        ...(filters.busqueda && { busqueda: filters.busqueda }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.rating && { rating: filters.rating }),
        ...(filters.pais && { pais: filters.pais }),
      });
      const res = await fetch(`/api/admin/resenas?${params}`);
      const data = await res.json();
      if (data.exito) {
        setReviews(data.datos);
        setTotal(data.total);
        setPendientes(data.pendientes ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [pagina, filters]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Realtime pending count
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        loadReviews();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadReviews]);

  const handleAction = useCallback(async (id: string, accion: string, payload?: Record<string, unknown>) => {
    if (accion === 'eliminar') {
      await fetch(`/api/admin/resenas/${id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/admin/resenas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...payload }),
      });
    }
    await loadReviews();
    // Update selected review if open
    setSelectedReview(prev => {
      if (!prev || prev.id !== id) return prev;
      return null;
    });
  }, [loadReviews]);

  const totalPaginas = Math.ceil(total / 20);

  return (
    <AdminLayout title="Reseñas" subtitle="Moderación y gestión de reseñas de productos">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: total, color: 'text-sc-forest' },
          { label: 'Pendientes', value: pendientes, color: 'text-yellow-600' },
          { label: 'Aprobadas', value: reviews.filter(r => r.status === 'approved').length, color: 'text-green-600' },
          { label: 'Rechazadas', value: reviews.filter(r => r.status === 'rejected').length, color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-card p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar reseñas..."
            value={filters.busqueda}
            onChange={e => { setFilters(f => ({ ...f, busqueda: e.target.value })); setPagina(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
          />
          <select
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPagina(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobada</option>
            <option value="rejected">Rechazada</option>
            <option value="hidden">Oculta</option>
          </select>
          <select
            value={filters.rating}
            onChange={e => { setFilters(f => ({ ...f, rating: e.target.value })); setPagina(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
          >
            <option value="">Todas las calificaciones</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} estrellas</option>)}
          </select>
          <select
            value={filters.pais}
            onChange={e => { setFilters(f => ({ ...f, pais: e.target.value })); setPagina(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
          >
            <option value="">Todos los países</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="CR">🇨🇷 Costa Rica</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-sc-forest border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">No se encontraron reseñas</p>
            <p className="text-sm mt-1">Ajusta los filtros para ver más resultados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Autor</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Calificación</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map(review => {
                    const statusInfo = STATUS_CONFIG[review.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                    return (
                      <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-sc-forest truncate max-w-[160px]">{review.product_name ?? '—'}</p>
                          {review.title && <p className="text-xs text-gray-500 truncate max-w-[160px]">{review.title}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sc-forest">{review.reviewer_name ?? 'Anónimo'}</p>
                          <p className="text-xs text-gray-500">{review.country_code === 'CO' ? '🇨🇴' : review.country_code === 'CR' ? '🇨🇷' : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={review.rating} />
                            {review.is_verified && (
                              <span className="text-xs text-green-600 font-semibold">✓</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {review.is_featured && (
                            <span className="ml-1 text-xs text-amber-600">⭐</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {review.status !== 'approved' && (
                              <button
                                onClick={() => handleAction(review.id, 'moderar', { status: 'approved' })}
                                className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                title="Aprobar"
                              >
                                ✓
                              </button>
                            )}
                            {review.status !== 'rejected' && (
                              <button
                                onClick={() => handleAction(review.id, 'moderar', { status: 'rejected' })}
                                className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                                title="Rechazar"
                              >
                                ✕
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedReview(review)}
                              className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                              title="Ver detalle"
                            >
                              Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {total} reseñas · Página {pagina} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Anterior
                  </button>
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedReview && (
        <ReviewDetailDrawer
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onAction={handleAction}
        />
      )}
    </AdminLayout>
  );
}
