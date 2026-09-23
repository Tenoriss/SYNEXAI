import type { KeyValueDriver } from '../driver'
import { StoredValue, type IssueReporter } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { normaliseSettings } from '../validators'
import type { SettingsRepository } from './types'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings'

export class LocalStorageSettingsRepository implements SettingsRepository {
  private readonly store: StoredValue<AppSettings>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    this.store = new StoredValue<AppSettings>({
      driver,
      key: STORAGE_KEYS.settings,
      fallback: () => ({ ...DEFAULT_SETTINGS }),
      parse: (data) => {
        const value = normaliseSettings(data)
        return value ? { value, dropped: 0 } : null
      },
      onIssue,
    })
  }

  /** Synchronous read — used for first paint (theme) before React mounts. */
  getSync(): AppSettings {
    return this.store.read()
  }

  async get() {
    return this.store.read()
  }

  async update(patch: Partial<AppSettings>) {
    const next = normaliseSettings({ ...this.store.read(), ...patch }) ?? { ...DEFAULT_SETTINGS }
    this.store.write(next)
    return next
  }
}
