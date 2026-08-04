/**
 * Unit Tests — Order Repository
 * Tests for src/lib/payment/order-repository.ts
 *
 * All Supabase calls are mocked via vi.mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repositorioOrdenes } from '@/lib/payment/order-repository';
import type { DbOrden, StatusHistoryItem } from '@/lib/payment/types';

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

// ─── Mock Supabase ────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockRange = vi.fn();
const mockOrder = vi.fn();
const mockIlike = vi.fn();

function buildChain() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = mockSingle;
  chain.range = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  return chain;
}

const mockFrom = vi.fn(() => buildChain());
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// ─── Tests ───────────────────────────────────────────────────

describe('repositorioOrdenes.crear()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an order and returns the created record', async () => {
    const order = makeOrder();
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: order, error: null });
    chain.insert = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const input = { ...order };
    delete (input as Partial<DbOrden>).id;
    delete (input as Partial<DbOrden>).created_at;
    delete (input as Partial<DbOrden>).updated_at;

    const result = await repositorioOrdenes.crear(input as Omit<DbOrden, 'id' | 'created_at' | 'updated_at'>);
    expect(result).toEqual(order);
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    chain.insert = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const order = makeOrder();
    await expect(
      repositorioOrdenes.crear(order as Omit<DbOrden, 'id' | 'created_at' | 'updated_at'>)
    ).rejects.toThrow('Error creando orden');
  });
});

describe('repositorioOrdenes.obtenerPorId()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns order when found', async () => {
    const order = makeOrder();
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: order, error: null });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.obtenerPorId('order-uuid-1');
    expect(result).toEqual(order);
  });

  it('returns null when order not found (PGRST116)', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.obtenerPorId('nonexistent-id');
    expect(result).toBeNull();
  });

  it('throws on unexpected DB error', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: '500', message: 'Server error' } });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await expect(repositorioOrdenes.obtenerPorId('bad-id')).rejects.toThrow('Error obteniendo orden');
  });
});

describe('repositorioOrdenes.obtenerPorNumero()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns order by order number', async () => {
    const order = makeOrder();
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: order, error: null });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.obtenerPorNumero('SC-2024-001');
    expect(result?.order_number).toBe('SC-2024-001');
  });

  it('returns null when not found', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.obtenerPorNumero('NONEXISTENT');
    expect(result).toBeNull();
  });
});

describe('repositorioOrdenes.actualizarEstado()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates status and appends to status_history', async () => {
    const existingHistory: StatusHistoryItem[] = [
      { status: 'pending', timestamp: '2024-01-01T10:00:00Z' },
    ];
    const order = makeOrder({ status_history: existingHistory });

    // First call: select status_history
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: existingHistory }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    // Second call: update
    const updateChain = buildChain();
    updateChain.eq = vi.fn(() => ({ error: null }));
    updateChain.update = vi.fn(() => updateChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await expect(
      repositorioOrdenes.actualizarEstado('order-uuid-1', 'confirmed')
    ).resolves.toBeUndefined();
  });

  it('sets cancelled_at when status is cancelled', async () => {
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: [] }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    let updatedData: Record<string, unknown> = {};
    const updateChain = buildChain();
    updateChain.update = vi.fn((data) => { updatedData = data; return updateChain; });
    updateChain.eq = vi.fn(() => ({ error: null }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await repositorioOrdenes.actualizarEstado('order-uuid-1', 'cancelled');
    expect(updatedData.cancelled_at).toBeDefined();
  });

  it('sets delivered_at when status is delivered', async () => {
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: [] }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    let updatedData: Record<string, unknown> = {};
    const updateChain = buildChain();
    updateChain.update = vi.fn((data) => { updatedData = data; return updateChain; });
    updateChain.eq = vi.fn(() => ({ error: null }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await repositorioOrdenes.actualizarEstado('order-uuid-1', 'delivered');
    expect(updatedData.delivered_at).toBeDefined();
  });

  it('sets shipped_at when status is out_for_delivery', async () => {
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: [] }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    let updatedData: Record<string, unknown> = {};
    const updateChain = buildChain();
    updateChain.update = vi.fn((data) => { updatedData = data; return updateChain; });
    updateChain.eq = vi.fn(() => ({ error: null }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await repositorioOrdenes.actualizarEstado('order-uuid-1', 'out_for_delivery');
    expect(updatedData.shipped_at).toBeDefined();
  });

  it('sets estimated_delivery_time when provided', async () => {
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: [] }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    let updatedData: Record<string, unknown> = {};
    const updateChain = buildChain();
    updateChain.update = vi.fn((data) => { updatedData = data; return updateChain; });
    updateChain.eq = vi.fn(() => ({ error: null }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const eta = '2024-01-02T15:00:00Z';
    await repositorioOrdenes.actualizarEstado('order-uuid-1', 'confirmed', undefined, eta);
    expect(updatedData.estimated_delivery_time).toBe(eta);
  });

  it('throws when update fails', async () => {
    const selectChain = buildChain();
    selectChain.single = vi.fn().mockResolvedValue({ data: { status_history: [] }, error: null });
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.select = vi.fn(() => selectChain);

    const updateChain = buildChain();
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => ({ error: { message: 'Update failed' } }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await expect(
      repositorioOrdenes.actualizarEstado('order-uuid-1', 'confirmed')
    ).rejects.toThrow('Error actualizando estado de orden');
  });
});

describe('repositorioOrdenes.listarPorUsuario()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated orders for a user', async () => {
    const orders = [makeOrder(), makeOrder({ id: 'order-2', order_number: 'SC-2024-002' })];
    const chain = buildChain();
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn().mockResolvedValue({ data: orders, error: null, count: 2 });
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.listarPorUsuario('user-uuid-1', 1, 10);
    expect(result.ordenes).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('returns empty array when user has no orders', async () => {
    const chain = buildChain();
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.listarPorUsuario('user-no-orders', 1, 10);
    expect(result.ordenes).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('repositorioOrdenes.listarTodas() — admin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all orders with pagination', async () => {
    const orders = [makeOrder()];
    const chain = buildChain();
    chain.select = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn().mockResolvedValue({ data: orders, error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await repositorioOrdenes.listarTodas(1, 15);
    expect(result.ordenes).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('applies status filter when provided', async () => {
    const chain = buildChain();
    const eqSpy = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.eq = eqSpy;
    chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    await repositorioOrdenes.listarTodas(1, 15, { estado: 'pending' });
    expect(eqSpy).toHaveBeenCalledWith('status', 'pending');
  });
});
