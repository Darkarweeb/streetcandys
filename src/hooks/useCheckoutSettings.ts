'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface CheckoutSettings {
  require_payment_method: boolean;
}

const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  require_payment_method: false,
};

/**
 * useCheckoutSettings
 *
 * Reads the `checkout_settings` row from the `settings` table (is_public = true).
 * Returns the parsed config, a loading flag, and an error string.
 *
 * Key setting:
 *   require_payment_method (boolean, default: false)
 *   - false → payment section is hidden; order is created with null payment_method
 *   - true  → payment section is shown; behavior is exactly as before
 */
export function useCheckoutSettings() {
  const [settings, setSettings] = useState<CheckoutSettings>(DEFAULT_CHECKOUT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('settings')
      .select('value')
      .eq('key', 'checkout_settings')
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setSettings(DEFAULT_CHECKOUT_SETTINGS);
        } else if (!data) {
          // Row doesn't exist yet — use defaults (require_payment_method = false)
          setSettings(DEFAULT_CHECKOUT_SETTINGS);
        } else {
          const raw = data.value as Partial<CheckoutSettings>;
          setSettings({
            require_payment_method: raw.require_payment_method ?? false,
          });
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { settings, loading, error };
}
