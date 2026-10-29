import preact from '@preact/preset-vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  root: 'src/platform/web',
  base: './',
  plugins: [preact()],
  build: {
    outDir: '../../../dist',
    emptyOutDir: true,
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.slow.test.ts'],
  },
})
