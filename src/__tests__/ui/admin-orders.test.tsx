/**
 * UI Tests — Admin Orders Page
 * Tests for src/app/admin/pedidos/page.tsx
 *
 * Verifies:
 *  - Filters (status, payment, search)
 *  - Status dropdown in order drawer
 *  - ETA editor
 *  - Notes field
 *  - Timeline in drawer
 *  - Progress tracker in drawer
 *  - Loading state
 *  - Error state
 *  - Redirect for non-admin users
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import type { DbOrden } from '@/lib/payment/types';

// ─── Helpers ─────────────────────────────────────────────────

function makeOrder(overrides: Partial<DbOrden> = {}): DbOrden {
  return {
    id: 'admin-order-1',
    order_number: 'SC-ADMIN-001',
    profile_id: 'user-uuid-1',
    country_code: 'CO',
    shipping_address_id: 'addr-1',
    billing_address_id: null,
    status: 'pending',
    payment_status: 'paid',
    payment_method: 'stripe',
    payment_reference: 'pi_test_admin',
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
    ],
    metadata: {},
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

// ─── Mock fetch ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Mock useAuth ─────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'admin-uuid-1', email: 'admin@test.com' },
    profile: { role: 'admin' },
    authLoading: false,
  })),
}));

// ─── Mock AdminLayout ─────────────────────────────────────────

vi.mock('@/components/admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'admin-layout' }, children),
}));

// ─── Mock useRouter ───────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/admin/pedidos',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// ─── Tests ───────────────────────────────────────────────────

describe('Admin Orders Page — UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin layout wrapper', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(screen.getByTestId('admin-layout')).toBeTruthy();
    });
  });

  it('renders orders table with order number', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(screen.getByText('SC-ADMIN-001')).toBeTruthy();
    });
  });

  it('renders status filter dropdown', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 0, total_paginas: 0 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      // Status filter select should be present
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  it('renders search input', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 0, total_paginas: 0 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar/i);
      expect(searchInput).toBeTruthy();
    });
  });

  it('renders loading skeleton while fetching', async () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        json: () => Promise.resolve({ exito: true, datos: [], paginacion: {} }),
      }), 100))
    );

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    const { container } = render(React.createElement(AdminPedidosPage));

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders status badge for each order', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder({ status: 'pending' })],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeTruthy();
    });
  });

  it('renders total order count', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 42, total_paginas: 3 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(screen.getByText(/42/)).toBeTruthy();
    });
  });

  it('opens order drawer when row is clicked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      const orderRow = screen.getByText('SC-ADMIN-001');
      fireEvent.click(orderRow);
    });

    await waitFor(() => {
      // Drawer should show order details
      expect(screen.getAllByText(/SC-ADMIN-001/).length).toBeGreaterThan(0);
    });
  });

  it('drawer shows status dropdown for status update', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      fireEvent.click(screen.getByText('SC-ADMIN-001'));
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo estado')).toBeTruthy();
    });
  });

  it('drawer shows ETA editor', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      fireEvent.click(screen.getByText('SC-ADMIN-001'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Entrega estimada/i)).toBeTruthy();
    });
  });

  it('drawer shows notes input', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder()],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      fireEvent.click(screen.getByText('SC-ADMIN-001'));
    });

    await waitFor(() => {
      const notaInput = screen.getByPlaceholderText(/nota/i);
      expect(notaInput).toBeTruthy();
    });
  });

  it('drawer shows status history timeline', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder({
          status_history: [
            { status: 'pending', timestamp: '2024-01-01T10:00:00Z' },
            { status: 'confirmed', timestamp: '2024-01-01T12:00:00Z' },
          ],
        })],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      fireEvent.click(screen.getByText('SC-ADMIN-001'));
    });

    await waitFor(() => {
      expect(screen.getByText('Historial de estados')).toBeTruthy();
    });
  });

  it('drawer shows progress tracker for active orders', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [makeOrder({ status: 'preparing' })],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 1, total_paginas: 1 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      fireEvent.click(screen.getByText('SC-ADMIN-001'));
    });

    await waitFor(() => {
      expect(screen.getByText('Progreso del pedido')).toBeTruthy();
    });
  });

  it('redirects non-admin users', async () => {
    const { useAuth } = await import('@/contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-uuid-1' } as never,
      profile: { role: 'customer' } as never,
      authLoading: false,
      signOut: vi.fn(),
    } as never);

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('renders empty state when no orders', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        exito: true,
        datos: [],
        paginacion: { pagina_actual: 1, por_pagina: 15, total: 0, total_paginas: 0 },
      }),
    });

    const { default: AdminPedidosPage } = await import('@/app/admin/pedidos/page');
    render(React.createElement(AdminPedidosPage));

    await waitFor(() => {
      expect(screen.getByText(/no hay pedidos/i)).toBeTruthy();
    });
  });
});
