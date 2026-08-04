/**
 * Global test setup for Street Candy test suite.
 * Configures jest-dom matchers, mocks Next.js navigation,
 * and sets up MSW server for API mocking.
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// ─── Mock Next.js navigation ─────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'test-order-id' }),
  usePathname: () => '/cuenta/pedidos',
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Mock Next.js Link ────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  },
}));

// ─── Mock Next.js Image ───────────────────────────────────────
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    const React = require('react');
    return React.createElement('img', { src, alt, ...props });
  },
}));

// ─── Mock Supabase server client ──────────────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// ─── Mock Supabase browser client ────────────────────────────
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(),
}));

// ─── Mock AuthContext ─────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    profile: null,
    authLoading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

// ─── Suppress console.error for expected test errors ─────────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes('Warning: ReactDOM.render') ||
      msg.includes('act(') ||
      msg.includes('Not implemented:')
    ) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
