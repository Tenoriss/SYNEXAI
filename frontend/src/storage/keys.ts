/** All persisted keys share the `synex_` prefix (spec §42). */
export const STORAGE_PREFIX = 'synex_'

export const STORAGE_KEYS = {
  projects: `${STORAGE_PREFIX}projects`,
  analysisVersions: `${STORAGE_PREFIX}analysis_versions`,
  settings: `${STORAGE_PREFIX}settings`,
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** Prefix used when a corrupted value is moved aside instead of being deleted. */
export const CORRUPT_BACKUP_PREFIX = `${STORAGE_PREFIX}corrupt_`
