'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import type { OrderStatusPayload } from '@/hooks/useOrderRealtime';
import {
  ESTADO_LABELS,
  ESTADO_COLORS,
  PROGRESS_STEPS,
  getProgressIndex,
  isTerminalStatus,
} from '@/lib/order-status';
import type { OrdenCompleta } from '@/lib/payment/types';
import type { StatusHistoryItem } from '@/lib/payment/types';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp/message-builder';

// ─── Constants ────────────────────────────────────────────────────────────────
const BUSINESS_WHATSAPP = '573115397983';

// ─── Payment method labels ────────────────────────────────────
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Tarjeta de crédito / débito',
  nequi: 'Nequi',
  pse: 'PSE',
  bancolombia: 'Bancolombia',
  sinpe_movil: 'SINPE Móvil',
  stripe: 'Tarjeta de crédito / débito',
  bank_transfer: 'Transferencia bancaria',
};

// ─── Helpers ──────────────────────────────────────────────────
function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  try {
    return `${symbol}${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)}`;
  } catch {
    return `${symbol}${amount}`;
  }
}

function formatEstimatedTime(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins > 0 && diffMins <= 120) {
      return `~${diffMins} min`;
    }
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return null;
  }
}

// ─── Progress Tracker ─────────────────────────────────────────
function ProgressTracker({ status }: { status: string }) {
  const currentIdx = getProgressIndex(status);
  if (isTerminalStatus(status)) return null;

  return (
    <div className="bg-white border border-sc-beige rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-sc-forest font-semibold text-sm mb-5">Estado del pedido</h2>
      <div className="relative min-w-[280px]">
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
                    done ? 'bg-sc-forest text-sc-cream shadow-md' : 'bg-sc-beige text-sc-muted'
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

// ─── Main ─────────────────────────────────────────────────────
export default function OrdenConfirmadaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ordenId = params?.id as string;
  const numeroOrdenParam = searchParams?.get('numero') ?? '';

  const [mounted, setMounted] = useState(false);
  const [orden, setOrden] = useState<OrdenCompleta | null>(null);
  const [loading, setLoading] = useState(true);

  const { settings: waSettings } = useWhatsAppSettings();

  // ─── Load order ──────────────────────────────────────────
  const loadOrden = useCallback(async () => {
    if (!ordenId) return;
    try {
      const res = await fetch(`/api/ordenes/${ordenId}`);
      const data = await res.json();
      if (data.exito && data.datos) {
        setOrden(data.datos);
      }
    } catch {
      // silently fail — we still show static info from URL params
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    setMounted(true);
    loadOrden();
  }, [loadOrden]);

  // ─── Realtime status updates ──────────────────────────────
  const isActive = !!orden && !isTerminalStatus(orden.status) && orden.status !== 'delivered';

  useOrderRealtime({
    orderId: ordenId,
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

  // ─── Derived values ───────────────────────────────────────
  const numeroOrden = orden?.order_number || numeroOrdenParam || (ordenId ? `#${ordenId.slice(0, 8).toUpperCase()}` : '');
  const status = orden?.status ?? 'pending';
  const statusLabel = ESTADO_LABELS[status] || status;
  const statusColor = ESTADO_COLORS[status] || 'bg-gray-100 text-gray-700';
  const estimatedTime = formatEstimatedTime(orden?.estimated_delivery_time ?? null);
  const paymentMethod = orden?.payment_method
    ? (PAYMENT_METHOD_LABELS[orden.payment_method] ?? orden.payment_method)
    : null;
  const direccion = orden?.direccion_envio;
  const currency = orden?.currency_code ?? 'COP';

  // ─── WhatsApp fallback (shared builder) ───────────────────
  const handleWhatsApp = () => {
    const rawPhone = waSettings?.phone?.replace(/\D/g, '') || BUSINESS_WHATSAPP;
    const phoneNumber = rawPhone || BUSINESS_WHATSAPP;

    // Build full order message using the shared builder if order data is available
    if (orden) {
      const countryName = orden.country_code === 'CR' ? 'Costa Rica' : 'Colombia';
      const dir = orden.direccion_envio;
      const meta = orden.metadata ?? {};

      const waUrl = buildWhatsAppOrderUrl(phoneNumber, {
        orderNumber: numeroOrden,
        orderDate: orden.created_at,
        customerName:
          dir?.full_name ??
          (meta.nombre_cliente as string) ??
          '',
        phone:
          dir?.phone ??
          (meta.telefono as string) ??
          '',
        email:
          (meta.email_contacto as string) ??
          '',
        country: countryName,
        state:
          dir?.state_province ??
          (meta.departamento_provincia as string) ??
          '',
        city:
          dir?.city ??
          (meta.ciudad as string) ??
          '',
        address: dir?.address_line1
          ? `${dir.address_line1}${dir.address_line2 ? `, ${dir.address_line2}` : ''}`
          : (meta.direccion_linea1 as string)
            ? `${meta.direccion_linea1 as string}${meta.direccion_linea2 ? `, ${meta.direccion_linea2 as string}` : ''}`
            : '',
        deliveryMethod:
          (meta.metodo_entrega as string) ??
          'Envio estandar',
        shippingCost: orden.shipping_cost ?? 0,
        couponCode: orden.coupon_code_snapshot ?? null,
        discountAmount: orden.discount_amount ?? 0,
        subtotal: orden.subtotal ?? 0,
        tax: orden.tax_amount ?? 0,
        total: orden.total ?? 0,
        currency: orden.currency_code ?? 'COP',
        items: (orden.items ?? []).map((item) => ({
          name: item.product_name ?? (item as any).producto?.nombre ?? 'Producto',
          qty: item.quantity,
          price: String(item.unit_price ?? 0),
          unit_price: item.unit_price ?? 0,
        })),
        notes: orden.notes ?? null,
        paymentMethod: orden.payment_method ?? null,
        requirePaymentMethod: !!orden.payment_method,
      });

      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback: minimal message if order not loaded yet
      const msg = encodeURIComponent(
        `Hola, tengo una consulta sobre mi pedido ${numeroOrden} en Street Candy's.`
      );
      const url = `https://wa.me/${phoneNumber}?text=${msg}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-sc-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sc-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sc-cream flex flex-col overflow-x-hidden">
      <Navigation cartCount={0} onCartOpen={() => {}} onCountryChange={() => {}} country="CO" />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16" style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg w-full">
          {/* Success icon */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-sc-forest/10 flex items-center justify-center mx-auto mb-6">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <circle cx="22" cy="22" r="20" stroke="#163317" strokeWidth="2"/>
                <path d="M12 22l7 7 13-14" stroke="#163317" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-sc-forest font-black text-3xl lg:text-4xl tracking-tightest mb-3">
              ¡Pedido recibido!
            </h1>
            <p className="text-sc-muted text-base leading-relaxed">
              Gracias por tu compra en Street Candy&apos;s. Hemos recibido tu pedido y el equipo se comunicará contigo por WhatsApp para coordinar el pago y la entrega.
            </p>
          </div>

          {/* Order summary card */}
          <div className="bg-white border border-sc-beige rounded-2xl p-6 mb-5 space-y-4">
            {/* Order number */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sc-muted text-xs font-semibold uppercase tracking-widest mb-1">
                  Número de pedido
                </p>
                <p className="text-sc-forest font-black text-2xl font-mono tracking-wider">
                  {numeroOrden}
                </p>
              </div>
              {/* Status badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap mt-1 ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <div className="border-t border-sc-beige" />

            {/* Estimated prep time */}
            {(estimatedTime || loading) && (
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">&#x23F1;&#xFE0F;</span>
                <div>
                  <p className="text-sc-muted text-xs font-semibold uppercase tracking-widest">
                    Tiempo estimado
                  </p>
                  <p className="text-sc-forest font-semibold text-sm">
                    {loading ? '...' : estimatedTime}
                  </p>
                </div>
              </div>
            )}

            {/* Payment method */}
            {(paymentMethod || loading) && (
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">&#x1F4B3;</span>
                <div>
                  <p className="text-sc-muted text-xs font-semibold uppercase tracking-widest">
                    Método de pago
                  </p>
                  <p className="text-sc-forest font-semibold text-sm">
                    {loading ? '...' : paymentMethod}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery address */}
            {(direccion || loading) && (
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0" aria-hidden="true">&#x1F4CD;</span>
                <div>
                  <p className="text-sc-muted text-xs font-semibold uppercase tracking-widest">
                    Dirección de entrega
                  </p>
                  {loading ? (
                    <p className="text-sc-forest font-semibold text-sm">...</p>
                  ) : direccion ? (
                    <div className="text-sc-forest text-sm leading-relaxed">
                      <p className="font-semibold">{direccion.full_name}</p>
                      <p>{direccion.address_line1}{direccion.address_line2 ? `, ${direccion.address_line2}` : ''}</p>
                      <p>{direccion.city}, {direccion.state_province}</p>
                      {direccion.postal_code && <p>{direccion.postal_code}</p>}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Total */}
            {orden && (
              <>
                <div className="border-t border-sc-beige" />
                <div className="flex items-center justify-between">
                  <p className="text-sc-muted text-sm font-semibold">Total pagado</p>
                  <p className="text-sc-forest font-black text-lg">
                    {formatCurrency(orden.total, currency)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress tracker (realtime) */}
          {orden && !isTerminalStatus(status) && (
            <div className="mb-5">
              <ProgressTracker status={status} />
            </div>
          )}

          {/* WhatsApp payment coordination notice */}
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-4 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <p className="text-green-800 text-sm leading-relaxed">
              <strong>Pago por WhatsApp:</strong> El equipo de Street Candy&apos;s se comunicará contigo a través de WhatsApp para coordinar el pago y confirmar la entrega. Si el chat no se abrió automáticamente, usa el botón de abajo.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {/* Fallback WhatsApp button — uses shared builder with full order data */}
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-8 py-3.5 rounded-pill hover:bg-[#1ebe5d] transition-colors w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contactar por WhatsApp
            </button>

            {/* Track my order */}
            <Link
              href={`/cuenta/pedidos/${ordenId}`}
              className="inline-flex items-center justify-center gap-2 bg-sc-forest text-sc-cream font-bold px-8 py-3.5 rounded-pill hover:bg-sc-green transition-colors w-full text-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Rastrear mi pedido
            </Link>

            {/* Back to menu */}
            <Link
              href="/productos"
              className="inline-flex items-center justify-center gap-2 border border-sc-forest text-sc-forest font-bold px-8 py-3.5 rounded-pill hover:bg-sc-forest hover:text-sc-cream transition-colors w-full text-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Volver al menú
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
