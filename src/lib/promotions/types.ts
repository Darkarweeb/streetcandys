/**
 * Street Candy — Promotions System Types
 */

export type PromotionType =
  | 'percentage' |'fixed_amount' |'free_shipping' |'buy_x_get_y' |'automatic_cart' |'coupon_code';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  internal_notes: string | null;
  promotion_type: PromotionType;
  coupon_code: string | null;
  discount_value: number;
  buy_quantity: number | null;
  get_quantity: number | null;
  get_product_id: string | null;
  minimum_purchase: number;
  maximum_discount: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  country_codes: string[] | null;
  product_ids: string[] | null;
  category_ids: string[] | null;
  brand_ids: string[] | null;
  customer_ids: string[] | null;
  eligible_tiers: string[] | null;
  total_revenue_generated: number;
  total_discount_given: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PromotionRedemption {
  id: string;
  promotion_id: string;
  profile_id: string | null;
  order_id: string | null;
  discount_amount: number;
  cart_total: number | null;
  country_code: string | null;
  redeemed_at: string;
}

export interface PromotionFormData {
  name: string;
  description: string;
  internal_notes: string;
  promotion_type: PromotionType;
  coupon_code: string;
  discount_value: string;
  buy_quantity: string;
  get_quantity: string;
  minimum_purchase: string;
  maximum_discount: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  usage_limit: string;
  per_customer_limit: string;
  country_codes: string[];
  product_ids: string[];
  category_ids: string[];
  brand_ids: string[];
  customer_ids: string[];
  eligible_tiers: string[];
}

export interface PromotionAnalytics {
  promotion_id: string;
  promotion_name: string;
  total_uses: number;
  revenue_generated: number;
  discount_given: number;
  conversion_rate: number;
  avg_order_value: number;
}

export interface AppliedPromotion {
  id: string;
  name: string;
  promotion_type: PromotionType;
  coupon_code: string | null;
  discount_amount: number;
  is_free_shipping: boolean;
  buy_x_get_y_product_id: string | null;
}

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  percentage: 'Descuento porcentual',
  fixed_amount: 'Monto fijo',
  free_shipping: 'Envío gratis',
  buy_x_get_y: 'Compra X lleva Y',
  automatic_cart: 'Descuento automático',
  coupon_code: 'Código de cupón',
};

export const PROMOTION_TYPE_COLORS: Record<PromotionType, string> = {
  percentage: 'bg-blue-100 text-blue-700',
  fixed_amount: 'bg-green-100 text-green-700',
  free_shipping: 'bg-purple-100 text-purple-700',
  buy_x_get_y: 'bg-orange-100 text-orange-700',
  automatic_cart: 'bg-teal-100 text-teal-700',
  coupon_code: 'bg-pink-100 text-pink-700',
};

export const COUNTRY_OPTIONS = [
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
];

export const TIER_OPTIONS = [
  { value: 'crew', label: 'Crew' },
  { value: 'og', label: 'OG' },
  { value: 'legend', label: 'Legend' },
  { value: 'icon', label: 'Icon' },
];

export const INITIAL_FORM: PromotionFormData = {
  name: '',
  description: '',
  internal_notes: '',
  promotion_type: 'percentage',
  coupon_code: '',
  discount_value: '',
  buy_quantity: '1',
  get_quantity: '1',
  minimum_purchase: '0',
  maximum_discount: '',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
  is_active: true,
  usage_limit: '',
  per_customer_limit: '1',
  country_codes: [],
  product_ids: [],
  category_ids: [],
  brand_ids: [],
  customer_ids: [],
  eligible_tiers: [],
};
