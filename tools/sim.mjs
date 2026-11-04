// Runs tools/sim.ts through Vite's SSR loader, so the extensionless TypeScript imports of src/core resolve without a build step.
import { createServer } from 'vite'

const server = await createServer({
    configFile: false,
    root: process.cwd(),
    appType: 'custom',
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
