import { NotFoundError, ValidationError } from './repositories/types'
import { StorageQuotaError } from './driver'

/**
 * Turns a persistence error into something a person can act on (spec §24).
 * Never includes stack traces, storage contents or secrets.
 */
export function describeStorageError(err: unknown): string {
  if (err instanceof StorageQuotaError) return err.message
  if (err instanceof ValidationError || err instanceof NotFoundError) return err.message
  if (err instanceof Error && err.message) return err.message
  return 'The change could not be saved. Please try again.'
}

/** Reassurance shown alongside any persistence error. */
export const DATA_SAFE_NOTE = 'Nothing was lost — your projects are still stored in this browser.'
