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
        // Pre-select first in-stock variant if variants exist
        if (loadedProduct.variants && loadedProduct.variants.length > 0) {
          const firstInStock = loadedProduct.variants.find(v => v.is_in_stock !== false) ?? loadedProduct.variants[0];
          setSelectedVariantId(firstInStock.id);
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

    try {
      const response = await fetch('/api/carrito/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          ...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCartItems(data.items || []);
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

  // Resolve active variant
  const hasVariants = product.variants && product.variants.length > 0;
  const activeVariant = hasVariants
    ? product.variants!.find(v => v.id === selectedVariantId) ?? product.variants![0]
    : null;

  const inStock = activeVariant
    ? activeVariant.is_in_stock !== false
    : product.inventory_status?.is_in_stock !== false;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.base_price;
  const discountPct = hasDiscount ? Math.round((1 - product.base_price / product.compare_at_price!) * 100) : 0;

  // Country-aware price — apply variant price_modifier if a variant is selected
  const basePrice = activeVariant
    ? product.base_price + (activeVariant.price_modifier ?? 0)
    : product.base_price;
  const priceStr = country === 'CR' && product.price_crc
    ? formatPriceValue(product.price_crc + (activeVariant?.price_modifier ?? 0), 'CR')
    : formatPriceValue(basePrice, 'CO');
  const comparePriceStr = hasDiscount && country === 'CO'
    ? formatPriceValue(product.compare_at_price!, 'CO')
    : null;

  // WhatsApp message uses active country currency
  const buildWaMessage = () => {
    const productUrl = `${window.location.origin}/productos/${slug}`;
    const variantInfo = product.sku ? ` (SKU: ${product.sku})` : '';
    const priceFormatted = priceStr;
    return (
      `Hola 👋, quiero comprar:\n\n🍬 *${product.name}*${variantInfo}\n📦 Cantidad: ${quantity}\n💰 Precio unitario: ${priceFormatted}\n\n🔗 ${productUrl}` +
      `\n\n💳 Pago con cripto (BTC, ETH, USDT, USDC) disponible bajo solicitud por este chat.`
    );
  };

  return (
    <>
      <Navigation cartCount={cartItems.length} onCartOpen={() => setCartOpen(true)} />
      <AnnouncementBar />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} country={country} />

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
                  <StarRating rating={reviewsSummary.average_rating} />
                  <span className="text-sm text-sc-muted">
                    {reviewsSummary.total_reviews} reseñas
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-black text-sc-forest">
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
              <div className="mb-6">
                {inStock ? (
                  <span className="text-sm font-semibold text-green-600">En stock</span>
                ) : (
                  <span className="text-sm font-semibold text-red-600">Agotado</span>
                )}
              </div>

              {/* Variant Selector */}
              {hasVariants && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-sc-forest mb-3">
                    {product.variants![0].variant_type === 'size' && 'Tamaño'}
                    {product.variants![0].variant_type === 'flavor' && 'Sabor'}
                    {product.variants![0].variant_type === 'strength' && 'Intensidad'}
                    {product.variants![0].variant_type === 'format' && 'Formato'}
                    {!['size', 'flavor', 'strength', 'format'].includes(product.variants![0].variant_type) && 'Variante'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants!.map((variant) => {
                      const isSelected = variant.id === selectedVariantId;
                      const outOfStock = variant.is_in_stock === false;
                      return (
                        <button
                          key={variant.id}
                          onClick={() => !outOfStock && setSelectedVariantId(variant.id)}
                          disabled={outOfStock}
                          className={`px-4 py-2 rounded-pill text-sm font-semibold border-2 transition-all ${
                            isSelected
                              ? 'bg-sc-forest text-sc-cream border-sc-forest'
                              : outOfStock
                              ? 'bg-sc-beige text-sc-muted border-sc-border cursor-not-allowed line-through' :'bg-transparent text-sc-forest border-sc-border hover:border-sc-forest'
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`${variant.name}: ${variant.value}${outOfStock ? ' (agotado)' : ''}`}
                        >
                          {variant.value}
                          {variant.price_modifier !== 0 && variant.price_modifier != null && (
                            <span className="ml-1 text-xs opacity-70">
                              {variant.price_modifier > 0 ? '+' : ''}
                              {formatPriceValue(variant.price_modifier, country)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
                  disabled={!inStock}
                  className="flex-1 bg-sc-forest text-sc-cream font-bold py-3 px-6 rounded-pill hover:bg-sc-darkforest transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
                >
                  {inStock ? 'Añadir al carrito' : 'Agotado'}
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
        <div id="reviews">
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