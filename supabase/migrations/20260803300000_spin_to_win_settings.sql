-- ============================================================
-- Street Candy — Spin to Win: settings row
-- Migration: 20260803300000_spin_to_win_settings.sql
-- ============================================================

-- Insert default spin_to_win settings if not exists
INSERT INTO public.settings (key, value, country_code, description, is_public)
SELECT
  'spin_to_win',
  '{
    "enabled": true,
    "delay_seconds": 7,
    "exit_intent": true,
    "popup_title": "¡Gira y gana!",
    "popup_subtitle": "Ingresa tu correo y gira la ruleta para ganar un descuento",
    "coupon_expiration_days": 7,
    "minimum_purchase": 50000,
    "prizes": [
      { "label": "5%",          "weight": 30, "value": 5,    "discountType": "percentage" },
      { "label": "10%",         "weight": 30, "value": 10,   "discountType": "percentage" },
      { "label": "10%",         "weight": 30, "value": 10,   "discountType": "percentage" },
      { "label": "15%",         "weight": 20, "value": 15,   "discountType": "percentage" },
      { "label": "20%",         "weight": 10, "value": 20,   "discountType": "percentage" },
      { "label": "Envío Gratis","weight": 10, "value": null,  "discountType": "shipping"   },
      { "label": "5%",          "weight": 30, "value": 5,    "discountType": "percentage" },
      { "label": "15%",         "weight": 20, "value": 15,   "discountType": "percentage" }
    ]
  }'::jsonb,
  NULL,
  'Configuración del popup Spin to Win: activación, delay, exit-intent, textos, probabilidades de premios, expiración de cupones y compra mínima.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'spin_to_win');
