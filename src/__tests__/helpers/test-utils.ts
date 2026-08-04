/**
 * Test Utilities & Shared Fixtures
 * Reusable helpers for the Street Candy test suite.
 */

import type { DbOrden, OrdenCompleta, StatusHistoryItem } from '@/lib/payment/types';

// ─── Order Fixtures ───────────────────────────────────────────

export function makeDbOrder(overrides: Partial<DbOrden> = {}): DbOrden {
  return {
    id: 'test-order-uuid-1',
    order_number: 'SC-TEST-001',
    profile_id: 'test-user-uuid-1',
    country_code: 'CO',
    shipping_address_id: 'test-addr-1',
    billing_address_id: null,
    status: 'pending',
    payment_status: 'paid',
    payment_method: 'stripe',
    payment_reference: 'pi_test_fixture',
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

export function makeCompleteOrder(overrides: Partial<OrdenCompleta> = {}): OrdenCompleta {
  return {
    ...makeDbOrder(),
    items: [],
    direccion_envio: null,
    direccion_facturacion: null,
    ...overrides,
  } as unknown as OrdenCompleta;
}

export function makeStatusHistory(statuses: string[]): StatusHistoryItem[] {
  return statuses.map((status, idx) => ({
    status,
    timestamp: new Date(Date.now() + idx * 60000).toISOString(),
  }));
}

// ─── Supabase Chain Builder ───────────────────────────────────

export function buildSupabaseChain(resolveWith: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.insert = () => chain;
  chain.update = () => chain;
  chain.eq = () => chain;
  chain.ilike = () => chain;
  chain.order = () => chain;
  chain.range = () => Promise.resolve(resolveWith);
  chain.single = () => Promise.resolve(resolveWith);
  return chain;
}

// ─── Mock Auth Helpers ────────────────────────────────────────

export function mockAuthenticatedUser(userId = 'test-user-uuid-1', role = 'customer') {
  return {
    getUser: () => Promise.resolve({ data: { user: { id: userId } }, error: null }),
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role }, error: null }),
            }),
          }),
        };
      }
      return buildSupabaseChain({ data: null, error: null });
    },
  };
}

export function mockUnauthenticated() {
  return {
    getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Not authenticated' } }),
    from: () => buildSupabaseChain({ data: null, error: null }),
  };
}

// ─── API Request Helpers ──────────────────────────────────────

export function makeNextRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

export function makeJsonRequest(url: string, body: unknown, method = 'POST'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Assertion Helpers ────────────────────────────────────────

import { expect } from 'vitest';

export function expectSuccessResponse(body: Record<string, unknown>) {
  expect(body.exito).toBe(true);
}

export function expectErrorResponse(body: Record<string, unknown>, statusCode?: number) {
  expect(body.exito).toBe(false);
  expect(body.error).toBeDefined();
}

export function expectPaginatedResponse(body: Record<string, unknown>) {
  expect(body.exito).toBe(true);
  expect(body.datos).toBeDefined();
  expect(body.paginacion).toBeDefined();
  expect((body.paginacion as Record<string, unknown>).pagina_actual).toBeDefined();
  expect((body.paginacion as Record<string, unknown>).total).toBeDefined();
}
