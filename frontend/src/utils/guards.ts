/** Small runtime type guards used to validate data read from storage. */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const isString = (v: unknown): v is string => typeof v === 'string'

export const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export const isIsoDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

export const isOneOf = <T extends string>(values: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (values as readonly string[]).includes(v)
