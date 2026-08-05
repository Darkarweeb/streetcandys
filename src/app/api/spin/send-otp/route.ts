import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient, FROM_EMAIL } from '@/lib/email/client';

// ── Generate a 6-digit numeric OTP ───────────────────────────────────────────
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── OTP email HTML ────────────────────────────────────────────────────────────
function getOTPEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu código de verificación — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFCF8;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(22,51,23,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:#163317;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#FFFCF8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🎉 Oferta exclusiva</p>
              <h1 style="margin:0;color:#FFFCF8;font-size:26px;font-weight:900;letter-spacing:-0.5px;">¡Casi tienes tu premio!</h1>
              <p style="margin:8px 0 0;color:rgba(255,252,248,0.70);font-size:14px;">Ingresa el código para activar tu descuento</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 24px;color:#163317;font-size:15px;line-height:1.6;">
                Usa este código de verificación en la ruleta de Street Candy's. Válido por <strong>10 minutos</strong>.
              </p>
              <!-- OTP Code -->
              <div style="background:#F5F0E8;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 8px;color:#163317;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Tu código de verificación</p>
                <p style="margin:0;color:#163317;font-size:48px;font-weight:900;letter-spacing:12px;font-family:monospace;">${code}</p>
              </div>
              <p style="margin:0;color:#8A8A7A;font-size:13px;line-height:1.6;">
                Si no solicitaste este código, puedes ignorar este correo. El código expirará automáticamente.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid #E8E3DA;">
              <p style="margin:0;color:#8A8A7A;font-size:12px;">
                © Street Candy's · <a href="https://streetcandys.shop" style="color:#163317;text-decoration:none;">streetcandys.shop</a>
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

// ── POST /api/spin/send-otp ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let body: { email: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
    }

    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: 'Correo requerido' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // ── Check if email already spun (don't send OTP if already participated) ──
    const { data: existingLead } = await adminClient
      .from('spin_leads')
      .select('id, coupon_code, prize_label')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingLead) {
      return NextResponse.json(
        {
          error: 'already_spun',
          message: 'Este correo ya participó en la ruleta.',
          existingPrize: existingLead.prize_label,
          existingCoupon: existingLead.coupon_code,
        },
        { status: 409 }
      );
    }

    // ── Rate-limit: max 1 OTP per email per 60 seconds ────────────────────────
    const { data: recentOTP } = await adminClient
      .from('spin_otp_codes')
      .select('created_at')
      .eq('email', normalizedEmail)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOTP) {
      const secondsAgo = Math.floor((Date.now() - new Date(recentOTP.created_at).getTime()) / 1000);
      const waitSeconds = 60 - secondsAgo;
      return NextResponse.json(
        { error: 'rate_limited', waitSeconds, message: `Espera ${waitSeconds} segundos antes de solicitar otro código.` },
        { status: 429 }
      );
    }

    // ── Invalidate any previous unused codes for this email ───────────────────
    await adminClient
      .from('spin_otp_codes')
      .delete()
      .eq('email', normalizedEmail)
      .eq('verified', false);

    // ── Generate and store new OTP ────────────────────────────────────────────
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error: insertError } = await adminClient.from('spin_otp_codes').insert({
      email: normalizedEmail,
      code,
      verified: false,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('spin_otp_codes insert error:', insertError);
      return NextResponse.json({ error: 'Error al generar el código' }, { status: 500 });
    }

    // ── Send OTP via Resend ───────────────────────────────────────────────────
    try {
      const resend = getResendClient();
      const { error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: `${code} — Tu código de verificación · Street Candy's`,
        html: getOTPEmailHtml(code),
      });

      if (emailError) {
        console.error('Resend OTP send error:', emailError);
        // Delete the stored code so user can retry
        await adminClient.from('spin_otp_codes').delete().eq('email', normalizedEmail).eq('code', code);
        return NextResponse.json({ error: 'No se pudo enviar el código. Verifica tu correo e intenta de nuevo.' }, { status: 500 });
      }
    } catch (emailErr) {
      console.error('Resend OTP unexpected error:', emailErr);
      await adminClient.from('spin_otp_codes').delete().eq('email', normalizedEmail).eq('code', code);
      return NextResponse.json({ error: 'No se pudo enviar el código. Intenta de nuevo.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Código enviado. Revisa tu bandeja de entrada.' });
  } catch (err) {
    console.error('send-otp unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
