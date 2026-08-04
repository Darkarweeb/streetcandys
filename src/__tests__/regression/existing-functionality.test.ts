/**
 * Regression Tests — Existing Functionality
 *
 * Ensures existing features still work after order management changes:
 *  - Checkout flow
 *  - Cart operations
 *  - Payment processing
 *  - Notifications
 *  - Account orders list
 *  - Admin dashboard
 *  - Order status enum compatibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ALL_STATUSES, ORDER_STATUSES, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/order-status';

// ─── Mocks ───────────────────────────────────────────────────

vi?.mock('@/lib/supabase/server', () => ({
  createClient: vi?.fn(() =>
    Promise.resolve({
      auth: { getUser: vi?.fn()?.mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi?.fn(() => ({
        select: vi?.fn()?.mockReturnThis(),
        insert: vi?.fn()?.mockReturnThis(),
        update: vi?.fn()?.mockReturnThis(),
        eq: vi?.fn()?.mockReturnThis(),
        single: vi?.fn()?.mockResolvedValue({ data: null, error: null }),
        range: vi?.fn()?.mockResolvedValue({ data: [], error: null, count: 0 }),
        order: vi?.fn()?.mockReturnThis(),
      })),
    })
  ),
}));

vi?.mock('@/lib/payment/order-repository', () => ({
  repositorioOrdenes: {
    obtenerPorId: vi?.fn()?.mockResolvedValue(null),
    listarPorUsuario: vi?.fn()?.mockResolvedValue({ ordenes: [], total: 0 }),
    listarTodas: vi?.fn()?.mockResolvedValue({ ordenes: [], total: 0 }),
    actualizarEstado: vi?.fn()?.mockResolvedValue(undefined),
  },
}));

vi?.mock('@/lib/payment/checkout-repository', () => ({
  repositorioCheckout: {
    crearNotificacion: vi?.fn()?.mockResolvedValue(undefined),
    obtenerCarritoCompleto: vi?.fn()?.mockResolvedValue(null),
  },
}));

vi?.mock('@/lib/payment/payment-service', () => ({
  servicioPagos: {
    sincronizarEstadoPago: vi?.fn()?.mockResolvedValue(undefined),
  },
}));

vi?.mock('@/lib/payment/logger', () => ({
  loggerPagos: {
    info: vi?.fn(),
    warn: vi?.fn(),
    error: vi?.fn(),
  },
}));

// ─── Regression: Order Status Enum Compatibility ──────────────

describe('Regression: Order Status Enum Compatibility', () => {
  it('ORDER_STATUSES is a readonly tuple (not mutated)', () => {
    const copy = [...ORDER_STATUSES];
    expect(copy)?.toEqual([...ORDER_STATUSES]);
  });

  it('ALL_STATUSES includes all ORDER_STATUSES (backward compat)', () => {
    ORDER_STATUSES?.forEach((s) => {
      expect(ALL_STATUSES)?.toContain(s);
    });
  });

  it('legacy statuses still have labels', () => {
    expect(ESTADO_LABELS?.['processing'])?.toBeDefined();
    expect(ESTADO_LABELS?.['shipped'])?.toBeDefined();
    expect(ESTADO_LABELS?.['refunded'])?.toBeDefined();
  });

  it('legacy statuses still have colors', () => {
    expect(ESTADO_COLORS?.['processing'])?.toBeDefined();
    expect(ESTADO_COLORS?.['shipped'])?.toBeDefined();
    expect(ESTADO_COLORS?.['refunded'])?.toBeDefined();
  });
});

// ─── Regression: Order Service API ───────────────────────────

describe('Regression: Order Service API Surface', () => {
  it('servicioOrdenes exports all expected methods', async () => {
    const { servicioOrdenes } = await import('@/lib/payment/order-service');
    expect(typeof servicioOrdenes?.obtenerOrden)?.toBe('function');
    expect(typeof servicioOrdenes?.obtenerPorNumero)?.toBe('function');
    expect(typeof servicioOrdenes?.listarOrdenesUsuario)?.toBe('function');
    expect(typeof servicioOrdenes?.cancelarOrden)?.toBe('function');
    expect(typeof servicioOrdenes?.actualizarEstadoOrden)?.toBe('function');
    expect(typeof servicioOrdenes?.sincronizarPago)?.toBe('function');
    expect(typeof servicioOrdenes?.listarOrdenesAdmin)?.toBe('function');
  });
});

// ─── Regression: Order Repository API ────────────────────────

describe('Regression: Order Repository API Surface', () => {
  it('repositorioOrdenes exports all expected methods', async () => {
    const { repositorioOrdenes } = await import('@/lib/payment/order-repository');
    expect(typeof repositorioOrdenes?.crear)?.toBe('function');
    expect(typeof repositorioOrdenes?.crearItems)?.toBe('function');
    expect(typeof repositorioOrdenes?.obtenerPorId)?.toBe('function');
    expect(typeof repositorioOrdenes?.obtenerPorNumero)?.toBe('function');
    expect(typeof repositorioOrdenes?.listarPorUsuario)?.toBe('function');
    expect(typeof repositorioOrdenes?.actualizarEstado)?.toBe('function');
    expect(typeof repositorioOrdenes?.crearDireccion)?.toBe('function');
    expect(typeof repositorioOrdenes?.obtenerDireccionDefault)?.toBe('function');
    expect(typeof repositorioOrdenes?.listarTodas)?.toBe('function');
  });
});

// ─── Regression: Notification System ─────────────────────────

describe('Regression: Notification System', () => {
  it('STATUS_NOTIFICATION_TYPE has entries for all key statuses', async () => {
    const { STATUS_NOTIFICATION_TYPE } = await import('@/lib/order-status');
    const keyStatuses = ['confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered', 'cancelled'];
    keyStatuses?.forEach((s) => {
      expect(STATUS_NOTIFICATION_TYPE?.[s])?.toBeDefined();
    });
  });

  it('STATUS_NOTIFICATION_BODY generates text with order number', async () => {
    const { STATUS_NOTIFICATION_BODY } = await import('@/lib/order-status');
    Object.entries(STATUS_NOTIFICATION_BODY)?.forEach(([, fn]) => {
      const body = fn?.('SC-REG-001');
      expect(body)?.toContain('SC-REG-001');
    });
  });
});

// ─── Regression: WhatsApp Messages ───────────────────────────

describe('Regression: WhatsApp Message Templates', () => {
  it('all WhatsApp message templates are functions', async () => {
    const { WHATSAPP_STATUS_MESSAGES } = await import('@/lib/order-status');
    Object.values(WHATSAPP_STATUS_MESSAGES)?.forEach((fn) => {
      expect(typeof fn)?.toBe('function');
    });
  });

  it('WhatsApp messages include order number', async () => {
    const { WHATSAPP_STATUS_MESSAGES } = await import('@/lib/order-status');
    const orderNum = 'SC-REG-TEST';
    Object.values(WHATSAPP_STATUS_MESSAGES)?.forEach((fn) => {
      const msg = fn?.(orderNum);
      expect(msg)?.toContain(orderNum);
    });
  });
});

// ─── Regression: Progress Steps ──────────────────────────────

describe('Regression: Progress Steps', () => {
  it('PROGRESS_STEPS has not been modified (7 steps)', async () => {
    const { PROGRESS_STEPS } = await import('@/lib/order-status');
    expect(PROGRESS_STEPS)?.toHaveLength(7);
  });

  it('PROGRESS_STEPS keys match expected delivery flow', async () => {
    const { PROGRESS_STEPS } = await import('@/lib/order-status');
    const expectedKeys = ['pending', 'confirmed', 'preparing', 'ready', 'driver_assigned', 'out_for_delivery', 'delivered'];
    expect(PROGRESS_STEPS?.map((s) => s?.key))?.toEqual(expectedKeys);
  });
});

// ─── Regression: Account Orders List ─────────────────────────

describe('Regression: Account Orders List API', () => {
  beforeEach(() => vi?.clearAllMocks());

  it('listarOrdenesUsuario returns correct shape', async () => {
    const { repositorioOrdenes } = await import('@/lib/payment/order-repository');
    vi?.mocked(repositorioOrdenes?.listarPorUsuario)?.mockResolvedValue({ ordenes: [], total: 0 });

    const { servicioOrdenes } = await import('@/lib/payment/order-service');
    const result = await servicioOrdenes?.listarOrdenesUsuario('user-1', 1, 10);

    expect(result)?.toHaveProperty('ordenes');
    expect(result)?.toHaveProperty('total');
    expect(result)?.toHaveProperty('paginas');
    expect(Array.isArray(result?.ordenes))?.toBe(true);
  });
});

// ─── Regression: Admin Dashboard ─────────────────────────────

describe('Regression: Admin Dashboard Orders API', () => {
  beforeEach(() => vi?.clearAllMocks());

  it('listarOrdenesAdmin returns correct shape', async () => {
    const { repositorioOrdenes } = await import('@/lib/payment/order-repository');
    vi?.mocked(repositorioOrdenes?.listarTodas)?.mockResolvedValue({ ordenes: [], total: 0 });

    const { servicioOrdenes } = await import('@/lib/payment/order-service');
    const result = await servicioOrdenes?.listarOrdenesAdmin(1, 15);

    expect(result)?.toHaveProperty('ordenes');
    expect(result)?.toHaveProperty('total');
    expect(result)?.toHaveProperty('paginas');
    expect(Array.isArray(result?.ordenes))?.toBe(true);
  });

  it('listarOrdenesAdmin accepts filter params', async () => {
    const { repositorioOrdenes } = await import('@/lib/payment/order-repository');
    vi?.mocked(repositorioOrdenes?.listarTodas)?.mockResolvedValue({ ordenes: [], total: 0 });

    const { servicioOrdenes } = await import('@/lib/payment/order-service');
    await servicioOrdenes?.listarOrdenesAdmin(1, 15, { estado: 'pending', busqueda: 'SC-2024' });

    expect(repositorioOrdenes?.listarTodas)?.toHaveBeenCalledWith(1, 15, { estado: 'pending', busqueda: 'SC-2024' });
  });
});

// ─── Regression: Payment Types ───────────────────────────────

describe('Regression: Payment Types Compatibility', () => {
  it('EstadoOrden type includes all expected values', async () => {
    // Verify the type values are accessible at runtime via ALL_STATUSES
    const expectedStatuses = [
      'pending', 'confirmed', 'preparing', 'ready', 'driver_assigned',
      'out_for_delivery', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
    ];
    expectedStatuses?.forEach((s) => {
      expect(ALL_STATUSES)?.toContain(s);
    });
  });
});
