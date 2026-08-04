import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/payment/order-service.ts',
        'src/lib/payment/order-repository.ts',
        'src/lib/order-status.ts',
        'src/app/api/ordenes/**/*.ts',
        'src/app/cuenta/pedidos/**/*.tsx',
        'src/app/admin/pedidos/**/*.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path?.resolve(__dirname, './src'),
    },
  },
});
