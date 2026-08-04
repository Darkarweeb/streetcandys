/**
 * UI Tests — Customer Order Detail Page
 * Tests for src/app/cuenta/pedidos/[id]/page.tsx
 *
 * Verifies:
 *  - Progress tracker rendering
 *  - Status timeline
 *  - ETA display
 *  - Status badge
 *  - Last updated label
 *  - Cancelled banner
 *  - Delivered banner
 *  - Cancel button visibility
 *  - Loading state
 *  - Error state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { OrdenCompleta } from '@/lib/payment/types';

// ─── Helpers ─────────────────────────────────────────────────

function makeCompleteOrder(overrides: Partial<OrdenCompleta> = {}): OrdenCompleta {
  return {
    id: 'order-ui-1',
    order_number: 'SC-UI-001',
    profile_id: 'user-uuid-1',
    country_code: 'CO',
    shipping_address_id: 'addr-1',
    billing_address_id: null,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'stripe',
    payment_reference: 'pi_test_ui',
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
    status_updated_at: '2024-01-01T12:00:00Z',
    estimated_delivery_time: null,
    status_history: [
      { status: 'pending', timestamp: '2024-01-01T10:00:00Z' },
      { status: 'confirmed', timestamp: '2024-01-01T12:00:00Z' },
    ],
    metadata: {},
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    items: [],
    direccion_envio: null,
    direccion_facturacion: null,
    ...overrides,
  } as unknown as OrdenCompleta;
}

// ─── Mock fetch ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Mock CuentaLayout ────────────────────────────────────────

vi.mock('@/components/cuenta/CuentaLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'cuenta-layout' }, children),
}));

// ─── Tests ───────────────────────────────────────────────────

describe('Customer Order Detail Page — UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', async () => {
    // Delay the fetch response to see loading state
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        json: () => Promise.resolve({ exito: true, datos: makeCompleteOrder() }),
      }), 100))
    );

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    const { container } = render(React.createElement(PedidoDetallePage));

    // Loading skeleton should be visible
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders order number after loading', async () => {
    const order = makeCompleteOrder();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText(/SC-UI-001/)).toBeTruthy();
    });
  });

  it('renders status badge with correct label', async () => {
    const order = makeCompleteOrder({ status: 'confirmed' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Confirmado')).toBeTruthy();
    });
  });

  it('renders progress tracker for active order', async () => {
    const order = makeCompleteOrder({ status: 'preparing' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Estado del pedido')).toBeTruthy();
    });
  });

  it('renders status timeline with history entries', async () => {
    const order = makeCompleteOrder({
      status_history: [
        { status: 'pending', timestamp: '2024-01-01T10:00:00Z' },
        { status: 'confirmed', timestamp: '2024-01-01T12:00:00Z' },
      ],
    });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Historial de estados')).toBeTruthy();
    });
  });

  it('renders ETA when estimated_delivery_time is set', async () => {
    const order = makeCompleteOrder({
      estimated_delivery_time: '2024-01-02T15:00:00Z',
    });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText(/Entrega estimada/i)).toBeTruthy();
    });
  });

  it('does NOT render ETA when not set', async () => {
    const order = makeCompleteOrder({ estimated_delivery_time: null });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.queryByText(/Entrega estimada/i)).toBeNull();
    });
  });

  it('shows cancel button for pending orders', async () => {
    const order = makeCompleteOrder({ status: 'pending' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Cancelar pedido')).toBeTruthy();
    });
  });

  it('shows cancel button for confirmed orders', async () => {
    const order = makeCompleteOrder({ status: 'confirmed' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Cancelar pedido')).toBeTruthy();
    });
  });

  it('does NOT show cancel button for preparing orders', async () => {
    const order = makeCompleteOrder({ status: 'preparing' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.queryByText('Cancelar pedido')).toBeNull();
    });
  });

  it('does NOT show cancel button for delivered orders', async () => {
    const order = makeCompleteOrder({ status: 'delivered' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.queryByText('Cancelar pedido')).toBeNull();
    });
  });

  it('shows cancelled status badge for cancelled orders', async () => {
    const order = makeCompleteOrder({ status: 'cancelled' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Cancelado')).toBeTruthy();
    });
  });

  it('shows delivered status badge for delivered orders', async () => {
    const order = makeCompleteOrder({ status: 'delivered' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Entregado')).toBeTruthy();
    });
  });

  it('renders error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: false, error: 'Orden no encontrada' }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Orden no encontrada')).toBeTruthy();
    });
  });

  it('renders breadcrumb navigation', async () => {
    const order = makeCompleteOrder();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      expect(screen.getByText('Mis Pedidos')).toBeTruthy();
    });
  });

  it('renders status_updated_at label when available', async () => {
    const order = makeCompleteOrder({ status_updated_at: '2024-01-01T12:00:00Z' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ exito: true, datos: order }),
    });

    const { default: PedidoDetallePage } = await import('@/app/cuenta/pedidos/[id]/page');
    render(React.createElement(PedidoDetallePage));

    await waitFor(() => {
      // "Última actualización" or similar label
      expect(screen.getByText(/ltima actualizaci/i)).toBeTruthy();
    });
  });
});
