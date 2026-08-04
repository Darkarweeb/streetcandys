'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { ESTADO_LABELS, ESTADO_COLORS } from '@/lib/order-status';

interface Orden {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency_code: string;
  created_at: string;
  status_updated_at?: string | null;
  items_count?: number;
}

interface Paginacion {
  pagina_actual: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  const formatted = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount);
  return `${symbol}${formatted}`;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(dateStr));
}

function OrderRowSkeleton() {
  return (
    <div className="px-5 py-4 animate-pulse flex items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-sc-beige rounded w-28" />
        <div className="h-3 bg-sc-beige rounded w-20" />
      </div>
      <div className="h-6 bg-sc-beige rounded w-20" />
      <div className="h-5 bg-sc-beige rounded w-16" />
    </div>
  );
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [pagination, setPagination] = useState<Paginacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ordenes?pagina=${p}&por_pagina=10`);
      const data = await res.json();
      if (!data.exito) throw new Error(data.error || 'Error cargando pedidos');
      setOrders(data.datos || []);
      setPagination(data.paginacion || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);

  return (
    <CuentaLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Mis Pedidos</h1>
          <p className="text-sc-muted text-sm mt-1">Historial completo de tus compras</p>
        </div>

        <div className="bg-white border border-sc-border rounded-card overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-sc-beige/50 border-b border-sc-border text-xs font-semibold text-sc-muted uppercase tracking-wide">
            <span>Pedido</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Total</span>
            <span />
          </div>

          {loading ? (
            <div className="divide-y divide-sc-border">
              {[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button
                onClick={() => loadOrders(page)}
                className="text-sc-periwinkle text-sm font-medium hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-sc-forest font-semibold text-lg mb-2">Aún no tienes pedidos</p>
              <p className="text-sc-muted text-sm mb-6">Cuando realices tu primera compra, aparecerá aquí.</p>
              <Link
                href="/productos"
                className="inline-block bg-sc-forest text-sc-cream px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors"
              >
                Explorar productos
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-sc-border">
              {orders.map((orden) => {
                const colorClass = ESTADO_COLORS[orden.status] || 'bg-gray-100 text-gray-700';
                const label = ESTADO_LABELS[orden.status] || orden.status;
                return (
                  <Link
                    key={orden.id}
                    href={`/cuenta/pedidos/${orden.id}`}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center gap-2 sm:gap-4 px-5 py-4 hover:bg-sc-tan transition-colors"
                  >
                    <div>
                      <p className="text-sc-forest text-sm font-semibold">#{orden.order_number}</p>
                      {orden.status_updated_at && (
                        <p className="text-sc-muted text-xs">
                          Actualizado: {formatDate(orden.status_updated_at)}
                        </p>
                      )}
                    </div>
                    <p className="text-sc-muted text-xs">{formatDate(orden.created_at)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-badge text-xs font-medium w-fit ${colorClass}`}>
                      {label}
                    </span>
                    <p className="text-sc-forest text-sm font-semibold">
                      {formatCurrency(orden.total, orden.currency_code)}
                    </p>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sc-muted hidden sm:block">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_paginas > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-sc-border">
              <p className="text-sc-muted text-xs">
                Mostrando {((pagination.pagina_actual - 1) * pagination.por_pagina) + 1}–
                {Math.min(pagination.pagina_actual * pagination.por_pagina, pagination.total)} de {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.pagina_actual <= 1}
                  className="px-3 py-1.5 text-xs font-medium border border-sc-border rounded-sm2 text-sc-forest hover:bg-sc-beige transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.total_paginas, p + 1))}
                  disabled={pagination.pagina_actual >= pagination.total_paginas}
                  className="px-3 py-1.5 text-xs font-medium border border-sc-border rounded-sm2 text-sc-forest hover:bg-sc-beige transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CuentaLayout>
  );
}
