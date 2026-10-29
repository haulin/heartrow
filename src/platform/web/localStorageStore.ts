import { createJsonStorage } from './storage'
import type { AppStorage } from './storage'

export function createLocalStorage(prefix = 'heartrow:'): AppStorage {
    return createJsonStorage(() => globalThis.localStorage ?? null, prefix)
}
