import { SI_LIMITS } from '@/types/systemInformation'
import type { SystemInformationContent, SystemInformationErrors } from '@/types/systemInformation'

/**
 * Validation for the analysis input (spec §21). Only the three fields the later
 * phases cannot work without are required; everything else stays optional so a
 * partially documented system can still be saved as a draft.
 */
export function validateSystemInformation(content: SystemInformationContent): SystemInformationErrors {
  const errors: SystemInformationErrors = {}

  if (!content.systemName.trim()) errors.systemName = 'System name is required.'
  else if (content.systemName.length > SI_LIMITS.systemName)
    errors.systemName = `Use ${SI_LIMITS.systemName} characters or fewer.`

  if (!content.systemType.trim()) errors.systemType = 'System type is required.'
  else if (content.systemType.length > SI_LIMITS.systemType)
    errors.systemType = `Use ${SI_LIMITS.systemType} characters or fewer.`

  if (!content.systemPurpose.trim()) errors.systemPurpose = 'System purpose is required.'
  else if (content.systemPurpose.length > SI_LIMITS.systemPurpose)
    errors.systemPurpose = `Use ${SI_LIMITS.systemPurpose} characters or fewer.`

  return errors
}

export const hasValidationErrors = (errors: SystemInformationErrors): boolean =>
  Object.values(errors).some(Boolean)

/** Where the analyst should be sent when required input is missing. */
export const MISSING_FIELD_SECTION: Partial<Record<keyof SystemInformationErrors, 'overview'>> = {
  systemName: 'overview',
  systemType: 'overview',
  systemPurpose: 'overview',
}
