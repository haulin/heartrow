import { defineConfig } from 'vite-plus'

export default defineConfig({
    test: {
        root: '.',
        include: ['tests/baseline/**/*.slow.test.ts'],
        testTimeout: 300000,
    },
})
