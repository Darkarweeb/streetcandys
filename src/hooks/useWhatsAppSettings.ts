'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WhatsAppSettings {
  phone: string;
  support_message: string;
  purchase_message: string;
  floating_button_enabled: boolean;
  buy_via_whatsapp_enabled: boolean;
  checkout_via_whatsapp_enabled: boolean;
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  phone: '',
  support_message: 'Hola 👋, necesito ayuda con un pedido en Street Candy.',
  purchase_message: 'Hola 👋, me interesa comprar este producto en Street Candy.',
  floating_button_enabled: false,
  buy_via_whatsapp_enabled: false,
  checkout_via_whatsapp_enabled: false,
};

/**
 * useWhatsAppSettings
 *
 * Reads the `whatsapp_support` row from the `settings` table (is_public = true).
 * Returns the parsed config, a loading flag, and an error string.
 *
 * Usage:
 *   const { settings, loading } = useWhatsAppSettings();
 */
export function useWhatsAppSettings() {
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_support')
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError(err?.message ?? 'No se encontró la configuración de WhatsApp');
          setSettings(DEFAULT_SETTINGS);
        } else {
          const raw = data.value as Partial<WhatsAppSettings & { message?: string; enabled?: boolean }>;
          setSettings({
            phone: raw.phone ?? DEFAULT_SETTINGS.phone,
            support_message: raw.support_message ?? raw.message ?? DEFAULT_SETTINGS.support_message,
            purchase_message: raw.purchase_message ?? DEFAULT_SETTINGS.purchase_message,
            floating_button_enabled: raw.floating_button_enabled ?? raw.enabled ?? DEFAULT_SETTINGS.floating_button_enabled,
            buy_via_whatsapp_enabled: raw.buy_via_whatsapp_enabled ?? DEFAULT_SETTINGS.buy_via_whatsapp_enabled,
            checkout_via_whatsapp_enabled: raw.checkout_via_whatsapp_enabled ?? DEFAULT_SETTINGS.checkout_via_whatsapp_enabled,
          });
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { settings, loading, error };
}
