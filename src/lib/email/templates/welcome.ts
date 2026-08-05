/**
 * Street Candy's — Welcome Email Template
 * "Bienvenido al Crew"
 */

export interface WelcomeEmailData {
  fullName: string;
  email: string;
  verificationLink?: string;
}

export function getWelcomeEmailHtml({ fullName, verificationLink }: WelcomeEmailData): string {
  const firstName = fullName?.split(' ')[0] || 'Amigo';

  const verifySection = verificationLink
    ? `
              <!-- Verification Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-radius:16px;overflow:hidden;border:2px solid #e91e8c;">
                <tr>
                  <td style="background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);padding:16px 24px;text-align:center;">
                    <p style="margin:0;font-size:15px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">✉️ Verifica tu correo para activar tu cuenta</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#fff8fb;padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 16px;font-size:13px;color:#555;line-height:1.6;">
                      Tu cuenta en <strong style="color:#e91e8c;">Street Candy's</strong> no estará activa hasta que confirmes tu correo electrónico.
                      Haz clic en el botón de abajo para verificar tu dirección y empezar a disfrutar todos los beneficios del crew.
                    </p>
                    <a href="${verificationLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                      ✅ Verificar mi correo
                    </a>
                    <p style="margin:16px 0 0;font-size:11px;color:#aaa;line-height:1.6;">
                      Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.<br/>
                      Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                      <a href="${verificationLink}" style="color:#e91e8c;word-break:break-all;font-size:11px;">${verificationLink}</a>
                    </p>
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
<body style="margin:0;padding:0;background:#fff0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff0f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1.5px solid #ffd6e8;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);padding:40px 32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🍬</div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">Bienvenido al Crew</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Street Candy's — Premium Hemp Wellness</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">¡Hola, ${firstName}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Tu cuenta en <strong style="color:#e91e8c;">Street Candy's</strong> ha sido creada exitosamente.
                Ya eres parte de nuestro crew de bienestar premium con hemp y cannabis.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1.5px solid #ffd6e8;margin:0 0 24px;" />

              ${verifySection}

              <!-- Benefits -->
              <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;">Lo que te espera en el crew:</p>

              <!-- Benefit 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="48" style="vertical-align:top;">
                    <div style="width:40px;height:40px;background:#fff0f5;border-radius:12px;text-align:center;line-height:40px;font-size:20px;">🏆</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">Programa de Recompensas</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#888;">Acumula puntos en cada compra y canjéalos por descuentos exclusivos.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="48" style="vertical-align:top;">
                    <div style="width:40px;height:40px;background:#fff0f5;border-radius:12px;text-align:center;line-height:40px;font-size:20px;">🎁</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">Descuentos Exclusivos</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#888;">Ofertas especiales y promociones solo para miembros del crew.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="48" style="vertical-align:top;">
                    <div style="width:40px;height:40px;background:#fff0f5;border-radius:12px;text-align:center;line-height:40px;font-size:20px;">🌿</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">Contenido Educativo</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#888;">Guías, artículos y recursos sobre hemp, CBD y bienestar natural.</p>
                  </td>
                </tr>
              </table>

              <!-- Benefit 4 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="48" style="vertical-align:top;">
                    <div style="width:40px;height:40px;background:#fff0f5;border-radius:12px;text-align:center;line-height:40px;font-size:20px;">🚀</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">Acceso Anticipado</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#888;">Sé el primero en conocer nuevos productos y lanzamientos especiales.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://streetcandys.shop/productos"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;">
                      🍭 Explorar Productos
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1.5px solid #ffd6e8;margin:0 0 20px;" />

              <!-- Educational note -->
              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                En Street Candy's creemos en el poder del hemp y el cannabis para el bienestar natural.
                Todos nuestros productos son de calidad premium, con certificaciones de laboratorio y
                elaborados con los más altos estándares.
              </p>
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                Visita nuestro <a href="https://streetcandys.shop/blog" style="color:#e91e8c;text-decoration:none;font-weight:600;">blog educativo</a>
                para aprender más sobre los beneficios del hemp y el bienestar natural.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff8fb;padding:24px 32px;text-align:center;border-top:1.5px solid #ffd6e8;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#e91e8c;">Street Candy's</p>
              <p style="margin:0 0 12px;font-size:12px;color:#aaa;">Premium Hemp Wellness</p>
              <p style="margin:0;font-size:11px;color:#ccc;line-height:1.6;">
                Recibiste este correo porque creaste una cuenta en Street Candy's.<br/>
                <a href="https://streetcandys.shop/privacidad" style="color:#e91e8c;text-decoration:none;">Política de privacidad</a>
                &nbsp;·&nbsp;
                <a href="https://streetcandys.shop/terminos" style="color:#e91e8c;text-decoration:none;">Términos y condiciones</a>
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

export function getWelcomeEmailText({ fullName, verificationLink }: WelcomeEmailData): string {
  const firstName = fullName?.split(' ')[0] || 'Amigo';
  const verifyBlock = verificationLink
    ? `\n⚠️ IMPORTANTE: Debes verificar tu correo para activar tu cuenta.\nHaz clic aquí para verificar: ${verificationLink}\n(Este enlace expira en 24 horas)\n`
    : '';

  return `¡Bienvenido al Crew, ${firstName}!

Tu cuenta en Street Candy's ha sido creada exitosamente.
${verifyBlock}
Lo que te espera:
🏆 Programa de Recompensas — Acumula puntos en cada compra
🎁 Descuentos Exclusivos — Ofertas solo para miembros del crew
🌿 Contenido Educativo — Guías sobre hemp y bienestar
🚀 Acceso Anticipado — Primero en conocer nuevos productos

Explora nuestros productos: https://streetcandys.shop/productos

Street Candy's — Premium Hemp Wellness
https://streetcandys.shop`;
}
