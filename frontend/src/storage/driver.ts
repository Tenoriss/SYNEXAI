/**
 * Minimal key/value driver. Repositories depend on this interface rather than on
 * `window.localStorage`, which keeps them testable and swappable.
 */
export interface KeyValueDriver {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
  /** True when data survives a page reload. */
  readonly persistent: boolean
}

export class StorageQuotaError extends Error {
  constructor() {
    super('Local storage is full. Delete unused projects or analyses and try again.')
    this.name = 'StorageQuotaError'
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22)
  )
}

export class LocalStorageDriver implements KeyValueDriver {
  readonly persistent = true
  private readonly store: Storage

  constructor(store: Storage) {
    this.store = store
  }

  getItem(key: string) {
    return this.store.getItem(key)
  }

  setItem(key: string, value: string) {
    try {
      this.store.setItem(key, value)
    } catch (err) {
      if (isQuotaError(err)) throw new StorageQuotaError()
      throw err
    }
  }

  removeItem(key: string) {
    this.store.removeItem(key)
  }

  keys() {
    const out: string[] = []
    for (let i = 0; i < this.store.length; i++) {
      const k = this.store.key(i)
      if (k !== null) out.push(k)
    }
    return out
  }
}

/** Non-persistent fallback (tests, private browsing with storage disabled). */
export class MemoryDriver implements KeyValueDriver {
  readonly persistent = false
  private readonly map = new Map<string, string>()

  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  keys() {
    return [...this.map.keys()]
  }
}

/** Returns a LocalStorage driver if usable, otherwise an in-memory fallback. */
export function createDefaultDriver(): KeyValueDriver {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__synex_probe__'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return new LocalStorageDriver(window.localStorage)
    }
  } catch {
    // Access denied (e.g. disabled cookies / sandboxed iframe) — fall through.
  }
  return new MemoryDriver()
}
