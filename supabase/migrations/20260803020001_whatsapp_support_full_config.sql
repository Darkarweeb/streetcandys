-- ============================================================
-- Migration: Update whatsapp_support setting with full config
-- ============================================================

-- Update existing record to full schema (preserves phone if already set)
UPDATE public.settings
SET
  value = jsonb_build_object(
    'phone',                      COALESCE((value->>'phone'), ''),
    'support_message',            COALESCE((value->>'support_message'), (value->>'message'), 'Hola 👋, necesito ayuda con un pedido en Street Candy.'),
    'purchase_message',           COALESCE((value->>'purchase_message'), 'Hola 👋, me interesa comprar este producto en Street Candy.'),
    'floating_button_enabled',    COALESCE((value->'floating_button_enabled')::boolean, (value->'enabled')::boolean, false),
    'buy_via_whatsapp_enabled',   COALESCE((value->'buy_via_whatsapp_enabled')::boolean, false),
    'checkout_via_whatsapp_enabled', COALESCE((value->'checkout_via_whatsapp_enabled')::boolean, false)
  ),
  description = 'Configuración completa de WhatsApp: número de teléfono, mensajes de soporte y compra, botón flotante, compra por WhatsApp y checkout por WhatsApp.'
WHERE key = 'whatsapp_support';

-- Insert if not exists (fresh installs)
INSERT INTO public.settings (key, value, country_code, description, is_public)
SELECT
  'whatsapp_support',
  '{"phone": "", "support_message": "Hola 👋, necesito ayuda con un pedido en Street Candy.", "purchase_message": "Hola 👋, me interesa comprar este producto en Street Candy.", "floating_button_enabled": false, "buy_via_whatsapp_enabled": false, "checkout_via_whatsapp_enabled": false}'::jsonb,
  NULL,
  'Configuración completa de WhatsApp: número de teléfono, mensajes de soporte y compra, botón flotante, compra por WhatsApp y checkout por WhatsApp.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'whatsapp_support');
