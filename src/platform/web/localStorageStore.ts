import { createJsonStorage } from './storage'
import type { AppStorage } from './storage'

export function createLocalStorage(prefix = 'heartrow:'): AppStorage {
    return createJsonStorage(() => globalThis.localStorage ?? null, prefix)
}

/** Lives as long as the tab does. */
export function createTabStorage(prefix = 'heartrow:'): AppStorage {
    return createJsonStorage(() => globalThis.sessionStorage ?? null, prefix)
}
