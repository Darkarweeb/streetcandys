/**
 * Street Candy — Shared Price Helper
 * Single source of truth for price formatting and country-aware pricing.
 *
 * Rules:
 *  - Colombia (CO): price_cop in COP, formatted as "$12.000"
 *  - Costa Rica (CR): price_crc in CRC, formatted as "₡5.000"
 *  - A product is visible in CR ONLY if price_crc is set.
 *  - A product is visible in CO if price_cop is set, or legacy base_price exists.
 *  - If the country price is missing, returns null — never falls back to USD.
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
 * Returns null if the product does not have a price for that country.
 * Colombia → price_cop (falls back to base_price for legacy products that predate price_cop column)
 * Costa Rica → price_crc
 * NEVER uses base_price as a primary price source.
 */
export function getProductPrice(
  product: { base_price?: number | null; price_crc?: number | null; price_cop?: number | null },
  country: Country,
): number | null {
  if (country === 'CR') {
    return product.price_crc != null ? product.price_crc : null;
  }
  // CO: prefer price_cop; fall back to base_price only for legacy products without price_cop
  if (product.price_cop != null) return product.price_cop;
  if (product.base_price != null) return product.base_price;
  return null;
}

/**
 * Returns true if the product is available in the given country.
 */
export function isProductAvailableInCountry(
  product: { base_price?: number | null; price_crc?: number | null; price_cop?: number | null },
  country: Country,
): boolean {
  if (country === 'CR') {
    return product.price_crc != null;
  }
  // CO: available if price_cop is set, or legacy base_price exists
  return product.price_cop != null || product.base_price != null;
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
    const formatted = new Intl.NumberFormat('es-CR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
    return `₡${formatted}`;
  }
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
  product: { base_price?: number | null; price_crc?: number | null; price_cop?: number | null },
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
