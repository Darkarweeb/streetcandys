'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SpinPrize {
  label: string;
  weight: number;
  value: number | null;
  discountType: 'percentage' | 'shipping';
}

export interface SpinToWinSettings {
  enabled: boolean;
  delay_seconds: number;
  exit_intent: boolean;
  popup_title: string;
  popup_subtitle: string;
  coupon_expiration_days: number;
  minimum_purchase: number;
  prizes: SpinPrize[];
}

export const DEFAULT_SPIN_SETTINGS: SpinToWinSettings = {
  enabled: true,
  delay_seconds: 7,
  exit_intent: true,
  popup_title: '¡Gira y gana!',
  popup_subtitle: 'Ingresa tu correo y gira la ruleta para ganar un descuento',
  coupon_expiration_days: 7,
  minimum_purchase: 50000,
  prizes: [
    { label: '5%',          weight: 30, value: 5,    discountType: 'percentage' },
    { label: '10%',         weight: 30, value: 10,   discountType: 'percentage' },
    { label: '10%',         weight: 30, value: 10,   discountType: 'percentage' },
    { label: '15%',         weight: 20, value: 15,   discountType: 'percentage' },
    { label: '20%',         weight: 10, value: 20,   discountType: 'percentage' },
    { label: 'Envío Gratis',weight: 10, value: null,  discountType: 'shipping'   },
    { label: '5%',          weight: 30, value: 5,    discountType: 'percentage' },
    { label: '15%',         weight: 20, value: 15,   discountType: 'percentage' },
  ],
};

/**
 * useSpinToWinSettings
 *
 * Reads the `spin_to_win` row from the `settings` table (is_public = true).
 * Returns the parsed config, a loading flag, and an error string.
 * Falls back to DEFAULT_SPIN_SETTINGS if the row is missing or malformed.
 *
 * Usage:
 *   const { settings, loading } = useSpinToWinSettings();
 */
export function useSpinToWinSettings() {
  const [settings, setSettings] = useState<SpinToWinSettings>(DEFAULT_SPIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('settings')
      .select('value')
      .eq('key', 'spin_to_win')
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError(err?.message ?? 'No se encontró la configuración de Spin to Win');
          setSettings(DEFAULT_SPIN_SETTINGS);
        } else {
          const raw = data.value as Partial<SpinToWinSettings>;
          setSettings({
            enabled:                raw.enabled                ?? DEFAULT_SPIN_SETTINGS.enabled,
            delay_seconds:          raw.delay_seconds          ?? DEFAULT_SPIN_SETTINGS.delay_seconds,
            exit_intent:            raw.exit_intent            ?? DEFAULT_SPIN_SETTINGS.exit_intent,
            popup_title:            raw.popup_title            ?? DEFAULT_SPIN_SETTINGS.popup_title,
            popup_subtitle:         raw.popup_subtitle         ?? DEFAULT_SPIN_SETTINGS.popup_subtitle,
            coupon_expiration_days: raw.coupon_expiration_days ?? DEFAULT_SPIN_SETTINGS.coupon_expiration_days,
            minimum_purchase:       raw.minimum_purchase       ?? DEFAULT_SPIN_SETTINGS.minimum_purchase,
            prizes:                 Array.isArray(raw.prizes) && raw.prizes.length > 0
                                      ? raw.prizes
                                      : DEFAULT_SPIN_SETTINGS.prizes,
          });
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { settings, loading, error };
}
