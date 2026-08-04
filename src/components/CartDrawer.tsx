'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { formatPriceValue, FREE_SHIPPING_THRESHOLD, type Country } from '@/lib/price';

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

function buildWhatsAppMessage(
  items: CartItem[],
  subtotal: number,
  country: Country,
  coupon?: string,
): string {
  const countryLabel = country === 'CR' ? '🇨🇷 Costa Rica' : '🇨🇴 Colombia';
  const threshold = FREE_SHIPPING_THRESHOLD[country];

  const lines = items
    .filter((item) => !item.unavailable)
    .map((item) => {
      const unitPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      const lineTotal = unitPrice * item.qty;
      return `• ${item.name} × ${item.qty} = ${formatPriceValue(lineTotal, country)}`;
    })
    .join('\n');

  const totalFormatted = formatPriceValue(subtotal, country);
  const shippingNote =
    subtotal >= threshold ? '🚚 Envío gratis' : '🚚 Envío por calcular';
  const couponLine = coupon ? `\n🏷️ Cupón aplicado: ${coupon}` : '';

  return (
    `Hola 👋, quiero finalizar mi pedido en Street Candy:\n\n` +
    `🌍 País: ${countryLabel}\n\n` +
    `🛒 Productos:\n${lines}` +
    couponLine +
    `\n\n${shippingNote}` +
    `\n💰 Total: ${totalFormatted}` +
    `\n\n💳 Pago con cripto (BTC, ETH, USDT, USDC) disponible bajo solicitud por este chat.`
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
  const { settings, loading: waLoading } = useWhatsAppSettings();
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

  // On mount and whenever the drawer opens, sync appliedCoupon from the cart API
  // so it reflects server-side state (not just local state)
  useEffect(() => {
    if (!isDrawerOpen) return;
    (async () => {
      try {
        const res = await fetch(`/api/carrito?pais=${activeCountry}`);
        const data = await res.json();
        if (data.exito && data.datos?.cupon) {
          const cupon = data.datos.cupon;
          setAppliedCoupon({
            code: cupon.codigo,
            discount: cupon.descuento_calculado ?? 0,
            type: cupon.tipo_descuento ?? '',
          });
        } else {
          setAppliedCoupon(null);
        }
      } catch {
        // best-effort — leave existing state if fetch fails
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
      const res = await fetch('/api/carrito/cupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: code, pais: activeCountry }),
      });
      const data = await res.json();
      if (!data.exito) {
        setCouponError(data.error ?? 'Cupón inválido.');
      } else {
        const cupon = data.datos?.cupon;
        const descuento = data.datos?.resumen?.descuento_cupon ?? 0;
        const tipo = cupon?.tipo_descuento ?? cupon?.discount_type ?? '';
        setAppliedCoupon({ code, discount: descuento, type: tipo });
        setCouponInput('');
        setCouponSuccess(
          tipo === 'shipping' ?'¡Cupón aplicado! Envío gratis en tu pedido.'
            : `¡Cupón aplicado! Descuento: ${formatPriceValue(descuento, activeCountry)}`,
        );
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
      await fetch(`/api/carrito/cupon?pais=${activeCountry}`, { method: 'DELETE' });
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
    // Re-fetch cart to get accurate server-side discount for current items
    (async () => {
      try {
        const res = await fetch(`/api/carrito?pais=${activeCountry}`);
        const data = await res.json();
        if (data.exito && data.datos?.cupon) {
          const cupon = data.datos.cupon;
          setAppliedCoupon((prev) =>
            prev ? { ...prev, discount: cupon.descuento_calculado ?? 0 } : null,
          );
        } else if (data.exito && !data.datos?.cupon) {
          // Coupon was removed server-side
          setAppliedCoupon(null);
        }
      } catch {
        // best-effort
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, activeCountry]);

  // Apply coupon discount to totals display
  const couponDiscount = appliedCoupon?.type === 'shipping' ? 0 : (appliedCoupon?.discount ?? 0);
  const shippingFree =
    subtotal >= threshold || appliedCoupon?.type === 'shipping';
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);

  const showWhatsApp =
    !waLoading &&
    settings.checkout_via_whatsapp_enabled &&
    settings.phone.trim() !== '' &&
    availableItems.length > 0;

  const handleWhatsAppCheckout = () => {
    const message = buildWhatsAppMessage(availableItems, subtotal, activeCountry, appliedCoupon?.code ?? coupon);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${settings.phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
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
            <p className="text-sc-green text-xs font-bold mb-2">✓ ¡Tienes envío gratis!</p>
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
              <h2 className="text-sc-forest font-bold text-2xl">¡Carrito vacío!</h2>
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
                          className="text-red-500 hover:text-red-700 text-xs underline flex-shrink-0"
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
                  <div className="w-16 h-16 rounded-card overflow-hidden bg-sc-beige flex-shrink-0">
                    <img
                      src={item.image}
                      alt={`${item.name} product thumbnail in cart`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sc-forest font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-sc-muted text-xs">{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onUpdateQty && onUpdateQty(item.id, item.qty - 1)}
                      className="w-9 h-9 rounded-full border border-sc-beige flex items-center justify-center text-sc-forest hover:bg-sc-beige transition-colors text-sm font-bold min-w-[36px] min-h-[36px]"
                      aria-label={`Reducir cantidad de ${item.name}`}
                    >
                      -
                    </button>
                    <span className="text-sc-forest font-semibold text-sm w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty && onUpdateQty(item.id, item.qty + 1)}
                      className="w-9 h-9 rounded-full border border-sc-beige flex items-center justify-center text-sc-forest hover:bg-sc-beige transition-colors text-sm font-bold min-w-[36px] min-h-[36px]"
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
                <div className="flex items-center justify-between bg-sc-beige/60 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-green flex-shrink-0" aria-hidden="true">
                      <path d="M1 7l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sc-forest text-xs font-semibold font-mono">{appliedCoupon.code}</span>
                    {appliedCoupon.type === 'shipping' ? (
                      <span className="text-sc-green text-xs font-medium">Envío gratis</span>
                    ) : (
                      <span className="text-sc-green text-xs font-medium">
                        −{formatPriceValue(appliedCoupon.discount, activeCountry)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    className="text-sc-muted hover:text-red-500 transition-colors text-xs underline disabled:opacity-50"
                    aria-label="Quitar cupón"
                  >
                    Quitar
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
                    className="px-4 py-2.5 bg-sc-forest text-sc-cream text-sm font-semibold rounded-xl hover:bg-sc-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 min-h-[44px]"
                  >
                    {couponLoading ? (
                      <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin inline-block" aria-hidden="true" />
                    ) : (
                      'Aplicar'
                    )}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-red-500 text-xs mt-1.5 font-medium" role="alert">{couponError}</p>
              )}
              {couponSuccess && !appliedCoupon && (
                <p className="text-sc-green text-xs mt-1.5 font-medium">{couponSuccess}</p>
              )}
            </div>
          )}

          {/* ── Totals ───────────────────────────────────────────────────────── */}
          {availableItems.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sc-forest font-semibold">Subtotal</span>
                <span className="text-sc-forest font-bold">{subtotalFormatted}</span>
              </div>
              {appliedCoupon && appliedCoupon.type !== 'shipping' && couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sc-green text-sm">Descuento ({appliedCoupon.code})</span>
                  <span className="text-sc-green font-semibold text-sm">
                    −{formatPriceValue(couponDiscount, activeCountry)}
                  </span>
                </div>
              )}
              {appliedCoupon?.type === 'shipping' && (
                <div className="flex items-center justify-between">
                  <span className="text-sc-green text-sm">Envío ({appliedCoupon.code})</span>
                  <span className="text-sc-green font-semibold text-sm">Gratis 🎉</span>
                </div>
              )}
            </div>
          )}

          {activeCountry === 'CR' ? (
            <>
              {showWhatsApp && (
                <>
                  <p className="text-sc-muted text-xs text-center mb-3 leading-snug">
                    Pago con tarjeta disponible próximamente en Costa Rica — finaliza tu pedido por WhatsApp 👇
                  </p>
                  <button
                    onClick={handleWhatsAppCheckout}
                    className="w-full bg-sc-forest text-sc-cream font-bold py-4 rounded-pill hover:bg-sc-green transition-colors duration-200 flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Finalizar pedido por WhatsApp
                  </button>
                </>
              )}
              {!showWhatsApp && items.length > 0 && (
                <p className="text-sc-muted text-xs text-center leading-snug">
                  Pago con tarjeta disponible próximamente en Costa Rica — finaliza tu pedido por WhatsApp 👇
                </p>
              )}
              {items.length === 0 && (
                <button
                  onClick={onClose}
                  className="w-full bg-sc-forest text-sc-cream font-bold py-4 rounded-pill hover:bg-sc-green transition-colors duration-200 flex items-center justify-center gap-2 min-h-[52px]"
                >
                  Continuar comprando
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onClose();
                  router.push('/checkout');
                }}
                className="w-full bg-sc-forest text-sc-cream font-bold py-4 rounded-pill hover:bg-sc-green transition-colors duration-200 flex items-center justify-center gap-2 min-h-[52px]"
              >
                {items.length === 0 ? 'Continuar comprando' : 'Finalizar compra'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {showWhatsApp && (
                <button
                  onClick={handleWhatsAppCheckout}
                  className="mt-3 w-full border border-sc-forest text-sc-forest font-semibold py-3 rounded-pill hover:bg-sc-forest hover:text-sc-cream transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Finalizar pedido por WhatsApp
                </button>
              )}
            </>
          )}

          <p className="text-sc-muted text-xs text-center mt-3">
            Debes ser mayor de edad para realizar compras.
          </p>
        </div>
      </div>
    </>
  );
}
