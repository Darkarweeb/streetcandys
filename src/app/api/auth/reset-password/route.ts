/**
 * POST /api/auth/reset-password
 *
 * Generates a token_hash recovery link via the Supabase admin API
 * and sends it through Resend. This ensures the recovery email
 * contains token_hash + type=recovery (compatible with verifyOtp)
 * instead of a PKCE code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient, FROM_EMAIL } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop';
    const adminClient = createAdminClient();

    // Generate a token_hash recovery link via the admin API.
    // This produces a link with token_hash + type=recovery instead of PKCE.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (linkError) {
      // Return generic message to avoid user enumeration
      return NextResponse.json({ success: true });
    }

    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) {
      return NextResponse.json({ success: true });
    }

    // Send the recovery email via Resend
    const resend = getResendClient();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Restablece tu contraseña — Street Candy's",
      html: getRecoveryEmailHtml(recoveryLink),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[reset-password] Unexpected error:', message);
    // Return success to avoid user enumeration
    return NextResponse.json({ success: true });
  }
}

// ─── Brand constants ─────────────────────────────────────────────────────────

const BRAND = {
  black: '#0A0A0A',
  fuchsia: '#E91E8C',
  green: '#4CAF50',
  white: '#FFFFFF',
  siteUrl: 'https://streetcandys.shop',
};

// ─── Recovery Email HTML ─────────────────────────────────────────────────────

function getRecoveryEmailHtml(recoveryLink: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablece tu contraseña — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#161616;border-radius:16px;overflow:hidden;border:1px solid #222222;">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background:${BRAND.black};padding:36px 40px 28px;text-align:center;border-bottom:3px solid ${BRAND.fuchsia};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:900;color:${BRAND.white};letter-spacing:2px;text-transform:uppercase;">STREET</span>
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:900;color:${BRAND.fuchsia};letter-spacing:2px;text-transform:uppercase;"> CANDY'S</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background:${BRAND.fuchsia};color:${BRAND.white};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 14px;border-radius:20px;">PREMIUM HEMP &amp; CANNABIS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding:40px 40px 36px;">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:64px;height:64px;background:#1A1A1A;border-radius:50%;border:2px solid ${BRAND.fuchsia};text-align:center;line-height:64px;font-size:28px;display:inline-block;">🔐</div>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:900;color:${BRAND.white};text-align:center;letter-spacing:-0.3px;">Restablece tu contraseña</p>
              <p style="margin:0 0 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#AAAAAA;text-align:center;line-height:1.7;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en
                <strong style="color:${BRAND.white};">Street Candy's</strong>.
                Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${recoveryLink}"
                       style="display:inline-block;background:${BRAND.fuchsia};color:${BRAND.white};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:900;text-decoration:none;padding:16px 48px;border-radius:6px;letter-spacing:2px;text-transform:uppercase;">
                      RESTABLECER CONTRASEÑA
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#1A1A1A;border-radius:10px;border:1px solid #252525;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:${BRAND.green};letter-spacing:1px;text-transform:uppercase;">Nota de seguridad</p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#888888;line-height:1.6;">
                      Este enlace expira en <strong style="color:#AAAAAA;">1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña no será modificada.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Backup link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #222222;padding-top:20px;">
                <tr>
                  <td style="padding-top:20px;text-align:center;">
                    <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#666666;letter-spacing:0.5px;">¿El botón no funciona? Usa este enlace:</p>
                    <a href="${recoveryLink}" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.fuchsia};text-decoration:underline;word-break:break-all;">Haz clic aquí para restablecer tu contraseña</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background:${BRAND.black};padding:28px 40px;text-align:center;border-top:1px solid #1E1E1E;">
              <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:${BRAND.fuchsia};letter-spacing:1px;text-transform:uppercase;">Street Candy's</p>
              <p style="margin:0 0 14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#AAAAAA;letter-spacing:0.5px;">Made for the Crew.</p>
              <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#555555;">
                <a href="${BRAND.siteUrl}/privacidad" style="color:#666666;text-decoration:none;">Privacidad</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${BRAND.siteUrl}/terminos" style="color:#666666;text-decoration:none;">Términos</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${BRAND.siteUrl}/contacto" style="color:#666666;text-decoration:none;">Contacto</a>
              </p>
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#444444;">© Street Candy's 2026</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
