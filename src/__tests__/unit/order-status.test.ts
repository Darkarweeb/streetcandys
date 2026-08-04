/**
 * Unit Tests — Order Status Logic
 * Tests for src/lib/order-status.ts
 *
 * Coverage targets:
 *  - ORDER_STATUSES enum
 *  - ALL_STATUSES enum
 *  - ESTADO_LABELS
 *  - ESTADO_COLORS
 *  - PROGRESS_STEPS
 *  - getProgressIndex()
 *  - isTerminalStatus()
 *  - WHATSAPP_STATUS_MESSAGES
 *  - STATUS_NOTIFICATION_TYPE / TITLE / BODY
 */

import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  ALL_STATUSES,
  ESTADO_LABELS,
  ESTADO_COLORS,
  PROGRESS_STEPS,
  getProgressIndex,
  isTerminalStatus,
  WHATSAPP_STATUS_MESSAGES,
  STATUS_NOTIFICATION_TYPE,
  STATUS_NOTIFICATION_TITLE,
  STATUS_NOTIFICATION_BODY,
} from '@/lib/order-status';

// ─── Enum Validation ──────────────────────────────────────────

describe('ORDER_STATUSES enum', () => {
  it('contains all expected delivery-flow statuses', () => {
    expect(ORDER_STATUSES).toContain('pending');
    expect(ORDER_STATUSES).toContain('confirmed');
    expect(ORDER_STATUSES).toContain('preparing');
    expect(ORDER_STATUSES).toContain('ready');
    expect(ORDER_STATUSES).toContain('driver_assigned');
    expect(ORDER_STATUSES).toContain('out_for_delivery');
    expect(ORDER_STATUSES).toContain('delivered');
    expect(ORDER_STATUSES).toContain('cancelled');
  });

  it('has exactly 8 statuses', () => {
    expect(ORDER_STATUSES.length).toBe(8);
  });
});

describe('ALL_STATUSES enum', () => {
  it('includes legacy statuses for backward compatibility', () => {
    expect(ALL_STATUSES).toContain('processing');
    expect(ALL_STATUSES).toContain('shipped');
    expect(ALL_STATUSES).toContain('refunded');
  });

  it('includes all ORDER_STATUSES', () => {
    ORDER_STATUSES.forEach((s) => {
      expect(ALL_STATUSES).toContain(s);
    });
  });

  it('has 11 total statuses', () => {
    expect(ALL_STATUSES.length).toBe(11);
  });
});

// ─── Labels ───────────────────────────────────────────────────

describe('ESTADO_LABELS', () => {
  it('has a Spanish label for every status in ALL_STATUSES', () => {
    ALL_STATUSES.forEach((status) => {
      expect(ESTADO_LABELS[status]).toBeDefined();
      expect(typeof ESTADO_LABELS[status]).toBe('string');
      expect(ESTADO_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it('returns correct Spanish labels', () => {
    expect(ESTADO_LABELS['pending']).toBe('Pendiente');
    expect(ESTADO_LABELS['confirmed']).toBe('Confirmado');
    expect(ESTADO_LABELS['preparing']).toBe('Preparando');
    expect(ESTADO_LABELS['ready']).toBe('Listo');
    expect(ESTADO_LABELS['driver_assigned']).toBe('Conductor asignado');
    expect(ESTADO_LABELS['out_for_delivery']).toBe('En camino');
    expect(ESTADO_LABELS['delivered']).toBe('Entregado');
    expect(ESTADO_LABELS['cancelled']).toBe('Cancelado');
    expect(ESTADO_LABELS['refunded']).toBe('Reembolsado');
  });
});

// ─── Colors ───────────────────────────────────────────────────

describe('ESTADO_COLORS', () => {
  it('has Tailwind color classes for every status', () => {
    ALL_STATUSES.forEach((status) => {
      expect(ESTADO_COLORS[status]).toBeDefined();
      expect(ESTADO_COLORS[status]).toMatch(/bg-\w+-\d+/);
    });
  });

  it('uses green for delivered', () => {
    expect(ESTADO_COLORS['delivered']).toContain('green');
  });

  it('uses red for cancelled', () => {
    expect(ESTADO_COLORS['cancelled']).toContain('red');
  });

  it('uses yellow for pending', () => {
    expect(ESTADO_COLORS['pending']).toContain('yellow');
  });
});

// ─── Progress Steps ───────────────────────────────────────────

describe('PROGRESS_STEPS', () => {
  it('has 7 steps in the correct order', () => {
    expect(PROGRESS_STEPS.length).toBe(7);
    expect(PROGRESS_STEPS[0].key).toBe('pending');
    expect(PROGRESS_STEPS[6].key).toBe('delivered');
  });

  it('each step has key, label, and icon', () => {
    PROGRESS_STEPS.forEach((step) => {
      expect(step.key).toBeTruthy();
      expect(step.label).toBeTruthy();
      expect(step.icon).toBeTruthy();
    });
  });
});

// ─── getProgressIndex ─────────────────────────────────────────

describe('getProgressIndex()', () => {
  it('returns 0 for pending', () => {
    expect(getProgressIndex('pending')).toBe(0);
  });

  it('returns 1 for confirmed', () => {
    expect(getProgressIndex('confirmed')).toBe(1);
  });

  it('returns 2 for preparing', () => {
    expect(getProgressIndex('preparing')).toBe(2);
  });

  it('returns 2 for legacy "processing" (alias for preparing)', () => {
    expect(getProgressIndex('processing')).toBe(2);
  });

  it('returns 3 for ready', () => {
    expect(getProgressIndex('ready')).toBe(3);
  });

  it('returns 4 for driver_assigned', () => {
    expect(getProgressIndex('driver_assigned')).toBe(4);
  });

  it('returns 5 for out_for_delivery', () => {
    expect(getProgressIndex('out_for_delivery')).toBe(5);
  });

  it('returns 5 for legacy "shipped" (alias for out_for_delivery)', () => {
    expect(getProgressIndex('shipped')).toBe(5);
  });

  it('returns 6 for delivered', () => {
    expect(getProgressIndex('delivered')).toBe(6);
  });

  it('returns -1 for unknown status', () => {
    expect(getProgressIndex('unknown_status')).toBe(-1);
  });

  it('returns -1 for cancelled (terminal, not in progress)', () => {
    expect(getProgressIndex('cancelled')).toBe(-1);
  });

  it('returns -1 for refunded (terminal, not in progress)', () => {
    expect(getProgressIndex('refunded')).toBe(-1);
  });

  it('returns -1 for empty string', () => {
    expect(getProgressIndex('')).toBe(-1);
  });
});

// ─── isTerminalStatus ─────────────────────────────────────────

describe('isTerminalStatus()', () => {
  it('returns true for cancelled', () => {
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('returns true for refunded', () => {
    expect(isTerminalStatus('refunded')).toBe(true);
  });

  it('returns false for pending', () => {
    expect(isTerminalStatus('pending')).toBe(false);
  });

  it('returns false for delivered', () => {
    expect(isTerminalStatus('delivered')).toBe(false);
  });

  it('returns false for all non-terminal statuses', () => {
    const nonTerminal = ['pending', 'confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered'];
    nonTerminal.forEach((s) => {
      expect(isTerminalStatus(s)).toBe(false);
    });
  });

  it('returns false for unknown status', () => {
    expect(isTerminalStatus('unknown')).toBe(false);
  });
});

// ─── WhatsApp Message Templates ───────────────────────────────

describe('WHATSAPP_STATUS_MESSAGES', () => {
  const orderNumber = 'SC-2024-001';

  it('generates confirmed message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['confirmed']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('confirmado');
  });

  it('generates preparing message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['preparing']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('preparando');
  });

  it('generates ready message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['ready']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('listo');
  });

  it('generates driver_assigned message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['driver_assigned']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('conductor');
  });

  it('generates out_for_delivery message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['out_for_delivery']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('camino');
  });

  it('generates delivered message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['delivered']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('entregado');
  });

  it('generates cancelled message with order number', () => {
    const msg = WHATSAPP_STATUS_MESSAGES['cancelled']?.(orderNumber);
    expect(msg).toContain(orderNumber);
    expect(msg).toContain('cancelado');
  });

  it('does NOT have a message for pending (no notification on creation)', () => {
    expect(WHATSAPP_STATUS_MESSAGES['pending']).toBeUndefined();
  });

  it('all messages are non-empty strings', () => {
    Object.entries(WHATSAPP_STATUS_MESSAGES).forEach(([, fn]) => {
      const msg = fn?.('TEST-001');
      expect(typeof msg).toBe('string');
      expect(msg!.length).toBeGreaterThan(0);
    });
  });
});

// ─── Notification Types ───────────────────────────────────────

describe('STATUS_NOTIFICATION_TYPE', () => {
  it('maps confirmed to order_confirmed', () => {
    expect(STATUS_NOTIFICATION_TYPE['confirmed']).toBe('order_confirmed');
  });

  it('maps delivered to order_delivered', () => {
    expect(STATUS_NOTIFICATION_TYPE['delivered']).toBe('order_delivered');
  });

  it('maps cancelled to order_cancelled', () => {
    expect(STATUS_NOTIFICATION_TYPE['cancelled']).toBe('order_cancelled');
  });

  it('has notification types for all key statuses', () => {
    const keyStatuses = ['confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered', 'cancelled'];
    keyStatuses.forEach((s) => {
      expect(STATUS_NOTIFICATION_TYPE[s]).toBeDefined();
    });
  });
});

describe('STATUS_NOTIFICATION_TITLE', () => {
  it('has Spanish titles for all notification statuses', () => {
    Object.keys(STATUS_NOTIFICATION_TYPE).forEach((status) => {
      expect(STATUS_NOTIFICATION_TITLE[status]).toBeDefined();
      expect(STATUS_NOTIFICATION_TITLE[status]!.length).toBeGreaterThan(0);
    });
  });
});

describe('STATUS_NOTIFICATION_BODY', () => {
  it('generates body text with order number', () => {
    const orderNum = 'SC-TEST-999';
    Object.entries(STATUS_NOTIFICATION_BODY).forEach(([, fn]) => {
      const body = fn?.(orderNum);
      expect(body).toContain(orderNum);
    });
  });
});
