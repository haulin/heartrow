import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite-plus'

const { version, homepage } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string
    homepage: string
}
const PACKAGE_JSON = fileURLToPath(new URL('./package.json', import.meta.url))
const CORE_DIR = fileURLToPath(new URL('./src/core/', import.meta.url))

const IGNORED = ['prototypes/**', 'local/**', 'dist/**', 'tools/baseline/v7-final.json', 'package-lock.json']

export default defineConfig({
    fmt: { ignorePatterns: IGNORED, semi: false, singleQuote: true, printWidth: 140, tabWidth: 4 },
    lint: {
        ignorePatterns: IGNORED,
        options: { typeAware: true, typeCheck: true },
    },
    root: 'src/platform/web',
    base: './',
    plugins: [
        preact(),
        {
            // A hot update of the engine lets the open game keep calling the old functions, so reload the page instead.
            name: 'reload-on-core-change',
            handleHotUpdate({ file, server }) {
                if (!file.startsWith(CORE_DIR)) return
                server.config.logger.info(`core change, full reload ${file.slice(CORE_DIR.length)}`, { timestamp: true })
                server.ws.send({ type: 'full-reload' })
                return []
            },
        },
        {
            // The link preview needs absolute addresses. They come from `homepage` in package.json, the one place that names the site.
            name: 'site-url-in-html',
            transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', homepage),
        },
        {
            name: 'restart-on-package-change',
            configureServer(server) {
                server.watcher.add(PACKAGE_JSON)
                let restart: Promise<void> | undefined
                server.watcher.on('change', (file) => {
                    if (file !== PACKAGE_JSON || restart) return
                    restart = server.restart().finally(() => {
                        restart = undefined
                    })
                })
            },
        },
    ],
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
        outDir: '../../../dist',
        emptyOutDir: true,
    },
    test: {
        root: '.',
        include: ['tests/**/*.test.ts'],
        exclude: ['**/node_modules/**'],
    },
})
