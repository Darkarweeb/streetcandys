'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import type { EstadoOrden } from '@/lib/payment/types';
import {
  ESTADO_LABELS,
  ESTADO_COLORS,
  ALL_STATUSES,
} from '@/lib/order-status';

// ─── Types ───────────────────────────────────────────────────
interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Address {
  full_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province: string;
  postal_code?: string | null;
  country_code: string;
  phone?: string | null;
}

interface InternalNote {
  id: string;
  note: string;
  created_at: string;
  admin: { full_name: string; email: string } | null;
}

interface StatusHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
}

interface Order {
  id: string;
  order_number: string;
  profile_id: string | null;
  country_code: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  tax_rate_snapshot: number;
  total: number;
  currency_code: string;
  tracking_number: string | null;
  notes: string | null;
  coupon_code_snapshot: string | null;
  created_at: string;
  updated_at: string;
  status_history: StatusHistoryItem[];
  estimated_delivery_time: string | null;
  metadata: Record<string, unknown>;
  shipping_address?: Address | null;
  billing_address?: Address | null;
  profile?: { id: string; full_name: string; email: string; phone: string | null } | null;
  items?: OrderItem[];
  notas_internas?: InternalNote[];
}

// ─── Helpers ─────────────────────────────────────────────────
const PAGO_LABELS: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', failed: 'Fallido',
  refunded: 'Reembolsado', partially_refunded: 'Parcial',
};
const PAGO_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700', refunded: 'bg-gray-100 text-gray-700',
  partially_refunded: 'bg-orange-100 text-orange-700',
};
const METODO_LABELS: Record<string, string> = {
  stripe: 'Tarjeta (Stripe)', pse: 'PSE', nequi: 'Nequi',
  bancolombia: 'Bancolombia', sinpe_movil: 'SINPE Móvil', bank_transfer: 'Transferencia',
};
const PAIS_LABELS: Record<string, string> = { CO: 'Colombia', CR: 'Costa Rica' };

function formatCurrency(amount: number, currency: string) {
  if (currency === 'COP') return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)} COP`;
  if (currency === 'CRC') return `₡${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(amount)} CRC`;
  return `${amount}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Row Skeleton ─────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5,6,7].map(i => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>
      ))}
    </tr>
  );
}

// ─── Refund Modal ─────────────────────────────────────────────
function RefundModal({ orden, onClose, onConfirm, processing, error }: {
  orden: Order; onClose: () => void;
  onConfirm: (monto?: number, motivo?: string) => Promise<void>;
  processing: boolean; error: string | null;
}) {
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('requested_by_customer');

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sc-forest font-bold text-base">Procesar reembolso</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500">Pedido <span className="font-semibold text-sc-forest">#{orden.order_number}</span></p>
            <p className="text-gray-500 mt-0.5">Total: <span className="font-semibold text-sc-forest">{formatCurrency(orden.total, orden.currency_code)}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-2">Tipo</label>
            <div className="flex gap-3">
              {(['total', 'parcial'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${tipo === t ? 'bg-sc-forest text-white border-sc-forest' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {t === 'total' ? 'Total' : 'Parcial'}
                </button>
              ))}
            </div>
          </div>
          {tipo === 'parcial' && (
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Monto</label>
              <input type="number" value={monto} onChange={e => setMonto(e.target.value)} min="1" max={orden.total} step="0.01"
                placeholder={`Máx. ${orden.total}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Motivo</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
              <option value="requested_by_customer">Solicitado por el cliente</option>
              <option value="duplicate">Pedido duplicado</option>
              <option value="fraudulent">Fraude</option>
              <option value="product_not_received">Producto no recibido</option>
              <option value="product_unacceptable">Producto inaceptable</option>
            </select>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onConfirm(tipo === 'parcial' ? parseFloat(monto) : undefined, motivo)}
            disabled={processing || (tipo === 'parcial' && !monto)}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {processing && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
            {processing ? 'Procesando...' : 'Confirmar reembolso'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────
function OrderDrawer({ orden, onClose, onRefresh }: {
  orden: Order; onClose: () => void; onRefresh: () => void;
}) {
  const [fullOrder, setFullOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOrden>(orden.status as EstadoOrden);
  const [tracking, setTracking] = useState(orden.tracking_number || '');
  const [nota, setNota] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [savingNota, setSavingNota] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'detalles' | 'timeline' | 'notas'>('detalles');

  useEffect(() => {
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/admin/pedidos/${orden.id}`);
        const data = await res.json();
        if (data.exito) setFullOrder(data.datos);
      } catch {
        setFullOrder(orden);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [orden]);

  const o = fullOrder || orden;

  const handleStatusChange = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/ordenes/${o.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, numero_seguimiento: tracking || undefined, nota: nota || undefined }),
      });
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      onRefresh();
      setNota('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar este pedido?')) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/ordenes/${o.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'cancelled', nota: 'Cancelado por administrador' }),
      });
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      onRefresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (monto?: number, motivo?: string) => {
    setRefundProcessing(true); setRefundError(null);
    try {
      const res = await fetch(`/api/ordenes/${o.id}/reembolso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, motivo }),
      });
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      setShowRefund(false);
      onRefresh();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Error procesando reembolso');
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleAddNota = async () => {
    if (!notaInterna.trim()) return;
    setSavingNota(true);
    try {
      const res = await fetch(`/api/admin/pedidos/${o.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota: notaInterna }),
      });
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      setNotaInterna('');
      // Reload detail
      const res2 = await fetch(`/api/admin/pedidos/${o.id}`);
      const data2 = await res2.json();
      if (data2.exito) setFullOrder(data2.datos);
    } catch {
      // silent
    } finally {
      setSavingNota(false);
    }
  };

  const canRefund = o.payment_status === 'paid' && !['cancelled', 'refunded'].includes(o.status);
  const canCancel = !['cancelled', 'refunded', 'delivered'].includes(o.status);
  const history: StatusHistoryItem[] = Array.isArray(o.status_history) ? o.status_history : [];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-sc-forest font-bold text-lg">Pedido #{o.order_number}</h2>
            <p className="text-gray-400 text-xs">{formatDate(o.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && (
              <button onClick={handleCancel} disabled={saving}
                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60">
                Cancelar pedido
              </button>
            )}
            {canRefund && (
              <button onClick={() => setShowRefund(true)}
                className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors">
                Reembolsar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-gray-100 flex-shrink-0">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${ESTADO_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
            {ESTADO_LABELS[o.status] || o.status}
          </span>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${PAGO_COLORS[o.payment_status] || 'bg-gray-100 text-gray-600'}`}>
            Pago: {PAGO_LABELS[o.payment_status] || o.payment_status}
          </span>
          {o.payment_method && (
            <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700">
              {METODO_LABELS[o.payment_method] || o.payment_method}
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700">
            {PAIS_LABELS[o.country_code] || o.country_code}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-100 flex-shrink-0">
          {(['detalles', 'timeline', 'notas'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-sc-forest text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              {t === 'detalles' ? 'Detalles' : t === 'timeline' ? 'Timeline' : `Notas (${o.notas_internas?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loadingDetail && <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>}

          {!loadingDetail && activeTab === 'detalles' && (
            <>
              {/* Customer */}
              {o.profile && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sc-forest/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sc-forest text-sm font-bold uppercase">{o.profile.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sc-forest text-sm">{o.profile.full_name}</p>
                      <p className="text-gray-500 text-xs">{o.profile.email}</p>
                      {o.profile.phone && <p className="text-gray-500 text-xs">{o.profile.phone}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {o.shipping_address && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dirección de envío</p>
                  <p className="font-medium text-sc-forest text-sm">{o.shipping_address.full_name}</p>
                  <p className="text-gray-600 text-sm">{o.shipping_address.address_line1}</p>
                  {o.shipping_address.address_line2 && <p className="text-gray-600 text-sm">{o.shipping_address.address_line2}</p>}
                  <p className="text-gray-600 text-sm">{o.shipping_address.city}, {o.shipping_address.state_province} {o.shipping_address.postal_code}</p>
                  {o.shipping_address.phone && <p className="text-gray-500 text-xs mt-1">{o.shipping_address.phone}</p>}
                </div>
              )}

              {/* Products */}
              {o.items && o.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos</p>
                  <div className="space-y-2">
                    {o.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-sc-beige rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sc-forest text-xs font-bold">×{item.quantity}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sc-forest text-sm font-medium truncate">{item.product_name}</p>
                          {item.variant_name && <p className="text-gray-400 text-xs">{item.variant_name}</p>}
                          {item.sku_snapshot && <p className="text-gray-400 text-xs font-mono">SKU: {item.sku_snapshot}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sc-forest text-sm font-semibold">{formatCurrency(item.total_price, o.currency_code)}</p>
                          <p className="text-gray-400 text-xs">{formatCurrency(item.unit_price, o.currency_code)} c/u</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financials */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resumen financiero</p>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(o.subtotal, o.currency_code)}</span></div>
                {o.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Descuento</span><span className="text-green-600">-{formatCurrency(o.discount_amount, o.currency_code)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-600">Envío</span><span>{formatCurrency(o.shipping_cost, o.currency_code)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Impuesto ({(o.tax_rate_snapshot * 100).toFixed(0)}%)</span><span>{formatCurrency(o.tax_amount, o.currency_code)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-sc-forest">Total</span><span className="text-sc-forest">{formatCurrency(o.total, o.currency_code)}</span>
                </div>
                {o.coupon_code_snapshot && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-500">Cupón:</span>
                    <span className="text-xs bg-sc-beige text-sc-forest px-2 py-0.5 rounded font-mono">{o.coupon_code_snapshot}</span>
                  </div>
                )}
              </div>

              {/* Payment info */}
              {o.payment_reference && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Información de pago</p>
                  <p className="text-sm text-gray-600">Referencia: <span className="font-mono text-sc-forest">{o.payment_reference}</span></p>
                </div>
              )}

              {/* Update status */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizar estado</p>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Estado</label>
                  <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value as EstadoOrden)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                    {(ALL_STATUSES as readonly string[]).map(s => (
                      <option key={s} value={s}>{ESTADO_LABELS[s] || s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Número de seguimiento</label>
                  <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Ej: TRK123456789"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Nota (visible en notificación)</label>
                  <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Nota opcional para el cliente..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none" />
                </div>
                {saveError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{saveError}</div>}
                <button onClick={handleStatusChange} disabled={saving}
                  className="w-full py-2.5 bg-sc-forest hover:bg-sc-darkforest text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </>
          )}

          {!loadingDetail && activeTab === 'timeline' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Línea de tiempo del pedido</p>
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin historial de estados</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {[...history].reverse().map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${idx === 0 ? 'bg-sc-forest' : 'bg-gray-200'}`}>
                          <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                              {ESTADO_LABELS[item.status] || item.status}
                            </span>
                            <span className="text-gray-400 text-xs">{formatDate(item.timestamp)}</span>
                          </div>
                          {item.note && <p className="text-gray-500 text-xs mt-1 bg-gray-50 rounded px-2 py-1">{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loadingDetail && activeTab === 'notas' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas internas (solo admins)</p>
              <div className="space-y-2">
                <textarea value={notaInterna} onChange={e => setNotaInterna(e.target.value)} rows={3}
                  placeholder="Agregar nota interna..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none" />
                <button onClick={handleAddNota} disabled={savingNota || !notaInterna.trim()}
                  className="px-4 py-2 bg-sc-forest text-white rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2">
                  {savingNota && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
                  Agregar nota
                </button>
              </div>
              {(o.notas_internas || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin notas internas</p>
              ) : (
                <div className="space-y-3">
                  {(o.notas_internas || []).map(n => (
                    <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-700">{n.admin?.full_name || 'Admin'}</span>
                        <span className="text-xs text-gray-400">{formatDateShort(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showRefund && (
        <RefundModal orden={o} onClose={() => setShowRefund(false)} onConfirm={handleRefund}
          processing={refundProcessing} error={refundError} />
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminPedidosPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [ordenes, setOrdenes] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const POR_PAGINA = 20;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina), por_pagina: String(POR_PAGINA),
        ...(busqueda && { busqueda }),
        ...(filtroEstado && { estado: filtroEstado }),
        ...(filtroEstadoPago && { estado_pago: filtroEstadoPago }),
        ...(filtroPais && { pais: filtroPais }),
        ...(desde && { desde }),
        ...(hasta && { hasta }),
      });
      const res = await fetch(`/api/admin/pedidos?${params}`);
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      setOrdenes(data.datos || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda, filtroEstado, filtroEstadoPago, filtroPais, desde, hasta]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) fetchOrdenes();
  }, [profile, fetchOrdenes]);

  // Realtime subscription
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!profile || !['admin', 'staff'].includes(profile.role)) return;
    const channel = supabase.channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setRealtimeCount(c => c + 1);
        fetchOrdenes();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrdenes(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase, fetchOrdenes]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  if (authLoading) return <AdminLayout title="Pedidos"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Gestión de Pedidos" subtitle={`${total} pedidos en total`}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toast}</div>
      )}

      {realtimeCount > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">Actualizaciones en tiempo real activas</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por número de pedido..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
        </div>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos los estados</option>
          {(ALL_STATUSES as readonly string[]).map(s => <option key={s} value={s}>{ESTADO_LABELS[s] || s}</option>)}
        </select>
        <select value={filtroEstadoPago} onChange={e => { setFiltroEstadoPago(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos los pagos</option>
          {Object.entries(PAGO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroPais} onChange={e => { setFiltroPais(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos los países</option>
          <option value="CO">Colombia</option>
          <option value="CR">Costa Rica</option>
        </select>
        <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
        <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
        <span className="text-sm text-gray-500 ml-auto">{total} pedido(s)</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Pedido</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">País</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Pago</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : error ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500">{error}</td></tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
                        <path d="M6 6h36v36H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M14 18h20M14 24h20M14 30h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <p className="text-gray-500 font-medium">No se encontraron pedidos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ordenes.map(o => (
                  <tr key={o.id} onClick={() => setOrdenSeleccionada(o)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-sc-forest text-xs">#{o.order_number}</p>
                      {o.tracking_number && <p className="text-gray-400 text-xs mt-0.5">📦 {o.tracking_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {o.profile ? (
                        <div>
                          <p className="font-medium text-sc-forest">{o.profile.full_name}</p>
                          <p className="text-gray-400 text-xs">{o.profile.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Invitado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{PAIS_LABELS[o.country_code] || o.country_code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAGO_COLORS[o.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                        {PAGO_LABELS[o.payment_status] || o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sc-forest text-sm">{formatCurrency(o.total, o.currency_code)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateShort(o.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* Order Drawer */}
      {ordenSeleccionada && (
        <OrderDrawer
          orden={ordenSeleccionada}
          onClose={() => setOrdenSeleccionada(null)}
          onRefresh={() => { fetchOrdenes(); showToast('Pedido actualizado'); setOrdenSeleccionada(null); }}
        />
      )}
    </AdminLayout>
  );
}
