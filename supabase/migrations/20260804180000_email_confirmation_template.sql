-- ============================================================
-- Street Candy's — Supabase Auth Email Template Configuration
-- Migration: 20260804180000_email_confirmation_template.sql
-- Purpose: Documents the branded email template + ensures
--          auth settings are correctly configured.
-- ============================================================

-- This migration does NOT modify auth.config (managed by Supabase dashboard).
-- It creates a helper table to store the branded email template HTML
-- so admins can copy-paste it into the Supabase Auth dashboard.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only admins can read/write
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_templates' AND policyname = 'admins_manage_email_templates'
  ) THEN
    CREATE POLICY admins_manage_email_templates ON public.email_templates
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- Insert / update the branded confirmation email template
INSERT INTO public.email_templates (id, subject, html_body)
VALUES (
  'confirm_signup',
  'Bienvenido al Crew — Confirma tu cuenta en Street Candy''s 🍭',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido al Crew — Street Candy''s</title>
</head>
<body style="margin:0;padding:0;background:#fff0f5;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff0f5;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(233,30,140,0.12);">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);padding:40px 40px 32px;text-align:center;">
              <!-- Brand name as styled text (no external image dependency) -->
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 24px;margin-bottom:20px;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">🍭 Street Candy''s</span>
              </div>
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Bienvenido al Crew</h1>
              <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">Premium Hemp &amp; Cannabis Wellness</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.6;">
                ¡Hola! 👋 Gracias por unirte a <strong>Street Candy''s</strong>. Estás a un paso de acceder a todo lo que el crew tiene para ti.
              </p>

              <!-- Confirmation CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                <tr>
                  <td style="background:rgba(233,30,140,0.06);border:1px solid rgba(233,30,140,0.2);border-radius:16px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a1a;">Confirma tu cuenta para activarla</p>
                    <p style="margin:0 0 20px;font-size:13px;color:#888;">Haz clic en el botón de abajo para verificar tu correo electrónico.</p>
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:50px;box-shadow:0 4px 20px rgba(233,30,140,0.35);">
                      🍬 Confirmar mi cuenta
                    </a>
                    <p style="margin:16px 0 0;font-size:11px;color:#aaa;">Este enlace expira en 24 horas.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a1a;">Lo que te espera en el crew:</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td width="36" style="font-size:22px;vertical-align:middle;">🏆</td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <strong style="font-size:13px;color:#1a1a1a;display:block;">Programa de Recompensas</strong>
                          <span style="font-size:12px;color:#888;">Acumula puntos en cada compra y canjéalos por descuentos exclusivos.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td width="36" style="font-size:22px;vertical-align:middle;">🎁</td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <strong style="font-size:13px;color:#1a1a1a;display:block;">Descuentos Exclusivos para Miembros</strong>
                          <span style="font-size:12px;color:#888;">Ofertas especiales y acceso anticipado a nuevos productos.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td width="36" style="font-size:22px;vertical-align:middle;">🌿</td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <strong style="font-size:13px;color:#1a1a1a;display:block;">Contenido Educativo Cannabis &amp; Hemp</strong>
                          <span style="font-size:12px;color:#888;">Guías, artículos y recursos sobre bienestar con hemp de calidad premium.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td width="36" style="font-size:22px;vertical-align:middle;">🚀</td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <strong style="font-size:13px;color:#1a1a1a;display:block;">Acceso Anticipado a Lanzamientos</strong>
                          <span style="font-size:12px;color:#888;">Sé el primero en conocer y adquirir nuestros nuevos productos.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #ffd6e8;margin:28px 0;" />

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:12px;color:#aaa;text-align:center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0;font-size:11px;color:#e91e8c;text-align:center;word-break:break-all;">
                {{ .ConfirmationURL }}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff0f5;padding:24px 40px;text-align:center;border-top:1px solid #ffd6e8;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#e91e8c;">🍭 Street Candy''s</p>
              <p style="margin:0 0 6px;font-size:11px;color:#aaa;">Premium Hemp &amp; Cannabis Wellness — Colombia &amp; Costa Rica</p>
              <p style="margin:0;font-size:10px;color:#ccc;">
                Recibiste este correo porque alguien se registró con esta dirección en streetcandys.shop.<br/>
                Si no fuiste tú, puedes ignorar este mensaje de forma segura.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>'
)
ON CONFLICT (id) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  updated_at = now();
