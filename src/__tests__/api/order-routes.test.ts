/**
 * API Tests — Order Routes
 * Tests for:
 *   GET  /api/ordenes
 *   GET  /api/ordenes/:id
 *   PATCH /api/ordenes/:id/estado
 *   DELETE /api/ordenes/:id (cancel)
 *
 * Uses Next.js route handlers directly (no HTTP server needed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { DbOrden, OrdenCompleta, EstadoOrden } from '@/lib/payment/types';

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
    payment_status: 'paid',
    payment_method: 'stripe',
    payment_reference: 'pi_test_123',
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

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, options);
}

// ─── Mocks ───────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockSupabaseFrom = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockSupabaseFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const mockObtenerOrden = vi.fn();
const mockListarOrdenesUsuario = vi.fn();
const mockListarOrdenesAdmin = vi.fn();
const mockCancelarOrden = vi.fn();
const mockActualizarEstadoOrden = vi.fn();

vi.mock('@/lib/payment/order-service', () => ({
  servicioOrdenes: {
    obtenerOrden: mockObtenerOrden,
    listarOrdenesUsuario: mockListarOrdenesUsuario,
    listarOrdenesAdmin: mockListarOrdenesAdmin,
    cancelarOrden: mockCancelarOrden,
    actualizarEstadoOrden: mockActualizarEstadoOrden,
  },
}));

vi.mock('@/lib/payment/checkout-repository', () => ({
  repositorioCheckout: {
    crearNotificacion: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Helper: mock auth ────────────────────────────────────────

function mockAuthUser(userId = 'user-uuid-1', role = 'customer') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  };
  mockSupabaseFrom.mockReturnValue(profileChain);
}

function mockAuthAdmin(userId = 'admin-uuid-1') {
  mockAuthUser(userId, 'admin');
}

function mockAuthUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });
}

// ─── GET /api/ordenes ─────────────────────────────────────────

describe('GET /api/ordenes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuthUnauthenticated();
    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.exito).toBe(false);
    expect(body.error).toContain('autorizado');
  });

  it('returns customer orders for regular user', async () => {
    mockAuthUser();
    const orders = [makeOrder()];
    mockListarOrdenesUsuario.mockResolvedValue({ ordenes: orders, total: 1, paginas: 1 });

    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
    expect(body.datos).toHaveLength(1);
    expect(body.paginacion.total).toBe(1);
  });

  it('returns all orders for admin user', async () => {
    mockAuthAdmin();
    const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
    mockListarOrdenesAdmin.mockResolvedValue({ ordenes: orders, total: 2, paginas: 1 });

    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
    expect(body.datos).toHaveLength(2);
  });

  it('passes filters to admin service', async () => {
    mockAuthAdmin();
    mockListarOrdenesAdmin.mockResolvedValue({ ordenes: [], total: 0, paginas: 0 });

    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes?estado=pending&busqueda=SC-2024');
    await GET(req);

    expect(mockListarOrdenesAdmin).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({ estado: 'pending', busqueda: 'SC-2024' }),
    );
  });

  it('respects pagination params', async () => {
    mockAuthUser();
    mockListarOrdenesUsuario.mockResolvedValue({ ordenes: [], total: 0, paginas: 0 });

    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes?pagina=2&por_pagina=5');
    await GET(req);

    expect(mockListarOrdenesUsuario).toHaveBeenCalledWith('user-uuid-1', 2, 5);
  });

  it('caps por_pagina at 50', async () => {
    mockAuthUser();
    mockListarOrdenesUsuario.mockResolvedValue({ ordenes: [], total: 0, paginas: 0 });

    const { GET } = await import('@/app/api/ordenes/route');
    const req = makeRequest('http://localhost/api/ordenes?por_pagina=200');
    await GET(req);

    expect(mockListarOrdenesUsuario).toHaveBeenCalledWith('user-uuid-1', 1, 50);
  });
});

// ─── GET /api/ordenes/:id ─────────────────────────────────────

describe('GET /api/ordenes/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuthUnauthenticated();
    const { GET } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.exito).toBe(false);
  });

  it('returns 404 when order not found', async () => {
    mockAuthUser();
    mockObtenerOrden.mockResolvedValue(null);

    const { GET } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.exito).toBe(false);
  });

  it('returns 403 when user does not own the order', async () => {
    mockAuthUser('other-user');
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);

    const { GET } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.exito).toBe(false);
  });

  it('returns order when user owns it', async () => {
    mockAuthUser('user-uuid-1');
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);

    const { GET } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
    expect(body.datos.id).toBe('order-uuid-1');
  });

  it('allows admin to view any order', async () => {
    mockAuthAdmin('admin-uuid-1');
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);

    const { GET } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
  });
});

// ─── DELETE /api/ordenes/:id (cancel) ────────────────────────

describe('DELETE /api/ordenes/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuthUnauthenticated();
    const { DELETE } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.exito).toBe(false);
  });

  it('cancels order successfully', async () => {
    mockAuthUser('user-uuid-1');
    mockCancelarOrden.mockResolvedValue({ exito: true, mensaje: 'Orden cancelada exitosamente' });

    const { DELETE } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1', {
      method: 'DELETE',
      body: JSON.stringify({ motivo: 'No longer needed' }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
  });

  it('returns 400 when cancellation fails', async () => {
    mockAuthUser('user-uuid-1');
    mockCancelarOrden.mockResolvedValue({ exito: false, mensaje: 'No se puede cancelar' });

    const { DELETE } = await import('@/app/api/ordenes/[id]/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.exito).toBe(false);
  });
});

// ─── PATCH /api/ordenes/:id/estado ───────────────────────────

describe('PATCH /api/ordenes/:id/estado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuthUnauthenticated();
    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'confirmed' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.exito).toBe(false);
  });

  it('returns 403 when customer tries to update status', async () => {
    mockAuthUser('user-uuid-1', 'customer');
    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'confirmed' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.exito).toBe(false);
    expect(body.error).toContain('denegado');
  });

  it('returns 400 for invalid status', async () => {
    mockAuthAdmin();
    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'invalid_status_xyz' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.exito).toBe(false);
    expect(body.error).toContain('inválido');
  });

  it('returns 400 when estado is missing', async () => {
    mockAuthAdmin();
    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.exito).toBe(false);
  });

  it('returns 404 when order not found', async () => {
    mockAuthAdmin();
    mockObtenerOrden.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/nonexistent/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'confirmed' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.exito).toBe(false);
  });

  it('updates status successfully as admin', async () => {
    mockAuthAdmin();
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);
    mockActualizarEstadoOrden.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'confirmed' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
    expect(body.mensaje).toContain('confirmed');
  });

  it('updates status with ETA successfully', async () => {
    mockAuthAdmin();
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);
    mockActualizarEstadoOrden.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const eta = '2024-01-02T15:00:00Z';
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'out_for_delivery', estimated_delivery: eta }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockActualizarEstadoOrden).toHaveBeenCalledWith(
      'order-uuid-1',
      'out_for_delivery',
      undefined,
      undefined,
      eta,
    );
  });

  it('creates notification after status update', async () => {
    mockAuthAdmin();
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);
    mockActualizarEstadoOrden.mockResolvedValue(undefined);

    const { repositorioCheckout } = await import('@/lib/payment/checkout-repository');
    const notifSpy = vi.spyOn(repositorioCheckout, 'crearNotificacion').mockResolvedValue(undefined as never);

    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'confirmed' }),
    });
    await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });

    expect(notifSpy).toHaveBeenCalledWith(
      'user-uuid-1',
      'order_confirmed',
      expect.any(String),
      expect.stringContaining('SC-2024-001'),
      expect.any(Object),
    );
  });

  it('allows staff role to update status', async () => {
    mockAuthUser('staff-uuid-1', 'staff');
    const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
    mockObtenerOrden.mockResolvedValue(order);
    mockActualizarEstadoOrden.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
    const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'preparing' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exito).toBe(true);
  });

  it('accepts all valid statuses', async () => {
    const validStatuses: EstadoOrden[] = [
      'pending', 'confirmed', 'preparing', 'ready',
      'driver_assigned', 'out_for_delivery', 'delivered', 'cancelled',
    ];

    for (const estado of validStatuses) {
      vi.clearAllMocks();
      mockAuthAdmin();
      const order = makeOrder({ profile_id: 'user-uuid-1' }) as unknown as OrdenCompleta;
      mockObtenerOrden.mockResolvedValue(order);
      mockActualizarEstadoOrden.mockResolvedValue(undefined);

      const { PATCH } = await import('@/app/api/ordenes/[id]/estado/route');
      const req = makeRequest('http://localhost/api/ordenes/order-uuid-1/estado', {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'order-uuid-1' }) });
      expect(res.status).toBe(200);
    }
  });
});
