/**
 * buildWhatsAppOrderMessage
 *
 * Single shared function that generates the full WhatsApp order message.
 * Used by:
 *   - Checkout page (auto-open after order creation)
 *   - Order confirmation page (fallback "Contactar por WhatsApp" button)
 *
 * Rules:
 *   - UTF-8 safe: no emoji codepoints that break in WhatsApp URL encoding
 *   - All text uses plain ASCII + safe characters only
 *   - Phone number must come from Admin Dashboard config (passed as argument)
 */

export interface WhatsAppOrderItem {
  name: string;
  qty: number;
  price: string; // formatted price string or raw number string
  unit_price?: number;
}

export interface WhatsAppOrderData {
  orderNumber: string;
  orderDate?: string | null;
  customerName: string;
  phone: string;
  email: string;
  country: string; // 'CO' | 'CR' or full name
  state: string;
  city: string;
  address: string;
  deliveryMethod: string;
  shippingCost: number;
  couponCode?: string | null;
  discountAmount: number;
  subtotal: number;
  tax?: number;
  tip?: number;
  total: number;
  currency: string; // 'COP' | 'CRC'
  items: WhatsAppOrderItem[];
  notes?: string | null;
  paymentMethod?: string | null;
  requirePaymentMethod?: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Tarjeta de credito / debito',
  nequi: 'Nequi',
  pse: 'PSE',
  bancolombia: 'Bancolombia',
  sinpe_movil: 'SINPE Movil',
  stripe: 'Tarjeta de credito / debito',
  bank_transfer: 'Transferencia bancaria',
};

function fmtCurrency(amount: number, currency: string): string {
  const symbol = currency === 'CRC' ? '\u20A1' : '$';
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')} ${currency}`;
}

function fmtDate(isoString?: string | null): string {
  if (!isoString) {
    // Use a stable server-safe date format
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  try {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return isoString;
  }
}

/**
 * Builds the full WhatsApp order message.
 * Returns a plain UTF-8 string safe for encodeURIComponent.
 */
export function buildWhatsAppOrderMessage(order: WhatsAppOrderData): string {
  const { currency } = order;

  const lines: string[] = [
    '----------------------------------------',
    '  STREET CANDY\'S - NUEVO PEDIDO',
    '----------------------------------------',
    '',
    `Pedido: ${order.orderNumber || 'Pendiente'}`,
    `Fecha:  ${fmtDate(order.orderDate)}`,
    '',
    '[ CLIENTE ]',
    `Nombre:   ${order.customerName}`,
    `Telefono: ${order.phone}`,
    `Email:    ${order.email}`,
    '',
    '[ ENTREGA ]',
    `Pais:        ${order.country}`,
    `Depto/Prov:  ${order.state}`,
    `Ciudad:      ${order.city}`,
    `Direccion:   ${order.address}`,
    `Metodo:      ${order.deliveryMethod}`,
  ];

  if (order.notes) {
    lines.push(`Notas:       ${order.notes}`);
  }

  lines.push(
    '',
    '[ PRODUCTOS ]',
    '----------------------------------------',
  );

  if (order.items.length > 0) {
    order.items.forEach((item) => {
      const unitPrice =
        item.unit_price != null
          ? item.unit_price
          : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
      const lineTotal = unitPrice * item.qty;
      lines.push(`* ${item.name}`);
      lines.push(`  Cantidad:    ${item.qty}`);
      lines.push(`  Precio unit: ${fmtCurrency(unitPrice, currency)}`);
      lines.push(`  Subtotal:    ${fmtCurrency(lineTotal, currency)}`);
      lines.push('');
    });
  } else {
    lines.push('  (sin productos)');
    lines.push('');
  }

  lines.push(
    '[ RESUMEN ]',
    '----------------------------------------',
    `Subtotal:  ${fmtCurrency(order.subtotal, currency)}`,
    `Envio:     ${order.shippingCost === 0 ? 'Gratis' : fmtCurrency(order.shippingCost, currency)}`,
  );

  if (order.couponCode) {
    lines.push(`Cupon:     ${order.couponCode}`);
    if (order.discountAmount > 0) {
      lines.push(`Descuento: -${fmtCurrency(order.discountAmount, currency)}`);
    }
  }

  if (order.tip && order.tip > 0) {
    lines.push(`Propina:   ${fmtCurrency(order.tip, currency)}`);
  }

  if (order.tax && order.tax > 0) {
    lines.push(`Impuestos: ${fmtCurrency(order.tax, currency)}`);
  }

  lines.push(
    '----------------------------------------',
    `TOTAL:     ${fmtCurrency(order.total, currency)}`,
    '',
    '[ PAGO ]',
  );

  if (order.requirePaymentMethod && order.paymentMethod) {
    lines.push(`Metodo: ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`);
  } else {
    lines.push('El pago sera coordinado a traves de esta conversacion de WhatsApp.');
  }

  lines.push(
    '',
    '----------------------------------------',
    'Gracias por tu pedido en Street Candy\'s!',
    'El equipo te contactara para confirmar.',
    '----------------------------------------',
  );

  return lines.join('\n');
}

/**
 * Builds the WhatsApp URL with the full order message.
 * @param phone - Phone number (digits only, e.g. "573115397983")
 * @param order - Full order data
 */
export function buildWhatsAppOrderUrl(phone: string, order: WhatsAppOrderData): string {
  const message = buildWhatsAppOrderMessage(order);
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
