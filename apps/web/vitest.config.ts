import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@apex-os/kernel': resolve(__dirname, '../../packages/kernel/src'),
      '@apex-os/logger': resolve(__dirname, '../../packages/logger/src'),
    },
  },
});
