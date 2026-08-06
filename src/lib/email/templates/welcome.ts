/**
 * Street Candy's — Welcome Email Template
 * "Bienvenido al Crew" — Premium Branded System
 */

export interface WelcomeEmailData {
  fullName: string;
  email: string;
  verificationLink?: string;
}

// ─── Shared brand primitives ─────────────────────────────────────────────────

const BRAND = {
  black: '#0A0A0A',
  fuchsia: '#E91E8C',
  fuchsiaDark: '#C2185B',
  green: '#4CAF50',
  greenDark: '#388E3C',
  white: '#FFFFFF',
  offWhite: '#F9F9F9',
  border: '#1E1E1E',
  textMuted: '#888888',
  textLight: '#AAAAAA',
  siteUrl: 'https://streetcandys.shop',
};

// ─── Shared header block ─────────────────────────────────────────────────────

function headerBlock(): string {
  return `
  <!-- ═══ HEADER ═══ -->
  <tr>
    <td style="background:${BRAND.black};padding:36px 40px 28px;text-align:center;border-bottom:3px solid ${BRAND.fuchsia};">
      <!-- Logo SVG inline -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <!-- Wordmark -->
            <div style="display:inline-block;">
              <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:900;color:${BRAND.white};letter-spacing:2px;text-transform:uppercase;">STREET</span>
              <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:900;color:${BRAND.fuchsia};letter-spacing:2px;text-transform:uppercase;"> CANDY'S</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="display:inline-block;background:${BRAND.fuchsia};color:${BRAND.white};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 14px;border-radius:20px;">PREMIUM HEMP &amp; CANNABIS</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Shared footer block ─────────────────────────────────────────────────────

function footerBlock(): string {
  return `
  <!-- ═══ FOOTER ═══ -->
  <tr>
    <td style="background:${BRAND.black};padding:28px 40px;text-align:center;border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:${BRAND.fuchsia};letter-spacing:1px;text-transform:uppercase;">Street Candy's</p>
      <p style="margin:0 0 14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.textLight};letter-spacing:0.5px;">Made for the Crew.</p>
      <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#555555;">
        <a href="${BRAND.siteUrl}/privacidad" style="color:#666666;text-decoration:none;">Privacidad</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${BRAND.siteUrl}/terminos" style="color:#666666;text-decoration:none;">Términos</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${BRAND.siteUrl}/contacto" style="color:#666666;text-decoration:none;">Contacto</a>
      </p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#444444;">© Street Candy's 2026</p>
    </td>
  </tr>`;
}

// ─── Welcome Email HTML ──────────────────────────────────────────────────────

export function getWelcomeEmailHtml({ fullName, verificationLink }: WelcomeEmailData): string {
  const firstName = fullName?.split(' ')[0] || 'Amigo';

  // ── Verification / Activation section ──────────────────────────────────────
  const activationSection = verificationLink
    ? `
      <!-- ═══ ACTIVATION BANNER ═══ -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-radius:12px;overflow:hidden;border:1.5px solid ${BRAND.fuchsia};">
        <tr>
          <td style="background:${BRAND.fuchsia};padding:14px 24px;text-align:center;">
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:900;color:${BRAND.white};letter-spacing:1px;text-transform:uppercase;">Activa tu cuenta para acceder al crew</p>
          </td>
        </tr>
        <tr>
          <td style="background:#111111;padding:24px 28px;text-align:center;">
            <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#CCCCCC;line-height:1.7;">
              Un solo clic y ya eres parte oficial del crew.<br/>
              Confirma tu correo para desbloquear todos los beneficios.
            </p>
            <!-- CTA Button -->
            <a href="${verificationLink}"
               style="display:inline-block;background:${BRAND.fuchsia};color:${BRAND.white};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:900;text-decoration:none;padding:16px 44px;border-radius:6px;letter-spacing:2px;text-transform:uppercase;">
              ACTIVAR MI CUENTA
            </a>
            <!-- Backup link -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td style="border-top:1px solid #222222;padding-top:16px;text-align:center;">
                  <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#666666;letter-spacing:0.5px;">¿El botón no funciona? Usa este enlace:</p>
                  <a href="${verificationLink}" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.fuchsia};text-decoration:underline;word-break:break-all;">Haz clic aquí para activar tu cuenta</a>
                  <p style="margin:10px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;color:#555555;">Este enlace expira en 24 horas.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido al Crew — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#161616;border-radius:16px;overflow:hidden;border:1px solid #222222;">

          ${headerBlock()}

          <!-- ═══ HERO GREETING ═══ -->
          <tr>
            <td style="background:#161616;padding:40px 40px 8px;text-align:center;">
              <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:900;color:${BRAND.white};letter-spacing:-0.5px;">Bienvenido al Crew,</p>
              <p style="margin:0 0 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:900;color:${BRAND.fuchsia};letter-spacing:-0.5px;">${firstName}.</p>
              <p style="margin:0 0 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#AAAAAA;line-height:1.7;max-width:440px;margin-left:auto;margin-right:auto;">
                Tu cuenta en <strong style="color:${BRAND.white};">Street Candy's</strong> ha sido creada.
                Eres parte de nuestra comunidad de cultura callejera y bienestar premium con hemp y cannabis.
              </p>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding:0 40px 40px;">

              ${activationSection}

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px solid #222222;"></td>
                </tr>
              </table>

              <!-- Benefits heading -->
              <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:${BRAND.fuchsia};letter-spacing:3px;text-transform:uppercase;">Lo que te espera en el crew</p>

              <!-- Benefit 1 — Welcome Coupon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#1A1A1A;border-radius:10px;border:1px solid #252525;">
                <tr>
                  <td width="56" style="padding:16px 0 16px 20px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:${BRAND.fuchsia};border-radius:8px;text-align:center;line-height:40px;font-size:20px;">🎟️</div>
                  </td>
                  <td style="padding:16px 20px 16px 12px;vertical-align:middle;">
                    <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};">Cupón de Bienvenida</p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#888888;line-height:1.5;">Descuento exclusivo en tu primera compra como miembro del crew.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 2 — Rewards Program -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#1A1A1A;border-radius:10px;border:1px solid #252525;">
                <tr>
                  <td width="56" style="padding:16px 0 16px 20px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:${BRAND.green};border-radius:8px;text-align:center;line-height:40px;font-size:20px;">🏆</div>
                  </td>
                  <td style="padding:16px 20px 16px 12px;vertical-align:middle;">
                    <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};">Programa de Recompensas</p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#888888;line-height:1.5;">Acumula puntos en cada compra y canjéalos por descuentos reales.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 3 — Exclusive Drops -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#1A1A1A;border-radius:10px;border:1px solid #252525;">
                <tr>
                  <td width="56" style="padding:16px 0 16px 20px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:${BRAND.fuchsia};border-radius:8px;text-align:center;line-height:40px;font-size:20px;">🔥</div>
                  </td>
                  <td style="padding:16px 20px 16px 12px;vertical-align:middle;">
                    <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};">Exclusive Drops</p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#888888;line-height:1.5;">Acceso anticipado a lanzamientos y ediciones limitadas del crew.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 4 — Hemp & Cannabis Deals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;background:#1A1A1A;border-radius:10px;border:1px solid #252525;">
                <tr>
                  <td width="56" style="padding:16px 0 16px 20px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:${BRAND.green};border-radius:8px;text-align:center;line-height:40px;font-size:20px;">🌿</div>
                  </td>
                  <td style="padding:16px 20px 16px 12px;vertical-align:middle;">
                    <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};">Hemp &amp; Cannabis Deals</p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#888888;line-height:1.5;">Ofertas exclusivas en productos premium de hemp y cannabis para el crew.</p>
                  </td>
                </tr>
              </table>

              <!-- Explore CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${BRAND.siteUrl}/productos"
                       style="display:inline-block;background:${BRAND.green};color:${BRAND.white};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;letter-spacing:2px;text-transform:uppercase;">
                      EXPLORAR PRODUCTOS
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${footerBlock()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Welcome Email Plain Text ────────────────────────────────────────────────

export function getWelcomeEmailText({ fullName, verificationLink }: WelcomeEmailData): string {
  const firstName = fullName?.split(' ')[0] || 'Amigo';
  const verifyBlock = verificationLink
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nACTIVAR MI CUENTA\n${verificationLink}\n(Este enlace expira en 24 horas)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    : '';

  return `BIENVENIDO AL CREW, ${firstName.toUpperCase()}.

Tu cuenta en Street Candy's ha sido creada exitosamente.
${verifyBlock}
LO QUE TE ESPERA EN EL CREW:

🎟️  Cupón de Bienvenida — Descuento exclusivo en tu primera compra
🏆  Programa de Recompensas — Acumula puntos en cada compra
🔥  Exclusive Drops — Acceso anticipado a lanzamientos limitados
🌿  Hemp & Cannabis Deals — Ofertas premium solo para el crew

Explora nuestros productos:
${BRAND.siteUrl}/productos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© Street Candy's 2026 — Made for the Crew.
${BRAND.siteUrl}`;
}
