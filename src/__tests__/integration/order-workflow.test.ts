/**
 * Integration Tests — Full Order Workflow
 *
 * Simulates the complete order lifecycle:
 * Pending → Confirmed → Preparing → Ready → Driver Assigned
 * → Out for Delivery → Delivered
 *
 * Verifies after every transition:
 *  - status updated correctly
 *  - statusUpdatedAt updated
 *  - statusHistory appended
 *  - notification created
 *  - WhatsApp message generated
 *  - customer sees the new status
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DbOrden, EstadoOrden, StatusHistoryItem } from '@/lib/payment/types';
import {
  WHATSAPP_STATUS_MESSAGES,
  STATUS_NOTIFICATION_TYPE,
  STATUS_NOTIFICATION_TITLE,
  STATUS_NOTIFICATION_BODY,
  getProgressIndex,
  isTerminalStatus,
} from '@/lib/order-status';

// ─── In-memory order store ────────────────────────────────────

interface InMemoryOrder extends DbOrden {
  notifications: Array<{ type: string; title: string; body: string }>;
  whatsappMessages: string[];
}

function createInMemoryOrder(): InMemoryOrder {
  return {
    id: 'integration-order-1',
    order_number: 'SC-INT-001',
    profile_id: 'customer-uuid-1',
    country_code: 'CO',
    shipping_address_id: 'addr-1',
    billing_address_id: null,
    status: 'pending',
    payment_status: 'paid',
    payment_method: 'stripe',
    payment_reference: 'pi_test_integration',
    subtotal: 80000,
    discount_amount: 0,
    shipping_cost: 12000,
    tax_amount: 15200,
    tax_rate_snapshot: 0.19,
    total: 107200,
    currency_code: 'COP',
    coupon_id: null,
    coupon_code_snapshot: null,
    notes: null,
    tracking_number: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    status_updated_at: null,
    estimated_delivery_time: null,
    status_history: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notifications: [],
    whatsappMessages: [],
  };
}

// ─── Simulate status transition ───────────────────────────────

function applyStatusTransition(
  order: InMemoryOrder,
  newStatus: EstadoOrden,
  nota?: string,
  eta?: string,
): InMemoryOrder {
  const now = new Date().toISOString();

  // Append to history
  const historyItem: StatusHistoryItem = {
    status: newStatus,
    timestamp: now,
    ...(nota ? { note: nota } : {}),
  };

  const updatedOrder: InMemoryOrder = {
    ...order,
    status: newStatus,
    status_updated_at: now,
    updated_at: now,
    status_history: [...order.status_history, historyItem],
    notifications: [...order.notifications],
    whatsappMessages: [...order.whatsappMessages],
  };

  if (eta) updatedOrder.estimated_delivery_time = eta;
  if (newStatus === 'cancelled') updatedOrder.cancelled_at = now;
  if (newStatus === 'delivered') updatedOrder.delivered_at = now;
  if (newStatus === 'out_for_delivery' || newStatus === 'shipped') updatedOrder.shipped_at = now;

  // Generate notification
  const notifType = STATUS_NOTIFICATION_TYPE[newStatus];
  const notifTitle = STATUS_NOTIFICATION_TITLE[newStatus];
  const notifBodyFn = STATUS_NOTIFICATION_BODY[newStatus];
  if (notifType && notifTitle && notifBodyFn) {
    updatedOrder.notifications.push({
      type: notifType,
      title: notifTitle,
      body: notifBodyFn(order.order_number),
    });
  }

  // Generate WhatsApp message
  const waMsgFn = WHATSAPP_STATUS_MESSAGES[newStatus];
  if (waMsgFn) {
    updatedOrder.whatsappMessages.push(waMsgFn(order.order_number));
  }

  return updatedOrder;
}

// ─── Full workflow test ───────────────────────────────────────

describe('Full Order Workflow Integration', () => {
  let order: InMemoryOrder;

  beforeEach(() => {
    order = createInMemoryOrder();
  });

  // ── Step 0: Order Creation ──────────────────────────────────

  it('Step 0: order is created with pending status', () => {
    expect(order.status).toBe('pending');
    expect(order.status_history).toHaveLength(0);
    expect(order.notifications).toHaveLength(0);
    expect(order.whatsappMessages).toHaveLength(0);
    expect(order.profile_id).toBe('customer-uuid-1');
    expect(order.order_number).toBe('SC-INT-001');
  });

  it('Step 0: pending status has progress index 0', () => {
    expect(getProgressIndex(order.status)).toBe(0);
  });

  it('Step 0: pending is not a terminal status', () => {
    expect(isTerminalStatus(order.status)).toBe(false);
  });

  // ── Step 1: Pending → Confirmed ─────────────────────────────

  it('Step 1: Pending → Confirmed updates all fields correctly', () => {
    order = applyStatusTransition(order, 'confirmed');

    expect(order.status).toBe('confirmed');
    expect(order.status_updated_at).toBeTruthy();
    expect(order.status_history).toHaveLength(1);
    expect(order.status_history[0].status).toBe('confirmed');
    expect(order.status_history[0].timestamp).toBeTruthy();
  });

  it('Step 1: Confirmed generates order_confirmed notification', () => {
    order = applyStatusTransition(order, 'confirmed');

    expect(order.notifications).toHaveLength(1);
    expect(order.notifications[0].type).toBe('order_confirmed');
    expect(order.notifications[0].body).toContain('SC-INT-001');
  });

  it('Step 1: Confirmed generates WhatsApp message', () => {
    order = applyStatusTransition(order, 'confirmed');

    expect(order.whatsappMessages).toHaveLength(1);
    expect(order.whatsappMessages[0]).toContain('SC-INT-001');
    expect(order.whatsappMessages[0]).toContain('confirmado');
  });

  it('Step 1: Customer sees confirmed status (progress index 1)', () => {
    order = applyStatusTransition(order, 'confirmed');
    expect(getProgressIndex(order.status)).toBe(1);
  });

  // ── Step 2: Confirmed → Preparing ──────────────────────────

  it('Step 2: Confirmed → Preparing updates all fields correctly', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');

    expect(order.status).toBe('preparing');
    expect(order.status_history).toHaveLength(2);
    expect(order.status_history[1].status).toBe('preparing');
  });

  it('Step 2: Preparing generates order_preparing notification', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');

    const preparingNotif = order.notifications.find((n) => n.type === 'order_preparing');
    expect(preparingNotif).toBeDefined();
    expect(preparingNotif!.body).toContain('SC-INT-001');
  });

  it('Step 2: Preparing generates WhatsApp message', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');

    const waMsg = order.whatsappMessages.find((m) => m.includes('preparando'));
    expect(waMsg).toBeDefined();
  });

  it('Step 2: Customer sees preparing status (progress index 2)', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    expect(getProgressIndex(order.status)).toBe(2);
  });

  // ── Step 3: Preparing → Ready ───────────────────────────────

  it('Step 3: Preparing → Ready updates all fields correctly', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');

    expect(order.status).toBe('ready');
    expect(order.status_history).toHaveLength(3);
    expect(order.status_history[2].status).toBe('ready');
  });

  it('Step 3: Ready generates order_ready notification', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');

    const readyNotif = order.notifications.find((n) => n.type === 'order_ready');
    expect(readyNotif).toBeDefined();
  });

  it('Step 3: Customer sees ready status (progress index 3)', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    expect(getProgressIndex(order.status)).toBe(3);
  });

  // ── Step 4: Ready → Driver Assigned ─────────────────────────

  it('Step 4: Ready → Driver Assigned updates all fields correctly', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');

    expect(order.status).toBe('driver_assigned');
    expect(order.status_history).toHaveLength(4);
  });

  it('Step 4: Driver Assigned generates notification and WhatsApp', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');

    const notif = order.notifications.find((n) => n.type === 'order_driver_assigned');
    expect(notif).toBeDefined();

    const waMsg = order.whatsappMessages.find((m) => m.includes('conductor'));
    expect(waMsg).toBeDefined();
  });

  it('Step 4: Customer sees driver_assigned status (progress index 4)', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    expect(getProgressIndex(order.status)).toBe(4);
  });

  // ── Step 5: Driver Assigned → Out for Delivery ──────────────

  it('Step 5: Driver Assigned → Out for Delivery updates all fields', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');

    expect(order.status).toBe('out_for_delivery');
    expect(order.shipped_at).toBeTruthy();
    expect(order.status_history).toHaveLength(5);
  });

  it('Step 5: Out for Delivery generates notification and WhatsApp', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');

    const notif = order.notifications.find((n) => n.type === 'order_out_for_delivery');
    expect(notif).toBeDefined();

    const waMsg = order.whatsappMessages.find((m) => m.includes('camino'));
    expect(waMsg).toBeDefined();
  });

  it('Step 5: Customer sees out_for_delivery status (progress index 5)', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');
    expect(getProgressIndex(order.status)).toBe(5);
  });

  // ── Step 6: Out for Delivery → Delivered ────────────────────

  it('Step 6: Out for Delivery → Delivered completes the order', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');
    order = applyStatusTransition(order, 'delivered');

    expect(order.status).toBe('delivered');
    expect(order.delivered_at).toBeTruthy();
    expect(order.status_history).toHaveLength(6);
  });

  it('Step 6: Delivered generates order_delivered notification', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');
    order = applyStatusTransition(order, 'delivered');

    const notif = order.notifications.find((n) => n.type === 'order_delivered');
    expect(notif).toBeDefined();
    expect(notif!.body).toContain('SC-INT-001');
  });

  it('Step 6: Delivered generates WhatsApp message', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');
    order = applyStatusTransition(order, 'delivered');

    const waMsg = order.whatsappMessages.find((m) => m.includes('entregado'));
    expect(waMsg).toBeDefined();
  });

  it('Step 6: Customer sees delivered status (progress index 6)', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery');
    order = applyStatusTransition(order, 'delivered');
    expect(getProgressIndex(order.status)).toBe(6);
  });

  it('Step 6: Delivered is NOT a terminal status (can still be viewed)', () => {
    order = applyStatusTransition(order, 'delivered');
    expect(isTerminalStatus(order.status)).toBe(false);
  });

  // ── Full workflow: all 6 transitions ────────────────────────

  it('Full workflow: 6 transitions produce 6 history entries', () => {
    const transitions: EstadoOrden[] = [
      'confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered',
    ];
    transitions.forEach((status) => {
      order = applyStatusTransition(order, status);
    });

    expect(order.status_history).toHaveLength(6);
    expect(order.status_history.map((h) => h.status)).toEqual(transitions);
  });

  it('Full workflow: 6 transitions produce 6 notifications', () => {
    const transitions: EstadoOrden[] = [
      'confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered',
    ];
    transitions.forEach((status) => {
      order = applyStatusTransition(order, status);
    });

    expect(order.notifications).toHaveLength(6);
  });

  it('Full workflow: 6 transitions produce 6 WhatsApp messages', () => {
    const transitions: EstadoOrden[] = [
      'confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered',
    ];
    transitions.forEach((status) => {
      order = applyStatusTransition(order, status);
    });

    expect(order.whatsappMessages).toHaveLength(6);
  });

  it('Full workflow: status_updated_at is updated at each transition', () => {
    const timestamps: string[] = [];
    const transitions: EstadoOrden[] = ['confirmed', 'preparing', 'ready'];

    transitions.forEach((status) => {
      order = applyStatusTransition(order, status);
      timestamps.push(order.status_updated_at!);
    });

    // All timestamps should be defined
    timestamps.forEach((ts) => expect(ts).toBeTruthy());
  });

  // ── ETA persistence ─────────────────────────────────────────

  it('ETA is persisted when set during out_for_delivery transition', () => {
    const eta = '2024-01-02T15:00:00Z';
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'preparing');
    order = applyStatusTransition(order, 'ready');
    order = applyStatusTransition(order, 'driver_assigned');
    order = applyStatusTransition(order, 'out_for_delivery', undefined, eta);

    expect(order.estimated_delivery_time).toBe(eta);
  });

  it('ETA is preserved through subsequent transitions', () => {
    const eta = '2024-01-02T15:00:00Z';
    order = applyStatusTransition(order, 'out_for_delivery', undefined, eta);
    order = applyStatusTransition(order, 'delivered');

    expect(order.estimated_delivery_time).toBe(eta);
  });

  // ── Notes in history ─────────────────────────────────────────

  it('Note is included in status history item when provided', () => {
    order = applyStatusTransition(order, 'confirmed', 'Verified payment');

    expect(order.status_history[0].note).toBe('Verified payment');
  });

  it('Note is optional — history item works without note', () => {
    order = applyStatusTransition(order, 'confirmed');

    expect(order.status_history[0].note).toBeUndefined();
  });
});

// ─── Cancellation workflow ────────────────────────────────────

describe('Cancellation Workflow Integration', () => {
  let order: InMemoryOrder;

  beforeEach(() => {
    order = createInMemoryOrder();
  });

  it('Order can be cancelled from pending state', () => {
    order = applyStatusTransition(order, 'cancelled');

    expect(order.status).toBe('cancelled');
    expect(order.cancelled_at).toBeTruthy();
    expect(isTerminalStatus(order.status)).toBe(true);
  });

  it('Cancelled order generates cancellation notification', () => {
    order = applyStatusTransition(order, 'cancelled');

    const notif = order.notifications.find((n) => n.type === 'order_cancelled');
    expect(notif).toBeDefined();
    expect(notif!.body).toContain('SC-INT-001');
  });

  it('Cancelled order generates WhatsApp message', () => {
    order = applyStatusTransition(order, 'cancelled');

    const waMsg = order.whatsappMessages.find((m) => m.includes('cancelado'));
    expect(waMsg).toBeDefined();
  });

  it('Cancelled order has progress index -1 (not in progress tracker)', () => {
    order = applyStatusTransition(order, 'cancelled');
    expect(getProgressIndex(order.status)).toBe(-1);
  });

  it('Order can be cancelled from confirmed state', () => {
    order = applyStatusTransition(order, 'confirmed');
    order = applyStatusTransition(order, 'cancelled');

    expect(order.status).toBe('cancelled');
    expect(order.status_history).toHaveLength(2);
    expect(order.status_history[1].status).toBe('cancelled');
  });
});
