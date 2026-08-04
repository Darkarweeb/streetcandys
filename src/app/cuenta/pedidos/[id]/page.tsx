'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import type { OrdenCompleta } from '@/lib/payment/types';
import type { StatusHistoryItem } from '@/lib/payment/types';
import {
  ESTADO_LABELS,
  ESTADO_COLORS,
  PROGRESS_STEPS,
  getProgressIndex,
  isTerminalStatus,
} from '@/lib/order-status';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import type { OrderStatusPayload } from '@/hooks/useOrderRealtime';

// ─── Helpers ─────────────────────────────────────────────────
function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  return `${symbol}${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(dateStr));
}

function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(dateStr));
}

// ─── Skeleton ─────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-sc-beige rounded w-48" />
      <div className="bg-white border border-sc-border rounded-card p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-sc-beige rounded" style={{ width: `${60 + i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Progress Tracker ─────────────────────────────────────────
function ProgressTracker({ status }: { status: string }) {
  const currentIdx = getProgressIndex(status);

  return (
    <div className="bg-white border border-sc-border rounded-card p-6 overflow-x-auto">
      <h2 className="text-sc-forest font-semibold text-sm mb-5">Estado del pedido</h2>
      <div className="relative min-w-[280px]">
        {/* Background bar */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-sc-beige" aria-hidden="true">
          <div
            className="h-full bg-sc-forest transition-all duration-700"
            style={{
              width: currentIdx >= 0
                ? `${(currentIdx / (PROGRESS_STEPS.length - 1)) * 100}%`
                : '0%',
            }}
          />
        </div>
        <div className="relative flex justify-between">
          {PROGRESS_STEPS.map((step, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 z-10 ${
                    done
                      ? 'bg-sc-forest text-sc-cream shadow-md'
                      : 'bg-sc-beige text-sc-muted'
                  } ${active ? 'ring-2 ring-sc-forest ring-offset-2' : ''}`}
                >
                  {step.icon}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium text-center leading-tight ${done ? 'text-sc-forest' : 'text-sc-muted'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────
function StatusTimeline({ history }: { history: StatusHistoryItem[] }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="bg-white border border-sc-border rounded-card p-5">
      <h2 className="text-sc-forest font-semibold text-sm mb-4">Historial de estados</h2>
      <div className="space-y-3">
        {[...history].reverse().map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full mt-1 ${idx === 0 ? 'bg-sc-forest' : 'bg-gray-300'}`} />
              {idx < history.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[20px]" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                  {ESTADO_LABELS[item.status] || item.status}
                </span>
                <span className="text-sc-muted text-xs">{formatDateShort(item.timestamp)}</span>
              </div>
              {item.note && (
                <p className="text-sc-muted text-xs mt-1">{item.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function PedidoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [orden, setOrden] = useState<OrdenCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOrden = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ordenes/${id}`);
      const data = await res.json();
      if (!data.exito) throw new Error(data.error || 'Orden no encontrada');
      setOrden(data.datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrden(); }, [loadOrden]);

  // ─── Realtime subscription ────────────────────────────────
  // Replaces the previous 30-second polling interval.
  // Only subscribe once the order is loaded and while it is in an active state.
  const isActive = !!orden && !isTerminalStatus(orden.status) && orden.status !== 'delivered';

  useOrderRealtime({
    orderId: id,
    enabled: isActive,
    onUpdate: (payload: OrderStatusPayload) => {
      setOrden((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status as OrdenCompleta['status'],
          status_updated_at: payload.status_updated_at ?? prev.status_updated_at,
          estimated_delivery_time: payload.estimated_delivery_time ?? prev.estimated_delivery_time,
          tracking_number: payload.tracking_number ?? prev.tracking_number,
          status_history: Array.isArray(payload.status_history)
            ? (payload.status_history as StatusHistoryItem[])
            : prev.status_history,
        };
      });
    },
  });

  const handleCancel = async () => {
    if (!orden || !confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/ordenes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Cancelado por el cliente' }),
      });
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      router.push('/cuenta/pedidos');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error cancelando pedido');
    } finally {
      setCancelling(false);
    }
  };

  const isCancelled = orden?.status === 'cancelled' || orden?.status === 'refunded';
  const canCancel = orden && ['pending', 'confirmed'].includes(orden.status);
  const statusHistory: StatusHistoryItem[] = Array.isArray(orden?.status_history)
    ? (orden.status_history as StatusHistoryItem[])
    : [];

  return (
    <CuentaLayout>
      <div className="animate-fade-in overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-sc-muted mb-6">
          <Link href="/cuenta/pedidos" className="hover:text-sc-forest transition-colors">Mis Pedidos</Link>
          <span>/</span>
          <span className="text-sc-forest font-medium">
            {orden ? `#${orden.order_number}` : 'Detalle'}
          </span>
        </div>

        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-6 text-center">
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <Link href="/cuenta/pedidos" className="text-sc-periwinkle text-sm hover:underline">
              Volver a mis pedidos
            </Link>
          </div>
        ) : orden ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-sc-forest tracking-tight">
                  Pedido #{orden.order_number}
                </h1>
                <p className="text-sc-muted text-sm mt-1">{formatDate(orden.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const colorClass = ESTADO_COLORS[orden.status] || 'bg-gray-100 text-gray-700';
                  const label = ESTADO_LABELS[orden.status] || orden.status;
                  return (
                    <span className={`px-3 py-1 rounded-badge text-sm font-semibold ${colorClass}`}>
                      {label}
                    </span>
                  );
                })()}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-1.5 border border-red-300 text-red-600 rounded-pill text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
                  </button>
                )}
              </div>
            </div>

            {/* Last updated + ETA */}
            <div className="flex flex-wrap gap-3">
              {orden.status_updated_at && (
                <div className="flex items-center gap-2 bg-sc-beige/60 rounded-lg px-3 py-2">
                  <span className="text-sc-muted text-xs">🕐 Última actualización:</span>
                  <span className="text-sc-forest text-xs font-medium">{formatDateShort(orden.status_updated_at)}</span>
                </div>
              )}
              {orden.estimated_delivery_time && !isCancelled && (
                <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-green-600 text-xs">📦 Entrega estimada:</span>
                  <span className="text-green-700 text-xs font-medium">{formatDateShort(orden.estimated_delivery_time)}</span>
                </div>
              )}
            </div>

            {/* Progress tracker */}
            {!isCancelled && <ProgressTracker status={orden.status} />}

            {/* Cancelled banner */}
            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-card p-4 flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="text-red-700 font-semibold text-sm">
                    {orden.status === 'refunded' ? 'Pedido reembolsado' : 'Pedido cancelado'}
                  </p>
                  {orden.cancelled_at && (
                    <p className="text-red-500 text-xs mt-0.5">{formatDateShort(orden.cancelled_at)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Status history timeline */}
            {statusHistory.length > 0 && <StatusTimeline history={statusHistory} />}

            {/* Items */}
            <div className="bg-white border border-sc-border rounded-card overflow-hidden">
              <div className="px-5 py-4 border-b border-sc-border">
                <h2 className="text-sc-forest font-semibold text-sm">Productos</h2>
              </div>
              <div className="divide-y divide-sc-border">
                {orden.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-14 h-14 rounded-sm2 bg-sc-beige flex-shrink-0 overflow-hidden">
                      {item.producto?.thumbnail_url ? (
                        <img
                          src={item.producto.thumbnail_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sc-muted text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sc-forest text-sm font-medium truncate">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sc-muted text-xs">{item.variant_name}</p>
                      )}
                      <p className="text-sc-muted text-xs mt-0.5">Cantidad: {item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sc-forest text-sm font-semibold">
                        {formatCurrency(item.total_price, orden.currency_code)}
                      </p>
                      <p className="text-sc-muted text-xs">
                        {formatCurrency(item.unit_price, orden.currency_code)} c/u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice summary + address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Invoice */}
              <div className="bg-white border border-sc-border rounded-card p-5">
                <h2 className="text-sc-forest font-semibold text-sm mb-4">Resumen de factura</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-sc-muted">Subtotal</span>
                    <span className="text-sc-forest">{formatCurrency(orden.subtotal, orden.currency_code)}</span>
                  </div>
                  {orden.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sc-muted">Descuento</span>
                      <span className="text-green-600">-{formatCurrency(orden.discount_amount, orden.currency_code)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sc-muted">Envío</span>
                    <span className="text-sc-forest">
                      {orden.shipping_cost === 0 ? 'Gratis' : formatCurrency(orden.shipping_cost, orden.currency_code)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sc-muted">IVA ({Math.round(orden.tax_rate_snapshot * 100)}%)</span>
                    <span className="text-sc-forest">{formatCurrency(orden.tax_amount, orden.currency_code)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-sc-border font-semibold">
                    <span className="text-sc-forest">Total</span>
                    <span className="text-sc-forest text-base">{formatCurrency(orden.total, orden.currency_code)}</span>
                  </div>
                </div>
                {orden.coupon_code_snapshot && (
                  <div className="mt-3 px-3 py-2 bg-green-50 rounded-sm2 text-xs text-green-700">
                    Cupón aplicado: <span className="font-mono font-semibold">{orden.coupon_code_snapshot}</span>
                  </div>
                )}
              </div>

              {/* Shipping address */}
              {orden.direccion_envio && (
                <div className="bg-white border border-sc-border rounded-card p-5">
                  <h2 className="text-sc-forest font-semibold text-sm mb-4">Dirección de envío</h2>
                  <div className="text-sm text-sc-muted space-y-1">
                    <p className="text-sc-forest font-medium">{orden.direccion_envio.full_name}</p>
                    <p>{orden.direccion_envio.address_line1}</p>
                    {orden.direccion_envio.address_line2 && <p>{orden.direccion_envio.address_line2}</p>}
                    <p>{orden.direccion_envio.city}, {orden.direccion_envio.state_province}</p>
                    {orden.direccion_envio.postal_code && <p>{orden.direccion_envio.postal_code}</p>}
                    {orden.direccion_envio.phone && <p>{orden.direccion_envio.phone}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Tracking number */}
            {orden.tracking_number && (
              <div className="bg-sc-beige/50 border border-sc-border rounded-card p-4 flex items-center gap-3">
                <span className="text-xl">🚚</span>
                <div>
                  <p className="text-sc-forest text-sm font-semibold">Número de seguimiento</p>
                  <p className="font-mono text-sc-forest text-sm">{orden.tracking_number}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </CuentaLayout>
  );
}
