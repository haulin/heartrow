/** Minimal key-value persistence. A Capacitor build can provide its own implementation. Values are JSON. */
export interface AppStorage {
  get<T>(key: string, fallback: T): T
  set(key: string, value: unknown): void
  remove(key: string): void
}

export function createMemoryStorage(initial: Record<string, string> = {}): AppStorage {
  const data = new Map(Object.entries(initial))
  return {
    get(key, fallback) {
      const raw = data.get(key)
      if (raw === undefined) return fallback
      try {
        return JSON.parse(raw)
      } catch {
        return fallback
      }
    },
    set(key, value) {
      data.set(key, JSON.stringify(value))
    },
    remove(key) {
      data.delete(key)
    },
  }
}

/** Wraps any string-backed store (such as the DOM Storage). Every access is guarded, so blocked or full storage never throws. */
export function createJsonStorage(backend: () => Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'> | null, prefix = ''): AppStorage {
  const safe = <R>(fn: (b: NonNullable<ReturnType<typeof backend>>) => R, fallback: R): R => {
    try {
      const b = backend()
      return b ? fn(b) : fallback
    } catch {
      return fallback
    }
  }
  return {
    get(key, fallback) {
      const raw = safe((b) => b.getItem(prefix + key), null)
      if (raw === null) return fallback
      try {
        return JSON.parse(raw)
      } catch {
        return fallback
      }
    },
    set(key, value) {
      safe((b) => b.setItem(prefix + key, JSON.stringify(value)), undefined)
    },
    remove(key) {
      safe((b) => b.removeItem(prefix + key), undefined)
    },
  }
}
