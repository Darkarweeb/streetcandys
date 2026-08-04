-- ============================================================
-- Migration: Seed whatsapp_support setting
-- ============================================================

INSERT INTO public.settings (key, value, country_code, description, is_public)
VALUES (
  'whatsapp_support',
  '{"phone": "", "message": "Hola 👋, necesito ayuda con un pedido en Street Candy.", "enabled": false}',
  NULL,
  'Configuración del botón flotante de soporte por WhatsApp. phone: número con código de país (ej: 573001234567), message: mensaje predeterminado, enabled: activar/desactivar el botón.',
  TRUE
)
ON CONFLICT (key) DO NOTHING;
