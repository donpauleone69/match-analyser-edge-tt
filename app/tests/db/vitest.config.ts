// Config for the node half of `npm run check:db` only.
import { defineConfig } from 'vitest/config'
import path from 'path'

const app = path.resolve(__dirname, '../..')

export default defineConfig({
  root: app,
  resolve: { alias: { '@': path.join(app, 'src') } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.dbcheck.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
  },
})
