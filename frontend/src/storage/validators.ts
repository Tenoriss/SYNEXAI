import { PROJECT_STATUSES, type Project } from '@/types/project'
import type { AnalysisVersion, SystemInput } from '@/types/analysis'
import { DEFAULT_SETTINGS, THEME_PREFERENCES, type AppSettings } from '@/types/settings'
import { isIsoDate, isNonEmptyString, isOneOf, isRecord, isString } from '@/utils/guards'

export const SYSTEM_INPUT_FIELDS = [
  'systemName',
  'domain',
  'systemType',
  'description',
  'stakeholders',
  'actors',
  'users',
  'currentProcess',
  'existingProblems',
  'currentTechnology',
  'importantData',
  'additionalContext',
] as const satisfies readonly (keyof SystemInput)[]

export function isProject(v: unknown): v is Project {
  return (
    isRecord(v) &&
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isString(v.description) &&
    isString(v.domain) &&
    isOneOf(PROJECT_STATUSES, v.status) &&
    isIsoDate(v.createdAt) &&
    isIsoDate(v.updatedAt)
  )
}

export function isSystemInput(v: unknown): v is SystemInput {
  return isRecord(v) && SYSTEM_INPUT_FIELDS.every((f) => isString(v[f]))
}

export function isAnalysisVersion(v: unknown): v is AnalysisVersion {
  return (
    isRecord(v) &&
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.projectId) &&
    isIsoDate(v.createdAt) &&
    isSystemInput(v.inputSnapshot) &&
    isRecord(v.analysisResult)
  )
}

/** Settings are forgiving: unknown / invalid fields fall back to defaults. */
export function normaliseSettings(v: unknown): AppSettings | null {
  if (!isRecord(v)) return null
  return {
    theme: isOneOf(THEME_PREFERENCES, v.theme) ? v.theme : DEFAULT_SETTINGS.theme,
    sidebarCollapsed:
      typeof v.sidebarCollapsed === 'boolean' ? v.sidebarCollapsed : DEFAULT_SETTINGS.sidebarCollapsed,
  }
}
