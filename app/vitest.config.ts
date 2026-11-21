import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'tests/rules-check/fixtures/**'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
  },
})
