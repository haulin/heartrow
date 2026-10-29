import preact from '@preact/preset-vite'
import { defineConfig } from 'vite-plus'

const IGNORED = ['prototypes/**', 'local/**', 'dist/**', 'tests/baseline.json', 'package-lock.json', '**/*.md']

export default defineConfig({
    fmt: { ignorePatterns: IGNORED, semi: false, singleQuote: true, printWidth: 140, tabWidth: 4 },
    lint: {
        ignorePatterns: IGNORED,
        options: { typeAware: true, typeCheck: true },
    },
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
