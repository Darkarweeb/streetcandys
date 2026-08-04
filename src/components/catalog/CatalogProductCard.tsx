'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductSummary } from '@/lib/products/types';
import { formatPrice, isProductAvailableInCountry, type Country } from '@/lib/price';
import FavoriteButton from '@/components/catalog/FavoriteButton';

interface CatalogProductCardProps {
  product: ProductSummary;
  onAddToCart?: (product: ProductSummary) => void;
  country?: Country;
}

function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} de 5 estrellas, ${total} reseñas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1"
          className="text-sc-forest"
          aria-hidden="true"
        >
          <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
        </svg>
      ))}
      <span className="text-xs text-sc-muted ml-0.5">({total})</span>
    </div>
  );
}

function IntensityBar({ level }: { level: number }) {
  const labels = ['', 'Suave', 'Ligero', 'Moderado', 'Fuerte', 'Intenso'];
  return (
    <div className="flex items-center gap-1.5" aria-label={`Intensidad: ${labels[level] ?? level}`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-1.5 rounded-sm transition-all ${
              bar <= level ? 'bg-sc-forest' : 'bg-sc-border'
            }`}
            style={{ height: `${6 + bar * 2}px` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-xs text-sc-muted">{labels[level] ?? level}</span>
    </div>
  );
}

export default function CatalogProductCard({ product, onAddToCart, country = 'CO' }: CatalogProductCardProps) {
  const mainImage = product.images?.[0]?.url || product.thumbnail_url;
  const mainAlt = product.images?.[0]?.alt || product.name;
  const inStock = product.inventory_status?.is_in_stock !== false;
  const isLowStock = product.inventory_status?.is_low_stock;
  const available = isProductAvailableInCountry(product, country);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.base_price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.base_price / product.compare_at_price!) * 100)
    : 0;

  const priceStr = formatPrice(product, country);
  const comparePriceStr =
    hasDiscount && country === 'CO'
      ? formatPrice({ base_price: product.compare_at_price!, price_crc: null }, country)
      : null;

  if (!available) return null;

  return (
    <article className="group flex flex-col" aria-label={product.name}>
      <Link href={`/productos/${product.slug}`} className="block relative flex-1">
        {/* Image */}
        <div className="relative rounded-card overflow-hidden mb-3 bg-sc-beige aspect-square">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={mainAlt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-sc-beige">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-sc-border" aria-hidden="true">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 32l10-10 8 8 6-6 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_featured && (
              <span className="bg-sc-forest text-sc-cream text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                Destacado
              </span>
            )}
            {hasDiscount && (
              <span className="bg-sc-periwinkle text-white text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                -{discountPct}%
              </span>
            )}
            {isLowStock && inStock && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                Últimas unidades
              </span>
            )}
            {!inStock && (
              <span className="bg-sc-muted text-white text-[10px] font-bold px-2.5 py-1 rounded-badge leading-none">
                Agotado
              </span>
            )}
          </div>

          {/* Favorite button */}
          <div className="absolute top-3 right-3">
            <FavoriteButton productId={product.id} size="sm" />
          </div>

          {/* Effects overlay */}
          {product.effects && product.effects.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
              <span className="text-white text-xs font-medium capitalize">
                {product.effects[0]}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-1 space-y-1.5">
          {product.category && (
            <p className="text-sc-muted text-[11px] font-medium uppercase tracking-wider">
              {product.category.name}
            </p>
          )}
          <h3 className="text-sc-forest font-semibold text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>

          {/* Rating */}
          {product.reviews_summary && product.reviews_summary.total_reviews > 0 && (
            <StarRating
              rating={product.reviews_summary.average_rating}
              total={product.reviews_summary.total_reviews}
            />
          )}

          {/* Intensity */}
          {product.intensity_level && product.intensity_level > 0 && (
            <IntensityBar level={product.intensity_level} />
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sc-forest font-bold text-sm">
              {priceStr}
            </span>
            {comparePriceStr && (
              <span className="text-sc-muted text-xs line-through">
                {comparePriceStr}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Add to Cart */}
      <button
        onClick={() => onAddToCart?.(product)}
        disabled={!inStock}
        className={`mt-3 w-full text-sm font-bold py-3 px-5 rounded-pill transition-all duration-200 active:scale-95 ${
          inStock
            ? 'bg-sc-forest text-sc-cream hover:bg-sc-green'
            : 'bg-sc-beige text-sc-muted cursor-not-allowed'
        }`}
        aria-label={inStock ? `Agregar ${product.name} al carrito` : `${product.name} agotado`}
      >
        {inStock ? 'Agregar al carrito' : 'Agotado'}
      </button>
    </article>
  );
}
