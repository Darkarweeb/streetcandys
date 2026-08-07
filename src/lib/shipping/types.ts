/**
 * Street Candy — Shipping Management Types
 */

export interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_cost_co: number;
  base_cost_cr: number;
  delivery_time: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingCountrySettings {
  id: string;
  country_code: string;
  is_enabled: boolean;
  free_shipping_threshold: number;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingRegion {
  id: string;
  country_code: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: string;
  region_id: string;
  shipping_method_id: string;
  price: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  region?: ShippingRegion;
  method?: ShippingMethod;
}

export interface ShippingSameDayConfig {
  id: string;
  shipping_method_id: string;
  cutoff_time: string;       // HH:MM:SS
  available_days: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  delivery_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Checkout-facing types ──────────────────────────────────────────────────

export interface ResolvedShippingOption {
  method_id: string;
  code: string;
  name: string;
  description: string | null;
  delivery_time: string | null;
  price: number;
  is_free: boolean;
  display_order: number;
}

export interface ShippingCalculationResult {
  country_code: string;
  region_name: string | null;
  free_shipping_threshold: number;
  currency_code: string;
  currency_symbol: string;
  options: ResolvedShippingOption[];
  same_day_available: boolean;
  same_day_message: string | null;
}
