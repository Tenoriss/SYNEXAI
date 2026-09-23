import type { KeyValueDriver } from './driver'
import { CORRUPT_BACKUP_PREFIX } from './keys'
import { isRecord } from '@/utils/guards'

/** Current on-disk schema version. Bump when the stored shape changes and add a migration. */
export const SCHEMA_VERSION = 1

/**
 * Every stored value is wrapped in an envelope so the schema can evolve safely:
 *   { "schemaVersion": 1, "updatedAt": "...", "data": ... }
 */
export interface Envelope<T> {
  schemaVersion: number
  updatedAt: string
  data: T
}

/** Migration from version N to N+1, operating on untrusted JSON. */
export type Migration = (data: unknown) => unknown

export interface StorageIssue {
  key: string
  kind: 'corrupted' | 'invalid_items' | 'future_version'
  message: string
  /** Where the original raw value was preserved, if it was moved aside. */
  backupKey?: string
}

export type IssueReporter = (issue: StorageIssue) => void

interface StoredValueOptions<T> {
  driver: KeyValueDriver
  key: string
  fallback: () => T
  /** Validates and normalises migrated data. Return `null` if unusable. */
  parse: (data: unknown) => { value: T; dropped: number } | null
  migrations?: Record<number, Migration>
  onIssue?: IssueReporter
}

/**
 * A single versioned, validated value in key/value storage.
 *
 * Reading never throws: missing data returns the fallback; corrupted data is
 * copied to a `synex_corrupt_*` backup key (so nothing is silently lost) and
 * the fallback is returned.
 */
export class StoredValue<T> {
  private readonly opts: StoredValueOptions<T>

  constructor(opts: StoredValueOptions<T>) {
    this.opts = opts
  }

  get key() {
    return this.opts.key
  }

  read(): T {
    const { driver, key, fallback, parse, onIssue } = this.opts
    const raw = driver.getItem(key)
    if (raw === null) return fallback()

    let envelope: unknown
    try {
      envelope = JSON.parse(raw)
    } catch {
      return this.quarantine(raw, 'Stored data is not valid JSON.')
    }

    if (!isRecord(envelope) || typeof envelope.schemaVersion !== 'number' || !('data' in envelope)) {
      return this.quarantine(raw, 'Stored data has an unrecognised format.')
    }

    if (envelope.schemaVersion > SCHEMA_VERSION) {
      // Written by a newer app version. Do not overwrite — just don't use it.
      onIssue?.({
        key,
        kind: 'future_version',
        message: `Data was saved by a newer version of SYNEX AI (schema v${envelope.schemaVersion}).`,
      })
      return fallback()
    }

    let data: unknown = envelope.data
    try {
      data = this.migrate(data, envelope.schemaVersion)
    } catch {
      return this.quarantine(raw, 'Stored data could not be upgraded to the current format.')
    }

    const parsed = parse(data)
    if (!parsed) return this.quarantine(raw, 'Stored data failed validation.')

    if (parsed.dropped > 0) {
      onIssue?.({
        key,
        kind: 'invalid_items',
        message: `${parsed.dropped} invalid record(s) were skipped.`,
      })
    }

    // Persist upgraded data so migrations run only once.
    if (envelope.schemaVersion < SCHEMA_VERSION) this.write(parsed.value)

    return parsed.value
  }

  write(value: T): void {
    const envelope: Envelope<T> = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      data: value,
    }
    this.opts.driver.setItem(this.opts.key, JSON.stringify(envelope))
  }

  clear(): void {
    this.opts.driver.removeItem(this.opts.key)
  }

  private migrate(data: unknown, fromVersion: number): unknown {
    let current = data
    for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
      const step = this.opts.migrations?.[v]
      if (!step) throw new Error(`Missing migration from schema v${v}`)
      current = step(current)
    }
    return current
  }

  private quarantine(raw: string, message: string): T {
    const { driver, key, fallback, onIssue } = this.opts
    const backupKey = `${CORRUPT_BACKUP_PREFIX}${key}_${Date.now()}`
    try {
      driver.setItem(backupKey, raw)
      driver.removeItem(key)
    } catch {
      // If we cannot back it up (quota), leave the original in place untouched.
      onIssue?.({ key, kind: 'corrupted', message })
      return fallback()
    }
    onIssue?.({ key, kind: 'corrupted', message, backupKey })
    return fallback()
  }
}

/** Helper for array collections: keeps valid items and counts dropped ones. */
export function parseArray<T>(data: unknown, isItem: (v: unknown) => v is T) {
  if (!Array.isArray(data)) return null
  const value = data.filter(isItem)
  return { value, dropped: data.length - value.length }
}
