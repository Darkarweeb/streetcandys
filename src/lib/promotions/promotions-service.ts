/**
 * Street Candy — Promotions Service
 * Calculates applicable promotions for a cart
 */

import type { Promotion, AppliedPromotion, PromotionType } from './types';

/**
 * Calculate discount amount for a promotion given a subtotal
 */
export function calculatePromotionDiscount(
  promotion: Pick<Promotion, 'promotion_type' | 'discount_value' | 'maximum_discount' | 'minimum_purchase'>,
  subtotal: number,
): number {
  if (subtotal < promotion.minimum_purchase) return 0;

  if (promotion.promotion_type === 'free_shipping') return 0;
  if (promotion.promotion_type === 'buy_x_get_y') return 0;

  let discount = 0;
  if (promotion.promotion_type === 'percentage' || promotion.promotion_type === 'automatic_cart' || promotion.promotion_type === 'coupon_code') {
    discount = Math.round(subtotal * (promotion.discount_value / 100) * 100) / 100;
  } else if (promotion.promotion_type === 'fixed_amount') {
    discount = promotion.discount_value;
  }

  if (promotion.maximum_discount !== null && promotion.maximum_discount > 0) {
    discount = Math.min(discount, promotion.maximum_discount);
  }

  return Math.min(discount, subtotal);
}

/**
 * Check if a promotion is currently valid (date/active checks)
 */
export function isPromotionValid(promotion: Promotion): boolean {
  if (!promotion.is_active) return false;
  const now = new Date();
  if (new Date(promotion.starts_at) > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) <= now) return false;
  if (promotion.usage_limit !== null && promotion.usage_count >= promotion.usage_limit) return false;
  return true;
}

/**
 * Check if a promotion applies to a given country
 */
export function promotionMatchesCountry(promotion: Promotion, countryCode: string): boolean {
  if (!promotion.country_codes || promotion.country_codes.length === 0) return true;
  return promotion.country_codes.includes(countryCode);
}

/**
 * Check if a promotion applies to a customer tier
 */
export function promotionMatchesTier(promotion: Promotion, tier: string | null): boolean {
  if (!promotion.eligible_tiers || promotion.eligible_tiers.length === 0) return true;
  if (!tier) return false;
  return promotion.eligible_tiers.includes(tier);
}

/**
 * Build an AppliedPromotion object from a Promotion and calculated discount
 */
export function buildAppliedPromotion(
  promotion: Promotion,
  subtotal: number,
): AppliedPromotion {
  const discountAmount = calculatePromotionDiscount(promotion, subtotal);
  return {
    id: promotion.id,
    name: promotion.name,
    promotion_type: promotion.promotion_type,
    coupon_code: promotion.coupon_code,
    discount_amount: discountAmount,
    is_free_shipping: promotion.promotion_type === 'free_shipping',
    buy_x_get_y_product_id: promotion.promotion_type === 'buy_x_get_y' ? promotion.get_product_id : null,
  };
}

/**
 * Format discount display string
 */
export function formatPromotionDiscount(
  type: PromotionType,
  value: number,
  currency: string = 'COP',
): string {
  if (type === 'percentage' || type === 'automatic_cart' || type === 'coupon_code') {
    return `${value}%`;
  }
  if (type === 'fixed_amount') {
    return `${currency === 'COP' ? '$' : '₡'}${value.toLocaleString()}`;
  }
  if (type === 'free_shipping') return 'Envío gratis';
  if (type === 'buy_x_get_y') return 'Compra X lleva Y';
  return `${value}`;
}
