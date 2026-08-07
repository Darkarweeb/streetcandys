'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatPriceValue, FREE_SHIPPING_THRESHOLD, type Country } from '@/lib/price';
import { Spinner } from '@/components/ui/UXHelpers';

interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  image: string;
  unavailable?: boolean;
}

interface CartDrawerProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  items?: CartItem[];
  onUpdateQty?: (id: string, qty: number) => void;
  onCountChange?: (count: number) => void;
  onRemoveItem?: (id: string) => void;
  country?: string;
  coupon?: string;
}

// ─── Animated total value ─────────────────────────────────────────────────────
function AnimatedValue({ value, country }: { value: number; country: Country }) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 400);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`transition-all duration-300 ${flash ? 'animate-pulse-once text-sc-periwinkle' : ''}`}>
      {formatPriceValue(value, country)}
    </span>
  );
}

export default function CartDrawer({
  open,
  isOpen,
  onClose,
  items = [],
  onUpdateQty,
  onCountChange,
  onRemoveItem,
  country = 'CO',
  coupon,
}: CartDrawerProps) {
  const isDrawerOpen = open ?? isOpen ?? false;
  const router = useRouter();
  const activeCountry: Country = country === 'CR' ? 'CR' : 'CO';
  const threshold = FREE_SHIPPING_THRESHOLD[activeCountry];

  // ── Coupon state ─────────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  // Canonical cart ID resolved on drawer open — reused for all coupon operations
  const [drawerCarritoId, setDrawerCarritoId] = useState<string | null>(null);

  // Checkout button loading state
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // On mount and whenever the drawer opens, sync appliedCoupon from the cart API
  useEffect(() => {
    if (!isDrawerOpen) return;
    (async () => {
      try {
        const sessionId =
          typeof window !== 'undefined' ? (localStorage.getItem('sc_guest_session_id') ?? undefined) : undefined;
        const res = await fetch(`/api/carrito?pais=${activeCountry}`, {
          headers: sessionId ? { 'x-session-id': sessionId } : {},
        });
        const data = await res.json();
        if (data.exito && data.datos) {
          // Capture the canonical cart ID for all subsequent operations
          setDrawerCarritoId(data.datos.id ?? null);
          if (data.datos.cupon) {
            const cupon = data.datos.cupon;
            setAppliedCoupon({
              code: cupon.codigo,
              discount: cupon.descuento_calculado ?? 0,
              type: cupon.tipo_descuento ?? '',
            });
          } else {
            setAppliedCoupon(null);
          }
        } else {
          setAppliedCoupon(null);
        }
      } catch {
        // best-effort
      }
    })();
  }, [isDrawerOpen, activeCountry]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const sessionId =
        typeof window !== 'undefined' ? (localStorage.getItem('sc_guest_session_id') ?? undefined) : undefined;
      const res = await fetch('/api/carrito/cupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
        },
        body: JSON.stringify({
          codigo: code,
          pais: activeCountry,
          // Always pass the resolved cart ID so the API never needs to re-lookup
          ...(drawerCarritoId ? { carrito_id: drawerCarritoId } : {}),
        }),
      });
      const data = await res.json();
      if (!data.exito) {
        setCouponError(data.error ?? 'Cupón inválido. Verifica el código e intenta de nuevo.');
      } else {
        const cupon = data.datos?.cupon;
        const descuento =
          data.datos?.resumen?.descuento_cupon ??
          cupon?.descuento_calculado ??
          0;
        const tipo = cupon?.tipo_descuento ?? cupon?.discount_type ?? '';
        setAppliedCoupon({ code, discount: descuento, type: tipo });
        setCouponInput('');
        const successMsg =
          tipo === 'shipping' ?'Cupon aplicado! Tienes envio gratis en este pedido.'
            : `Cupon aplicado! Ahorraste ${formatPriceValue(descuento, activeCountry)}`;
        setCouponSuccess(successMsg);
        setTimeout(() => setCouponSuccess(null), 5000);
      }
    } catch {
      setCouponError('Error al aplicar el cupón. Intenta de nuevo.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const sessionId =
        typeof window !== 'undefined' ? (localStorage.getItem('sc_guest_session_id') ?? undefined) : undefined;
      await fetch(`/api/carrito/cupon?pais=${activeCountry}`, {
        method: 'DELETE',
        headers: sessionId ? { 'x-session-id': sessionId } : {},
      });
    } catch {
      // best-effort
    } finally {
      setAppliedCoupon(null);
      setCouponLoading(false);
    }
  };

  const availableItems = items.filter((i) => !i.unavailable);
  const unavailableItems = items.filter((i) => i.unavailable);

  const subtotal = availableItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    return sum + price * item.qty;
  }, 0);

  // Recalculate coupon discount whenever items or subtotal change
  useEffect(() => {
    if (!appliedCoupon) return;
    if (appliedCoupon.type === 'shipping') return;
    (async () => {
      try {
        const sessionId =
          typeof window !== 'undefined' ? (localStorage.getItem('sc_guest_session_id') ?? undefined) : undefined;
        const res = await fetch(`/api/carrito?pais=${activeCountry}`, {
          headers: sessionId ? { 'x-session-id': sessionId } : {},
        });
        const data = await res.json();
        if (data.exito && data.datos?.cupon) {
          const cupon = data.datos.cupon;
          setAppliedCoupon((prev) =>
            prev ? { ...prev, discount: cupon.descuento_calculado ?? 0 } : null,
          );
        } else if (data.exito && !data.datos?.cupon) {
          setAppliedCoupon(null);
        }
      } catch {
        // best-effort
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, activeCountry]);

  const couponDiscount = appliedCoupon?.type === 'shipping' ? 0 : (appliedCoupon?.discount ?? 0);
  const shippingFree =
    subtotal >= threshold || appliedCoupon?.type === 'shipping';
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);
  const finalTotal = Math.max(0, subtotal - couponDiscount);

  // Both Colombia and Costa Rica always go through Checkout.
  // The Cart Drawer NEVER opens WhatsApp directly.
  const handleCheckout = () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    onClose();
    router.push('/checkout');
  };

  const subtotalFormatted = formatPriceValue(subtotal, activeCountry);
  const remainingFormatted = formatPriceValue(remaining, activeCountry);

  return (
    <>
      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full h-[100dvh] w-full max-w-md bg-sc-cream z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sc-beige flex-shrink-0">
          <h3 className="text-sc-forest font-bold text-xl">Carrito</h3>
          <button
            onClick={onClose}
            className="text-sc-forest hover:opacity-60 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cerrar carrito"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Free shipping progress */}
        <div className="px-6 py-3 bg-sc-beige/50 flex-shrink-0">
          {shippingFree ? (
            <p className="text-sc-green text-xs font-bold mb-2">Envio gratis aplicado!</p>
          ) : (
            <p className="text-sc-forest text-xs font-medium mb-2">
              Agrega <strong>{remainingFormatted}</strong> más para obtener envío gratis
            </p>
          )}
          <div className="h-1.5 bg-sc-beige rounded-full overflow-hidden">
            <div
              className="h-full bg-sc-forest rounded-full transition-all duration-500"
              style={{ width: `${shippingFree ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-sc-beige">
                <path d="M8 8h6l9.6 38.4a4 4 0 004 3.2h28.8a4 4 0 003.84-2.88L56 24H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="28" cy="56" r="4" fill="currentColor"/>
                <circle cx="52" cy="56" r="4" fill="currentColor"/>
              </svg>
              <h2 className="text-sc-forest font-bold text-2xl">Carrito vacío</h2>
              <p className="text-sc-muted text-sm">Agrega productos de Street Candy para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unavailable items warning */}
              {unavailableItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-xs font-semibold mb-2">
                    Los siguientes productos no están disponibles en tu país:
                  </p>
                  {unavailableItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                      <span className="text-amber-700 text-xs truncate flex-1">{item.name}</span>
                      <span className="text-amber-600 text-xs italic mr-2">No disponible en tu país</span>
                      {onRemoveItem && (
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs underline flex-shrink-0 min-h-[44px] flex items-center"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Available items */}
              {availableItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-card overflow-hidden bg-sc-beige flex-shrink-0 relative">
                    <img
                      src={item.image}
                      alt={`${item.name} en el carrito`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/no_image.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sc-forest font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-sc-muted text-xs">{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onUpdateQty && onUpdateQty(item.id, item.qty - 1)}
                      className="w-9 h-9 rounded-full border border-sc-beige flex items-center justify-center text-sc-forest hover:bg-sc-beige active:scale-95 transition-all text-sm font-bold min-w-[36px] min-h-[36px]"
                      aria-label={`Reducir cantidad de ${item.name}`}
                    >
                      −
                    </button>
                    <span className="text-sc-forest font-semibold text-sm w-5 text-center" aria-live="polite">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty && onUpdateQty(item.id, item.qty + 1)}
                      className="w-9 h-9 rounded-full border border-sc-beige flex items-center justify-center text-sc-forest hover:bg-sc-beige active:scale-95 transition-all text-sm font-bold min-w-[36px] min-h-[36px]"
                      aria-label={`Aumentar cantidad de ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-sc-beige flex-shrink-0">
          {/* ── Coupon input ─────────────────────────────────────────────────── */}
          {availableItems.length > 0 && (
            <div className="mb-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-600 flex-shrink-0" aria-hidden="true">
                      <path d="M1 7l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-green-800 text-xs font-semibold font-mono">{appliedCoupon.code}</span>
                    {appliedCoupon.type === 'shipping' ? (
                      <span className="text-green-700 text-xs font-medium">Envío gratis</span>
                    ) : (
                      <span className="text-green-700 text-xs font-medium">
                        -{formatPriceValue(appliedCoupon.discount, activeCountry)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    className="text-sc-muted hover:text-red-500 transition-colors text-xs underline disabled:opacity-50 min-h-[44px] flex items-center"
                    aria-label="Quitar cupón"
                  >
                    {couponLoading ? <Spinner size={12} /> : 'Quitar'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                      setCouponSuccess(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="Código de cupón"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-sc-beige bg-white text-sc-forest text-sm placeholder-sc-muted focus:outline-none focus:ring-2 focus:ring-sc-forest/20 focus:border-sc-forest transition-all"
                    aria-label="Código de cupón"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2.5 bg-sc-forest text-sc-cream text-sm font-semibold rounded-xl hover:bg-sc-green active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    {couponLoading ? <Spinner size={14} className="text-sc-cream" /> : 'Aplicar'}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-red-600 text-xs mt-1.5 font-medium flex items-center gap-1" role="alert">
                  <span aria-hidden="true">!</span> {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className="text-green-700 text-xs mt-1.5 font-medium" role="status">{couponSuccess}</p>
              )}
            </div>
          )}

          {/* ── Totals ───────────────────────────────────────────────────────── */}
          {availableItems.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sc-forest text-sm">Subtotal</span>
                <span className="text-sc-forest font-semibold text-sm">
                  <AnimatedValue value={subtotal} country={activeCountry} />
                </span>
              </div>
              {appliedCoupon && appliedCoupon.type !== 'shipping' && couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-green-700 text-sm">Descuento ({appliedCoupon.code})</span>
                  <span className="text-green-700 font-semibold text-sm">
                    -<AnimatedValue value={couponDiscount} country={activeCountry} />
                  </span>
                </div>
              )}
              {appliedCoupon?.type === 'shipping' && (
                <div className="flex items-center justify-between">
                  <span className="text-green-700 text-sm">Envío ({appliedCoupon.code})</span>
                  <span className="text-green-700 font-semibold text-sm">Gratis</span>
                </div>
              )}
              {(appliedCoupon && couponDiscount > 0) && (
                <div className="flex items-center justify-between border-t border-sc-beige pt-2">
                  <span className="text-sc-forest font-bold text-sm">Total</span>
                  <span className="text-sc-forest font-bold">
                    <AnimatedValue value={finalTotal} country={activeCountry} />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Single CTA: always go to Checkout ───────────────────────────── */}
          {/* Both Colombia and Costa Rica use the same button. The only difference
              is the final action button INSIDE the Checkout page. */}
          <button
            onClick={items.length === 0 ? onClose : handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-sc-forest text-sc-cream font-bold py-4 rounded-pill hover:bg-sc-green active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-70"
          >
            {checkoutLoading ? (
              <Spinner size={18} className="text-sc-cream" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {checkoutLoading ? 'Cargando...' : items.length === 0 ? 'Continuar comprando' : 'Finalizar compra'}
          </button>

          <p className="text-sc-muted text-xs text-center mt-3">
            Debes ser mayor de edad para realizar compras.
          </p>
        </div>
      </div>
    </>
  );
}
