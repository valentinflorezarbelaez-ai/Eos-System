import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/core/domain/**/*.ts'],
      exclude: ['src/core/domain/types.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95
      }
    }
  }
});
