/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Performance and timeout settings
    testTimeout: 30000, // 30 seconds for regular tests
    hookTimeout: 10000, // 10 seconds for beforeAll/afterAll hooks
    pool: 'forks', // Use forks for better WSL2 compatibility
    poolOptions: {
      forks: {
        singleFork: true, // Single process for debugging
        isolate: true,
      },
    },
    exclude: [
      'node_modules/**',
      '**/e2e/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
