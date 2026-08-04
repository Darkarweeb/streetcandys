/**
 * Street Candy — Order Status Tracking
 * Shared constants, labels, colors, and WhatsApp message templates.
 */

// ============================================================
// STATUS ENUM & TYPES
// ============================================================

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'driver_assigned',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Legacy statuses from existing schema (kept for backward compat)
export const ALL_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'driver_assigned',
  'out_for_delivery',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type AnyOrderStatus = typeof ALL_STATUSES[number];

// ============================================================
// LABELS
// ============================================================

export const ESTADO_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  driver_assigned: 'Conductor asignado',
  out_for_delivery: 'En camino',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

// ============================================================
// COLORS (Tailwind classes)
// ============================================================

export const ESTADO_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-teal-100 text-teal-800',
  driver_assigned: 'bg-violet-100 text-violet-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

// ============================================================
// PROGRESS TRACKER STEPS (ordered)
// ============================================================

export interface ProgressStep {
  key: string;
  label: string;
  icon: string;
}

export const PROGRESS_STEPS: ProgressStep[] = [
  { key: 'pending', label: 'Recibido', icon: '📋' },
  { key: 'confirmed', label: 'Confirmado', icon: '✅' },
  { key: 'preparing', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'ready', label: 'Listo', icon: '📦' },
  { key: 'driver_assigned', label: 'Conductor', icon: '🛵' },
  { key: 'out_for_delivery', label: 'En camino', icon: '🚚' },
  { key: 'delivered', label: 'Entregado', icon: '🎉' },
];

// Map legacy statuses to progress step index
const STATUS_TO_STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  processing: 2, // legacy alias
  ready: 3,
  driver_assigned: 4,
  out_for_delivery: 5,
  shipped: 5, // legacy alias
  delivered: 6,
};

export function getProgressIndex(status: string): number {
  return STATUS_TO_STEP_INDEX[status] ?? -1;
}

export function isTerminalStatus(status: string): boolean {
  return status === 'cancelled' || status === 'refunded';
}

// ============================================================
// STATUS HISTORY ITEM
// ============================================================

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
}

// ============================================================
// WHATSAPP MESSAGE TEMPLATES (centralized)
// ============================================================

export const WHATSAPP_STATUS_MESSAGES: Partial<Record<string, (orderNumber: string) => string>> = {
  confirmed: (n) =>
    `✅ Tu pedido #${n} ha sido confirmado. ¡Gracias por tu compra en Street Candy! 🍬`,
  preparing: (n) =>
    `👨‍🍳 Estamos preparando tu pedido #${n}. ¡Pronto estará listo!`,
  ready: (n) =>
    `📦 Tu pedido #${n} está listo y esperando al conductor.`,
  driver_assigned: (n) =>
    `🛵 Se ha asignado un conductor para tu pedido #${n}. ¡Ya va en camino!`,
  out_for_delivery: (n) =>
    `🚚 Tu pedido #${n} está en camino. ¡Prepárate para recibirlo!`,
  delivered: (n) =>
    `🎉 Tu pedido #${n} ha sido entregado. ¡Esperamos que lo disfrutes! 🍬`,
  cancelled: (n) =>
    `❌ Tu pedido #${n} ha sido cancelado. Si tienes preguntas, contáctanos.`,
};

// ============================================================
// NOTIFICATION TYPES PER STATUS
// ============================================================

export const STATUS_NOTIFICATION_TYPE: Partial<Record<string, string>> = {
  confirmed: 'order_confirmed',
  preparing: 'order_preparing',
  ready: 'order_ready',
  driver_assigned: 'order_driver_assigned',
  out_for_delivery: 'order_out_for_delivery',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
  refunded: 'order_refunded',
};

export const STATUS_NOTIFICATION_TITLE: Partial<Record<string, string>> = {
  confirmed: 'Pedido confirmado',
  preparing: 'Preparando tu pedido',
  ready: 'Pedido listo',
  driver_assigned: 'Conductor asignado',
  out_for_delivery: 'Pedido en camino',
  delivered: 'Pedido entregado',
  cancelled: 'Pedido cancelado',
  refunded: 'Reembolso procesado',
};

export const STATUS_NOTIFICATION_BODY: Partial<Record<string, (n: string) => string>> = {
  confirmed: (n) => `Tu pedido #${n} ha sido confirmado.`,
  preparing: (n) => `Estamos preparando tu pedido #${n}.`,
  ready: (n) => `Tu pedido #${n} está listo.`,
  driver_assigned: (n) => `Se asignó un conductor para tu pedido #${n}.`,
  out_for_delivery: (n) => `Tu pedido #${n} está en camino.`,
  delivered: (n) => `Tu pedido #${n} ha sido entregado. ¡Disfrútalo!`,
  cancelled: (n) => `Tu pedido #${n} ha sido cancelado.`,
  refunded: (n) => `El reembolso de tu pedido #${n} ha sido procesado.`,
};
