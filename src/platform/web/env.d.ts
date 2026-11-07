declare module '*.css'

/** The `version` from `package.json`, injected at build time by `vite.config.ts`. */
declare const __APP_VERSION__: string

interface ImportMeta {
    readonly env: { readonly DEV: boolean; readonly PROD: boolean }
    /** Vite's file import by pattern, with the options this app uses. */
    glob<T>(pattern: string, options: { eager: true; query?: string; import?: string }): Record<string, T>
    /** Only in the dev server. */
    readonly hot?: { on(event: string, callback: () => void): void; off(event: string, callback: () => void): void }
}
