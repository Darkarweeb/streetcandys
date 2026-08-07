/**
 * Street Candy — Shipping Service
 * Reads dynamic shipping config from Supabase.
 * Used by checkout and admin.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ShippingMethod,
  ShippingCountrySettings,
  ShippingRegion,
  ShippingRate,
  ShippingSameDayConfig,
  ShippingCalculationResult,
  ResolvedShippingOption,
} from './types';

export * from './types';

// ── Helpers ────────────────────────────────────────────────────────────────

function isSameDayAvailableNow(config: ShippingSameDayConfig): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  if (!config.available_days.includes(dayOfWeek)) return false;

  const [hh, mm] = config.cutoff_time.split(':').map(Number);
  const cutoffMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes < cutoffMinutes;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Calculate available shipping options for a given country + region.
 * Called from checkout API and client-side hooks.
 */
export async function calculateShippingOptions(
  countryCode: string,
  regionName: string | null,
  subtotal: number,
): Promise<ShippingCalculationResult> {
  const supabase = await createClient();

  // 1. Country settings
  const { data: countrySettings } = await supabase
    .from('shipping_country_settings')
    .select('*')
    .eq('country_code', countryCode)
    .maybeSingle();

  const settings: ShippingCountrySettings = countrySettings ?? {
    id: '',
    country_code: countryCode,
    is_enabled: true,
    free_shipping_threshold: countryCode === 'CO' ? 350000 : 45000,
    currency_code: countryCode === 'CO' ? 'COP' : 'CRC',
    currency_symbol: countryCode === 'CO' ? '$' : '₡',
    tax_rate: countryCode === 'CO' ? 0.19 : 0.13,
    created_at: '',
    updated_at: '',
  };

  if (!settings.is_enabled) {
    return {
      country_code: countryCode,
      region_name: regionName,
      free_shipping_threshold: Number(settings.free_shipping_threshold),
      currency_code: settings.currency_code,
      currency_symbol: settings.currency_symbol,
      options: [],
      same_day_available: false,
      same_day_message: null,
    };
  }

  const isFreeShipping = subtotal >= Number(settings.free_shipping_threshold);

  // 2. Active methods
  const { data: methods } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!methods || methods.length === 0) {
    return {
      country_code: countryCode,
      region_name: regionName,
      free_shipping_threshold: Number(settings.free_shipping_threshold),
      currency_code: settings.currency_code,
      currency_symbol: settings.currency_symbol,
      options: [],
      same_day_available: false,
      same_day_message: null,
    };
  }

  // 3. Region lookup
  let region: ShippingRegion | null = null;
  if (regionName) {
    const { data: regionData } = await supabase
      .from('shipping_regions')
      .select('*')
      .eq('country_code', countryCode)
      .ilike('name', regionName.trim())
      .eq('is_active', true)
      .maybeSingle();
    region = regionData ?? null;
  }

  // 4. Regional rates (if region found)
  let ratesByMethodId: Record<string, ShippingRate> = {};
  if (region) {
    const { data: rates } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('region_id', region.id);
    if (rates) {
      rates.forEach((r: ShippingRate) => {
        ratesByMethodId[r.shipping_method_id] = r;
      });
    }
  }

  // 5. Same day config
  const sameDayMethod = methods.find((m: ShippingMethod) => m.code === 'same_day');
  let sameDayAvailable = false;
  let sameDayMessage: string | null = null;

  if (sameDayMethod) {
    const { data: sdConfig } = await supabase
      .from('shipping_same_day_config')
      .select('*')
      .eq('shipping_method_id', sameDayMethod.id)
      .eq('is_active', true)
      .maybeSingle();

    if (sdConfig) {
      sameDayMessage = sdConfig.delivery_message ?? null;
      // Check time + day availability
      const timeOk = isSameDayAvailableNow(sdConfig as ShippingSameDayConfig);
      // Check region availability
      const regionRate = region ? ratesByMethodId[sameDayMethod.id] : null;
      const regionOk = region ? (regionRate?.is_enabled ?? false) : false;
      sameDayAvailable = timeOk && regionOk;
    }
  }

  // 6. Build options
  const options: ResolvedShippingOption[] = [];

  for (const method of methods as ShippingMethod[]) {
    // Skip same_day if not available
    if (method.code === 'same_day' && !sameDayAvailable) continue;

    // Determine price: regional rate > base cost
    let price: number;
    const regionRate = region ? ratesByMethodId[method.id] : null;

    if (regionRate) {
      if (!regionRate.is_enabled) continue; // disabled for this region
      price = Number(regionRate.price);
    } else {
      // Fall back to base cost
      price = countryCode === 'CO'
        ? Number(method.base_cost_co)
        : Number(method.base_cost_cr);
    }

    const isFree = isFreeShipping && method.code === 'standard';

    options.push({
      method_id: method.id,
      code: method.code,
      name: method.name,
      description: method.description,
      delivery_time: method.delivery_time,
      price: isFree ? 0 : price,
      is_free: isFree,
      display_order: method.display_order,
    });
  }

  return {
    country_code: countryCode,
    region_name: regionName,
    free_shipping_threshold: Number(settings.free_shipping_threshold),
    currency_code: settings.currency_code,
    currency_symbol: settings.currency_symbol,
    options,
    same_day_available: sameDayAvailable,
    same_day_message: sameDayMessage,
  };
}

/**
 * Get all shipping methods (admin)
 */
export async function getAllShippingMethods(): Promise<ShippingMethod[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipping_methods')
    .select('*')
    .order('display_order', { ascending: true });
  return (data ?? []) as ShippingMethod[];
}

/**
 * Get country settings (admin)
 */
export async function getCountrySettings(): Promise<ShippingCountrySettings[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipping_country_settings')
    .select('*')
    .order('country_code', { ascending: true });
  return (data ?? []) as ShippingCountrySettings[];
}

/**
 * Get regions for a country (admin)
 */
export async function getRegionsByCountry(countryCode: string): Promise<ShippingRegion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipping_regions')
    .select('*')
    .eq('country_code', countryCode)
    .order('name', { ascending: true });
  return (data ?? []) as ShippingRegion[];
}

/**
 * Get rates for a region (admin)
 */
export async function getRatesByRegion(regionId: string): Promise<ShippingRate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipping_rates')
    .select('*, method:shipping_methods(*)')
    .eq('region_id', regionId);
  return (data ?? []) as ShippingRate[];
}

/**
 * Get same day config (admin)
 */
export async function getSameDayConfig(): Promise<ShippingSameDayConfig | null> {
  const supabase = await createClient();
  const sameDayMethod = await supabase
    .from('shipping_methods')
    .select('id')
    .eq('code', 'same_day')
    .maybeSingle();
  if (!sameDayMethod.data) return null;

  const { data } = await supabase
    .from('shipping_same_day_config')
    .select('*')
    .eq('shipping_method_id', sameDayMethod.data.id)
    .maybeSingle();
  return (data ?? null) as ShippingSameDayConfig | null;
}
