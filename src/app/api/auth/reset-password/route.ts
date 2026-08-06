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
      subject: "Recupera tu contraseña — Street Candy's",
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

function getRecoveryEmailHtml(recoveryLink: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recupera tu contraseña — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Street Candy's</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Premium Cannabis Dispensary</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1a1a1a;">Recupera tu contraseña</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en
                <strong style="color:#e91e8c;">Street Candy's</strong>.
                Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${recoveryLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:16px;font-weight:900;text-decoration:none;padding:16px 48px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                      🔑 Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña no será modificada.
              </p>
              <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="${recoveryLink}" style="color:#e91e8c;word-break:break-all;font-size:11px;">${recoveryLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © 2025 Street Candy's · <a href="https://streetcandys.shop" style="color:#e91e8c;text-decoration:none;">streetcandys.shop</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
