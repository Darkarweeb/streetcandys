/**
 * Street Candy's — Rewards Email Templates
 * Points earned, tier updates, available rewards
 */

export interface RewardsEmailData {
  fullName: string;
  email: string;
  pointsEarned?: number;
  totalPoints?: number;
  tierName?: string;
  rewardTitle?: string;
  rewardDescription?: string;
}

export function getPointsEarnedHtml(data: RewardsEmailData): string {
  const firstName = data.fullName?.split(' ')[0] || 'Amigo';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>¡Puntos Ganados! — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#fff0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff0f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1.5px solid #ffd6e8;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:44px;margin-bottom:10px;">🏆</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;">¡Puntos Ganados!</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Programa de Recompensas — Street Candy's</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                ¡Hola <strong style="color:#1a1a1a;">${firstName}</strong>! 🎉
              </p>

              ${data.pointsEarned ? `
              <div style="background:linear-gradient(135deg,#fff0f5 0%,#ffe4ef 100%);border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;border:1.5px solid #ffd6e8;">
                <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Puntos ganados</p>
                <p style="margin:0;font-size:48px;font-weight:900;color:#e91e8c;">+${data.pointsEarned}</p>
                ${data.totalPoints ? `<p style="margin:8px 0 0;font-size:13px;color:#888;">Total acumulado: <strong style="color:#1a1a1a;">${data.totalPoints} puntos</strong></p>` : ''}
              </div>` : ''}

              <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
                Sigue comprando para acumular más puntos y desbloquear recompensas exclusivas del crew.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://streetcandys.shop/cuenta/recompensas"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:50px;">
                      Ver mis recompensas
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff8fb;padding:20px 32px;text-align:center;border-top:1.5px solid #ffd6e8;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#e91e8c;">Street Candy's</p>
              <p style="margin:0;font-size:11px;color:#ccc;">
                <a href="https://streetcandys.shop/privacidad" style="color:#e91e8c;text-decoration:none;">Privacidad</a>
                &nbsp;·&nbsp;
                <a href="https://streetcandys.shop/terminos" style="color:#e91e8c;text-decoration:none;">Términos</a>
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
