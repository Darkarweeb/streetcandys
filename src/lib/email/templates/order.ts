/**
 * Street Candy's — Order Email Templates
 * Confirmation, Processing, Shipped, Delivered
 */

export interface OrderEmailData {
  fullName: string;
  email: string;
  orderNumber: string;
  total: string;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  shippingAddress?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

function getOrderBaseHtml(
  title: string,
  subtitle: string,
  headerEmoji: string,
  headerGradient: string,
  bodyContent: string,
  data: OrderEmailData,
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Street Candy's</title>
</head>
<body style="margin:0;padding:0;background:#fff0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff0f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1.5px solid #ffd6e8;">

          <!-- Header -->
          <tr>
            <td style="background:${headerGradient};padding:36px 32px;text-align:center;">
              <div style="font-size:44px;margin-bottom:10px;">${headerEmoji}</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;">${title}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${subtitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                Hola <strong style="color:#1a1a1a;">${data.fullName?.split(' ')[0] || 'Amigo'}</strong>,
              </p>

              ${bodyContent}

              <!-- Order Summary -->
              <div style="background:#fff8fb;border-radius:16px;padding:20px;margin:20px 0;border:1px solid #ffd6e8;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;">Resumen del Pedido</p>
                <p style="margin:0 0 4px;font-size:13px;color:#888;">Número de orden: <strong style="color:#e91e8c;">#${data.orderNumber}</strong></p>
                ${data.items.map(item => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ffd6e8;">
                  <span style="font-size:13px;color:#555;">${item.name} × ${item.quantity}</span>
                  <span style="font-size:13px;font-weight:600;color:#1a1a1a;">${item.price}</span>
                </div>`).join('')}
                <div style="padding-top:10px;text-align:right;">
                  <span style="font-size:15px;font-weight:900;color:#e91e8c;">Total: ${data.total} ${data.currency}</span>
                </div>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://streetcandys.shop/cuenta/pedidos"
                       style="display:inline-block;background:linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:50px;">
                      Ver mi pedido
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
              <p style="margin:0;font-size:11px;color:#ccc;line-height:1.6;">
                <a href="https://streetcandys.shop/privacidad" style="color:#e91e8c;text-decoration:none;">Privacidad</a>
                &nbsp;·&nbsp;
                <a href="https://streetcandys.shop/terminos" style="color:#e91e8c;text-decoration:none;">Términos</a>
                &nbsp;·&nbsp;
                <a href="https://streetcandys.shop/contacto" style="color:#e91e8c;text-decoration:none;">Contacto</a>
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

export function getOrderConfirmationHtml(data: OrderEmailData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
      ¡Tu pedido ha sido recibido y confirmado! Estamos preparando todo con mucho cuidado para ti. 🌿
    </p>
    ${data.shippingAddress ? `
    <div style="background:#f0fff4;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:13px;color:#166534;"><strong>📍 Dirección de envío:</strong> ${data.shippingAddress}</p>
    </div>` : ''}
  `;
  return getOrderBaseHtml(
    '¡Pedido Confirmado!',
    `Orden #${data.orderNumber} — Street Candy's`,
    '🎉',
    'linear-gradient(135deg,#e91e8c 0%,#ff69b4 100%)',
    body,
    data,
  );
}

export function getOrderProcessingHtml(data: OrderEmailData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
      Tu pedido está siendo preparado con los más altos estándares de calidad. 
      Nuestro equipo está empacando tus productos premium de hemp con mucho amor. 🌿✨
    </p>
  `;
  return getOrderBaseHtml(
    'Preparando tu Pedido',
    `Orden #${data.orderNumber} — En proceso`,
    '⚙️',
    'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
    body,
    data,
  );
}

export function getOrderShippedHtml(data: OrderEmailData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
      ¡Tu pedido está en camino! 🚚 Ya fue despachado y pronto llegará a tu puerta.
    </p>
    ${data.trackingNumber ? `
    <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid #bfdbfe;">
      <p style="margin:0;font-size:13px;color:#1e40af;"><strong>📦 Número de seguimiento:</strong> ${data.trackingNumber}</p>
    </div>` : ''}
    ${data.estimatedDelivery ? `
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:13px;color:#166534;"><strong>📅 Entrega estimada:</strong> ${data.estimatedDelivery}</p>
    </div>` : ''}
  `;
  return getOrderBaseHtml(
    '¡Tu Pedido va en Camino!',
    `Orden #${data.orderNumber} — Enviado`,
    '🚚',
    'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)',
    body,
    data,
  );
}

export function getOrderDeliveredHtml(data: OrderEmailData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
      ¡Tu pedido fue entregado! 🎉 Esperamos que disfrutes tus productos premium de hemp.
      No olvides que puedes acumular puntos de recompensas con cada compra.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:13px;color:#166534;">
        ⭐ <strong>¿Te gustó tu pedido?</strong> Déjanos una reseña y gana puntos extra en tu cuenta.
      </p>
    </div>
  `;
  return getOrderBaseHtml(
    '¡Pedido Entregado!',
    `Orden #${data.orderNumber} — Completado`,
    '✅',
    'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
    body,
    data,
  );
}
