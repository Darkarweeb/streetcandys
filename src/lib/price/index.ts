/**
 * Street Candy — Shared Price Helper
 * Single source of truth for price formatting and country-aware pricing.
 *
 * Rules:
 *  - Colombia (CO): base_price in COP, formatted as "$12.000"
 *  - Costa Rica (CR): price_crc in CRC, formatted as "₡5.000"
 *  - A product is visible in CR ONLY if price_crc is set.
 *  - Products are always visible in CO.
 */

export type Country = 'CO' | 'CR';

export const FREE_SHIPPING_THRESHOLD: Record<Country, number> = {
  CO: 350000,
  CR: 45000,
};

export const CURRENCY_SYMBOL: Record<Country, string> = {
  CO: '$',
  CR: '₡',
};

export const CURRENCY_CODE: Record<Country, string> = {
  CO: 'COP',
  CR: 'CRC',
};

/**
 * Returns the price for a product in the given country.
 * Returns null if the product is not available in that country.
 */
export function getProductPrice(
  product: { base_price: number; price_crc?: number | null },
  country: Country,
): number | null {
  if (country === 'CR') {
    return product.price_crc != null ? product.price_crc : null;
  }
  return product.base_price;
}

/**
 * Returns true if the product is available in the given country.
 */
export function isProductAvailableInCountry(
  product: { base_price: number; price_crc?: number | null },
  country: Country,
): boolean {
  if (country === 'CR') {
    return product.price_crc != null;
  }
  return true; // CO: always visible
}

/**
 * Formats a numeric price for the given country.
 * CO: "$12.000" (COP, es-CO locale, no decimals)
 * CR: "₡5.000" (CRC, es-CR locale, no decimals)
 *
 * SSR-safe: uses explicit locale strings, no browser APIs.
 */
export function formatPriceValue(amount: number, country: Country): string {
  if (country === 'CR') {
    // CRC: ₡ symbol + thousands separator
    const formatted = new Intl.NumberFormat('es-CR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
    return `₡${formatted}`;
  }
  // COP: $ symbol + thousands separator (es-CO style uses . as thousands sep)
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  return `$${formatted}`;
}

/**
 * Main helper: formatPrice(product, country)
 * Returns the formatted price string for the active country,
 * or null if the product is not available in that country.
 */
export function formatPrice(
  product: { base_price: number; price_crc?: number | null },
  country: Country,
): string | null {
  const price = getProductPrice(product, country);
  if (price == null) return null;
  return formatPriceValue(price, country);
}

/**
 * Formats the free-shipping threshold for the given country.
 */
export function formatShippingThreshold(country: Country): string {
  return formatPriceValue(FREE_SHIPPING_THRESHOLD[country], country);
}
