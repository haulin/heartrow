// Runs tools/sim.ts through Vite's SSR loader, so the extensionless TypeScript imports of src/core resolve without a build step.
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const server = await createServer({
    configFile: false,
    root: process.cwd(),
    appType: 'custom',
    // Web modules that build share links read the version the Vite build injects.
    define: { __APP_VERSION__: JSON.stringify(version) },
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
})
try {
    const { main } = await server.ssrLoadModule('/tools/sim.ts')
    main(process.argv.slice(2))
} finally {
    await server.close()
}
