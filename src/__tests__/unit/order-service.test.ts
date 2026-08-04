/**
 * Unit Tests — Order Service
 * Tests for src/lib/payment/order-service.ts
 *
 * Mocks: repositorioOrdenes, repositorioCheckout, servicioPagos, loggerPagos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DbOrden, OrdenCompleta } from '@/lib/payment/types';

// ─── Helpers ─────────────────────────────────────────────────

function makeOrder(overrides: Partial<DbOrden> = {}): DbOrden {
  return {
    id: 'order-uuid-1',
    order_number: 'SC-2024-001',
    profile_id: 'user-uuid-1',
    country_code: 'CO',
    shipping_address_id: 'addr-1',
    billing_address_id: null,
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'stripe',
    payment_reference: null,
    subtotal: 50000,
    discount_amount: 0,
    shipping_cost: 12000,
    tax_amount: 9500,
    tax_rate_snapshot: 0.19,
    total: 71500,
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
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    ...overrides,
  };
}

// ─── Mocks ───────────────────────────────────────────────────

const mockObtenerPorId = vi.fn();
const mockObtenerPorNumero = vi.fn();
const mockListarPorUsuario = vi.fn();
const mockActualizarEstado = vi.fn();
const mockListarTodas = vi.fn();

vi.mock('@/lib/payment/order-repository', () => ({
  repositorioOrdenes: {
    obtenerPorId: mockObtenerPorId,
    obtenerPorNumero: mockObtenerPorNumero,
    listarPorUsuario: mockListarPorUsuario,
    actualizarEstado: mockActualizarEstado,
    listarTodas: mockListarTodas,
  },
}));

const mockCrearNotificacion = vi.fn();
vi.mock('@/lib/payment/checkout-repository', () => ({
  repositorioCheckout: {
    crearNotificacion: mockCrearNotificacion,
  },
}));

vi.mock('@/lib/payment/payment-service', () => ({
  servicioPagos: {
    sincronizarEstadoPago: vi.fn(),
  },
}));

vi.mock('@/lib/payment/logger', () => ({
  loggerPagos: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/payment/providers', () => ({
  obtenerProveedorPorPais: vi.fn(() => ({
    cancelarIntencion: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    })
  ),
}));

// ─── Import service AFTER mocks ───────────────────────────────
const { servicioOrdenes } = await import('@/lib/payment/order-service');

// ─── Tests ───────────────────────────────────────────────────

describe('servicioOrdenes.obtenerOrden()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns order when found', async () => {
    const order = makeOrder() as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);

    const result = await servicioOrdenes.obtenerOrden('order-uuid-1');
    expect(result).toEqual(order);
    expect(mockObtenerPorId).toHaveBeenCalledWith('order-uuid-1');
  });

  it('returns null when order not found', async () => {
    mockObtenerPorId.mockResolvedValue(null);

    const result = await servicioOrdenes.obtenerOrden('nonexistent');
    expect(result).toBeNull();
  });
});

describe('servicioOrdenes.listarOrdenesUsuario()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated orders with page count', async () => {
    const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
    mockListarPorUsuario.mockResolvedValue({ ordenes: orders, total: 25 });

    const result = await servicioOrdenes.listarOrdenesUsuario('user-uuid-1', 1, 10);
    expect(result.ordenes).toHaveLength(2);
    expect(result.total).toBe(25);
    expect(result.paginas).toBe(3); // ceil(25/10)
  });

  it('uses default pagination values', async () => {
    mockListarPorUsuario.mockResolvedValue({ ordenes: [], total: 0 });

    await servicioOrdenes.listarOrdenesUsuario('user-uuid-1');
    expect(mockListarPorUsuario).toHaveBeenCalledWith('user-uuid-1', 1, 10);
  });
});

describe('servicioOrdenes.cancelarOrden()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a pending order successfully', async () => {
    const order = makeOrder({ status: 'pending' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);
    mockActualizarEstado.mockResolvedValue(undefined);
    mockCrearNotificacion.mockResolvedValue(undefined);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(true);
    expect(mockActualizarEstado).toHaveBeenCalledWith('order-uuid-1', 'cancelled');
  });

  it('cancels a confirmed order successfully', async () => {
    const order = makeOrder({ status: 'confirmed' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);
    mockActualizarEstado.mockResolvedValue(undefined);
    mockCrearNotificacion.mockResolvedValue(undefined);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(true);
  });

  it('returns error when order not found', async () => {
    mockObtenerPorId.mockResolvedValue(null);

    const result = await servicioOrdenes.cancelarOrden('nonexistent', 'user-uuid-1');
    expect(result.exito).toBe(false);
    expect(result.mensaje).toContain('no encontrada');
  });

  it('returns error when user does not own the order', async () => {
    const order = makeOrder({ profile_id: 'other-user' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(false);
    expect(result.mensaje).toContain('permiso');
  });

  it('returns error when order is in non-cancellable state (preparing)', async () => {
    const order = makeOrder({ status: 'preparing' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(false);
    expect(result.mensaje).toContain('preparing');
  });

  it('returns error when order is delivered', async () => {
    const order = makeOrder({ status: 'delivered' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(false);
  });

  it('returns error when order is already cancelled', async () => {
    const order = makeOrder({ status: 'cancelled' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);

    const result = await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1');
    expect(result.exito).toBe(false);
  });

  it('creates a cancellation notification for the user', async () => {
    const order = makeOrder({ status: 'pending' }) as unknown as OrdenCompleta;
    mockObtenerPorId.mockResolvedValue(order);
    mockActualizarEstado.mockResolvedValue(undefined);
    mockCrearNotificacion.mockResolvedValue(undefined);

    await servicioOrdenes.cancelarOrden('order-uuid-1', 'user-uuid-1', 'No longer needed');
    expect(mockCrearNotificacion).toHaveBeenCalledWith(
      'user-uuid-1',
      'order_cancelled',
      expect.any(String),
      expect.stringContaining('SC-2024-001'),
      expect.any(Object),
    );
  });
});

describe('servicioOrdenes.actualizarEstadoOrden()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls repository actualizarEstado with correct params', async () => {
    mockActualizarEstado.mockResolvedValue(undefined);

    await servicioOrdenes.actualizarEstadoOrden('order-uuid-1', 'confirmed');
    expect(mockActualizarEstado).toHaveBeenCalledWith('order-uuid-1', 'confirmed', undefined, undefined);
  });

  it('passes nota and estimatedDelivery to repository', async () => {
    mockActualizarEstado.mockResolvedValue(undefined);

    const eta = '2024-01-02T15:00:00Z';
    await servicioOrdenes.actualizarEstadoOrden('order-uuid-1', 'out_for_delivery', undefined, 'En camino', eta);
    expect(mockActualizarEstado).toHaveBeenCalledWith('order-uuid-1', 'out_for_delivery', 'En camino', eta);
  });
});

describe('servicioOrdenes.listarOrdenesAdmin()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all orders with pagination', async () => {
    const orders = [makeOrder()];
    mockListarTodas.mockResolvedValue({ ordenes: orders, total: 1 });

    const result = await servicioOrdenes.listarOrdenesAdmin(1, 15);
    expect(result.ordenes).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.paginas).toBe(1);
  });

  it('passes filters to repository', async () => {
    mockListarTodas.mockResolvedValue({ ordenes: [], total: 0 });

    const filtros = { estado: 'pending', busqueda: 'SC-2024' };
    await servicioOrdenes.listarOrdenesAdmin(1, 15, filtros);
    expect(mockListarTodas).toHaveBeenCalledWith(1, 15, filtros);
  });
});
