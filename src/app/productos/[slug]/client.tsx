'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

import AnnouncementBar from '@/components/AnnouncementBar';
import Navigation from '@/components/Navigation';
import Breadcrumbs from '@/components/catalog/Breadcrumbs';
import CatalogProductCard from '@/components/catalog/CatalogProductCard';
import { ErrorState } from '@/components/catalog/CatalogStates';
import type { ProductWithDetails, ProductSummary } from '@/lib/products/types';
import { formatPriceValue, type Country } from '@/lib/price';
import ProductReviewsSection from '@/components/ProductReviewsSection';

const COUNTRY_KEY = 'sc_country';
const SESSION_KEY = 'sc_guest_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    sid = `sc_guest_${ts}_${rand}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="bg-sc-darkforest h-64 animate-pulse" aria-hidden="true" />,
  ssr: false,
});
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  image: string;
  product_id?: string;
  variant_id?: string | null;
}

// Extended variant type with presentation fields
interface PresentacionVariant {
  id: string;
  name: string;
  value: string;
  weight_label?: string | null;
  price_cop?: number | null;
  price_crc?: number | null;
  price_modifier: number;
  is_active: boolean;
  is_in_stock?: boolean;
  sort_order: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 animate-pulse">
      <div className="h-4 bg-sc-beige rounded w-48 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        <div>
          <div className="aspect-square rounded-card bg-sc-beige mb-4" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square rounded-sm2 bg-sc-beige" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 bg-sc-beige rounded w-1/3" />
          <div className="h-8 bg-sc-beige rounded w-3/4" />
          <div className="h-4 bg-sc-beige rounded w-1/2" />
          <div className="h-10 bg-sc-beige rounded w-1/3" />
          <div className="h-24 bg-sc-beige rounded" />
          <div className="h-12 bg-sc-beige rounded-pill" />
        </div>
      </div>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size} height={size}
          viewBox="0 0 12 12"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1"
          className="text-amber-400"
          aria-hidden="true"
        >
          <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Intensity Indicator ──────────────────────────────────────────────────────

function IntensityIndicator({ level }: { level: number }) {
  const labels = ['', 'Suave', 'Ligero', 'Moderado', 'Fuerte', 'Intenso'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 items-end" aria-label={`Intensidad ${labels[level] ?? level} de 5`}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-2.5 rounded-sm transition-all ${bar <= level ? 'bg-sc-forest' : 'bg-sc-border'}`}
            style={{ height: `${8 + bar * 4}px` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-sm font-medium text-sc-forest">{labels[level] ?? level}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductSummary[]>([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [country, setCountry] = useState<Country>('CO');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [presentationError, setPresentationError] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const { settings: waSettings, loading: waLoading } = useWhatsAppSettings();

  // Read country from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = localStorage.getItem(COUNTRY_KEY);
    if (stored === 'CR' || stored === 'CO') setCountry(stored as Country);
    const handler = (e: StorageEvent) => {
      if (e.key === COUNTRY_KEY && (e.newValue === 'CR' || e.newValue === 'CO')) {
        setCountry(e.newValue as Country);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Load product data
  useEffect(() => {
    if (!slug) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        const [productRes, relatedRes, reviewsRes] = await Promise.all([
          fetch(`/api/productos/${slug}`),
          fetch(`/api/productos/${slug}/relacionados`),
          fetch(`/api/productos/${slug}/resenas`),
        ]);

        if (!productRes.ok) throw new Error('Producto no encontrado');

        const productData = await productRes.json();
        const relatedData = await relatedRes.json();
        const reviewsData = await reviewsRes.json();

        const loadedProduct: ProductWithDetails = productData.datos;
        setProduct(loadedProduct);

        // For products with presentations: do NOT pre-select — require explicit choice
        // For products without presentations: no variant needed
        const activePresentations = (loadedProduct.variants || []).filter(
          (v) => v.is_active !== false
        );
        if (activePresentations.length > 0) {
          // Don't pre-select — customer must choose
          setSelectedVariantId(null);
        }

        setRelatedProducts(relatedData.datos || []);
        if (reviewsData.exito) {
          setReviews(reviewsData.datos?.reviews || []);
          setReviewsSummary(reviewsData.datos?.summary || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el producto');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;

    // If product has active presentations, a selection is required
    const activePresentations = (product.variants || []).filter((v) => v.is_active !== false);
    if (activePresentations.length > 0 && !selectedVariantId) {
      setPresentationError(true);
      return;
    }
    setPresentationError(false);

    try {
      const sessionId = getOrCreateSessionId();
      const response = await fetch('/api/carrito/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          producto_id: product.id,
          cantidad: quantity,
          pais: country,
          ...(selectedVariantId ? { variante_id: selectedVariantId } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const carritoItems = data.datos?.items ?? [];
        const mapped: CartItem[] = carritoItems.map((item: {
          id: string;
          product_id?: string;
          variant_id?: string | null;
          producto?: { nombre?: string; thumbnail_url?: string | null };
          precio_unitario: number;
          cantidad: number;
        }) => ({
          id: item.id,
          product_id: item.product_id ?? product.id,
          variant_id: item.variant_id ?? null,
          name: item.producto?.nombre ?? '',
          price: String(item.precio_unitario),
          qty: item.cantidad,
          image: item.producto?.thumbnail_url ?? '',
        }));
        setCartItems(mapped);
        setCartOpen(true);
        setQuantity(1);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  if (loading) return <ProductDetailSkeleton />;
  if (error || !product) return <ErrorState message={error || 'Producto no encontrado'} />;

  const mainImage = product.images?.[selectedImage]?.url || product.images?.[0]?.url || product.thumbnail_url;
  const mainAlt = product.images?.[selectedImage]?.alt || product.images?.[0]?.alt || product.name;

  // Determine if product has active presentations
  const activePresentations = (product.variants || []).filter(
    (v) => v.is_active !== false
  ) as PresentacionVariant[];
  const hasPresentations = activePresentations.length > 0;

  // Find selected presentation
  const selectedPresentation = hasPresentations && selectedVariantId
    ? activePresentations.find((v) => v.id === selectedVariantId) ?? null
    : null;

  // Resolve displayed price
  let priceStr: string;
  if (hasPresentations) {
    if (!selectedPresentation) {
      priceStr = 'Selecciona una presentación';
    } else {
      const variantPrice = country === 'CR'
        ? selectedPresentation.price_crc
        : selectedPresentation.price_cop;
      if (variantPrice != null) {
        priceStr = formatPriceValue(variantPrice, country);
      } else {
        priceStr = 'Precio no disponible';
      }
    }
  } else {
    // No presentations — use product-level price
    priceStr = country === 'CR'
      ? (product.price_crc != null ? formatPriceValue(product.price_crc, 'CR') : 'Precio no disponible')
      : (product.price_cop != null ? formatPriceValue(product.price_cop, 'CO') : 'Precio no disponible');
  }

  const hasDiscount = product.compare_at_price && product.compare_at_price > (product.price_cop ?? 0);
  const discountPct = hasDiscount ? Math.round((1 - (product.price_cop ?? 0) / product.compare_at_price!) * 100) : 0;
  const comparePriceStr = hasDiscount && country === 'CO' && !hasPresentations
    ? formatPriceValue(product.compare_at_price!, 'CO')
    : null;

  // Stock: if presentation selected, check its stock; otherwise product stock
  const inStock = selectedPresentation
    ? selectedPresentation.is_in_stock !== false
    : !hasPresentations
      ? product.inventory_status?.is_in_stock !== false
      : true; // no selection yet — don't show out of stock

  // WhatsApp message
  const buildWaMessage = () => {
    const productUrl = `${window.location.origin}/productos/${slug}`;
    const presentationInfo = selectedPresentation
      ? ` — ${selectedPresentation.name}${selectedPresentation.weight_label ? ' · ' + selectedPresentation.weight_label : ''}`
      : '';
    return (
      `Hola 👋, quiero comprar:\n\n🍬 *${product.name}*${presentationInfo}\n📦 Cantidad: ${quantity}\n💰 Precio unitario: ${priceStr}\n\n🔗 ${productUrl}` +
      `\n\n💳 Pago con cripto (BTC, ETH, USDT, USDC) disponible bajo solicitud por este chat.`
    );
  };

  return (
    <>
      <Navigation cartCount={cartItems.length} onCartOpen={() => setCartOpen(true)} />
      <AnnouncementBar />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} />

      <main className="min-h-screen bg-sc-cream overflow-x-hidden">
        {/* Breadcrumbs */}
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
          <Breadcrumbs
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'Productos', href: '/productos' },
              { label: product.name, href: `/productos/${slug}` },
            ]}
          />
        </div>

        {/* Product Detail */}
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Images */}
            <div>
              <div className="rounded-card overflow-hidden mb-4 bg-sc-beige aspect-square">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={mainAlt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-sc-border">
                      <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M16 32l8-10 6 7 4-5 6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`rounded-sm2 overflow-hidden aspect-square border-2 transition-all min-h-[44px] ${
                        selectedImage === idx ? 'border-sc-forest' : 'border-sc-border'
                      }`}
                      aria-label={`Ver imagen ${idx + 1}`}
                      aria-pressed={selectedImage === idx}
                    >
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {/* Category */}
              {(product as ProductWithDetails & { category_name?: string }).category_name && (
                <span className="text-xs font-semibold text-sc-periwinkle uppercase tracking-widest mb-3">
                  {(product as ProductWithDetails & { category_name?: string }).category_name}
                </span>
              )}

              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-black tracking-tightest text-sc-forest mb-4">
                {product.name}
              </h1>

              {/* Rating */}
              {reviewsSummary && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating rating={(reviewsSummary as { average_rating: number }).average_rating} />
                  <span className="text-sm text-sc-muted">
                    {(reviewsSummary as { total_reviews: number }).total_reviews} reseñas
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className={`text-3xl font-black ${priceStr === 'Selecciona una presentación' ? 'text-sc-muted text-xl' : 'text-sc-forest'}`}>
                  {priceStr}
                </span>
                {comparePriceStr && (
                  <>
                    <span className="text-lg text-sc-muted line-through">
                      {comparePriceStr}
                    </span>
                    <span className="text-sm font-bold text-sc-periwinkle bg-sc-periwinkle/10 px-2 py-1 rounded-full">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status */}
              {!hasPresentations && (
                <div className="mb-6">
                  {inStock ? (
                    <span className="text-sm font-semibold text-green-600">En stock</span>
                  ) : (
                    <span className="text-sm font-semibold text-red-600">Agotado</span>
                  )}
                </div>
              )}

              {/* Presentation Selector */}
              {hasPresentations && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-sc-forest mb-3">
                    Selecciona una presentación
                  </p>
                  <div className="space-y-2">
                    {activePresentations.map((v) => {
                      const isSelected = v.id === selectedVariantId;
                      const outOfStock = v.is_in_stock === false;
                      const variantPrice = country === 'CR' ? v.price_crc : v.price_cop;
                      const variantPriceStr = variantPrice != null
                        ? formatPriceValue(variantPrice, country)
                        : 'Precio no disponible';

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            if (!outOfStock) {
                              setSelectedVariantId(v.id);
                              setPresentationError(false);
                            }
                          }}
                          disabled={outOfStock}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-sc-forest bg-sc-forest/5'
                              : outOfStock
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :'border-sc-border hover:border-sc-forest/50 bg-white'
                          }`}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-center gap-3">
                            {/* Radio indicator */}
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'border-sc-forest' : 'border-gray-300'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-sc-forest" />}
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-sc-forest">
                                {v.name}
                              </span>
                              {v.weight_label && (
                                <span className="text-xs text-gray-500 ml-2">· {v.weight_label}</span>
                              )}
                              {outOfStock && (
                                <span className="text-xs text-red-500 ml-2">Agotado</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-bold flex-shrink-0 ${isSelected ? 'text-sc-forest' : 'text-sc-forest/70'}`}>
                            {variantPriceStr}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Stock status for selected presentation */}
                  {selectedPresentation && (
                    <div className="mt-3">
                      {selectedPresentation.is_in_stock !== false ? (
                        <span className="text-sm font-semibold text-green-600">En stock</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">Agotado</span>
                      )}
                    </div>
                  )}

                  {/* Validation error */}
                  {presentationError && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Por favor selecciona una presentación antes de agregar al carrito.
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              {product.description && (
                <p className="text-sc-forest/80 leading-relaxed mb-6">
                  {product.description}
                </p>
              )}

              {/* Intensity */}
              {product.intensity_level && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-sc-forest mb-3">Intensidad</p>
                  <IntensityIndicator level={product.intensity_level} />
                </div>
              )}

              {/* Effects */}
              {product.effects && product.effects.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-sc-forest mb-3">Efectos</p>
                  <div className="flex flex-wrap gap-2">
                    {product.effects.map((effect) => (
                      <span key={effect} className="text-xs font-semibold text-sc-periwinkle bg-sc-periwinkle/10 px-3 py-1.5 rounded-full">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex gap-3 mt-auto pt-6">
                <div className="flex items-center border border-sc-border rounded-pill overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 text-sc-forest hover:bg-sc-beige transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="px-4 py-3 font-semibold text-sc-forest min-w-[40px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-3 text-sc-forest hover:bg-sc-beige transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={hasPresentations ? false : !inStock}
                  className={`flex-1 font-bold py-3 px-6 rounded-pill transition-colors min-h-[52px] ${
                    (!hasPresentations && !inStock)
                      ? 'bg-sc-forest/40 text-sc-cream cursor-not-allowed'
                      : 'bg-sc-forest text-sc-cream hover:bg-sc-darkforest'
                  }`}
                >
                  {!hasPresentations && !inStock
                    ? 'Agotado'
                    : hasPresentations && !selectedVariantId
                    ? 'Selecciona una presentación' :'Añadir al carrito'}
                </button>
              </div>

              {/* WhatsApp Buy Button */}
              {!waLoading && waSettings.buy_via_whatsapp_enabled && waSettings.phone && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const message = buildWaMessage();
                      const phone = waSettings.phone.replace(/\D/g, '');
                      window.open(
                        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 border-2 border-sc-forest text-sc-forest font-bold py-3 px-6 rounded-pill hover:bg-sc-forest/5 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Comprar por WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" ref={reviewsRef}>
          <ProductReviewsSection
            productSlug={slug}
            productId={product.id}
            productName={product.name}
          />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="py-12 lg:py-16">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
              <h2 className="text-2xl lg:text-3xl font-black tracking-tightest text-sc-forest mb-8">
                Productos Relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((prod) => (
                  <CatalogProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={() => {}}
                    country={country}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}