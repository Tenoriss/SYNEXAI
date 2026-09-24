import { PROJECT_STATUSES, type Project } from '@/types/project'
import {
  ANALYSIS_TASK_TYPES,
  UNDERSTANDING_FIELDS,
  type AnalysisMeta,
  type AnalysisRecord,
  type SystemUnderstanding,
} from '@/types/analysis'
import { DEFAULT_SETTINGS, THEME_PREFERENCES, type AppSettings } from '@/types/settings'
import { normaliseContent } from './systemInformationNormalisation'
import { isIsoDate, isNonEmptyString, isOneOf, isRecord, isString } from '@/utils/guards'

export function isProject(v: unknown): v is Project {
  return (
    isRecord(v) &&
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isString(v.description) &&
    isString(v.systemType) &&
    isString(v.organization) &&
    isString(v.analyst) &&
    isOneOf(PROJECT_STATUSES, v.status) &&
    isIsoDate(v.createdAt) &&
    isIsoDate(v.updatedAt)
  )
}

/**
 * A stored analysis record. Written by us, read from untrusted browser storage:
 * text fields must be strings and list fields must be lists of strings, so a
 * hand-edited or half-written entry can never be rendered as trusted analysis.
 */
export function isSystemUnderstanding(v: unknown): v is SystemUnderstanding {
  if (!isRecord(v)) return false
  return UNDERSTANDING_FIELDS.every((field) => {
    const value = v[field]
    if (field === 'summary' || field === 'purpose' || field === 'systemScope') return isString(value)
    return Array.isArray(value) && value.every(isString)
  })
}

/** Best-effort repair of the model output: keeps valid items, drops malformed ones. */
export function normaliseUnderstanding(v: unknown): SystemUnderstanding | null {
  if (!isRecord(v)) return null
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()) : []
  return {
    summary: text(v.summary),
    purpose: text(v.purpose),
    systemScope: text(v.systemScope),
    actors: list(v.actors),
    stakeholders: list(v.stakeholders),
    processes: list(v.processes),
    inputs: list(v.inputs),
    outputs: list(v.outputs),
    dataEntities: list(v.dataEntities),
    technologies: list(v.technologies),
    businessRules: list(v.businessRules),
    assumptions: list(v.assumptions),
    missingInformation: list(v.missingInformation),
  }
}

function isAnalysisMeta(v: unknown): v is AnalysisMeta {
  if (!isRecord(v) || !isString(v.provider) || !isIsoDate(v.generatedAt)) return false
  if (!('model' in v) || !(v.model === null || isString(v.model))) return false
  return (
    ['durationMs', 'attempts', 'promptChars', 'responseChars'].every((key) => typeof v[key] === 'number') &&
    typeof v.schemaVersion === 'number'
  )
}

export function isAnalysisRecord(v: unknown): v is AnalysisRecord {
  return (
    isRecord(v) &&
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.projectId) &&
    isOneOf(ANALYSIS_TASK_TYPES, v.type) &&
    isIsoDate(v.createdAt) &&
    isIsoDate(v.updatedAt) &&
    (v.sourceInformationUpdatedAt === null || isIsoDate(v.sourceInformationUpdatedAt)) &&
    isRecord(v.input) &&
    isAnalysisMeta(v.meta) &&
    isSystemUnderstanding(v.result)
  )
}

/**
 * Read path for stored analyses. The snapshot of the analyst's input is repaired
 * with the Phase 3 normaliser (forgiving by design); a record whose *result* is
 * unusable is dropped, because an analysis without a valid result is not analysis.
 */
export function normaliseAnalysisRecords(data: unknown): { value: AnalysisRecord[]; dropped: number } | null {
  if (!Array.isArray(data)) return null
  const value: AnalysisRecord[] = []
  let dropped = 0
  for (const item of data) {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.projectId)) {
      dropped += 1
      continue
    }
    if (!isIsoDate(item.createdAt) || !isIsoDate(item.updatedAt ?? item.createdAt)) {
      dropped += 1
      continue
    }
    const result = isSystemUnderstanding(item.result) ? item.result : null
    const meta = isAnalysisMeta(item.meta) ? item.meta : null
    if (!result || !meta) {
      dropped += 1
      continue
    }
    const { content } = normaliseContent(item.input)
    value.push({
      id: item.id,
      projectId: item.projectId,
      type: isOneOf(ANALYSIS_TASK_TYPES, item.type) ? item.type : 'system-understanding',
      createdAt: item.createdAt,
      updatedAt: isIsoDate(item.updatedAt) ? item.updatedAt : item.createdAt,
      sourceInformationUpdatedAt:
        typeof item.sourceInformationUpdatedAt === 'string' && item.sourceInformationUpdatedAt ? item.sourceInformationUpdatedAt : null,
      input: content,
      result,
      meta,
    })
  }
  return { value, dropped }
}

/** Legacy v1/v2 record (`inputSnapshot` + free-form `analysisResult`) → v3. */
export function upgradeAnalysisRecordToV3(item: unknown): unknown {
  if (!isRecord(item)) return item
  if ('result' in item && 'input' in item) return item
  const createdAt = isIsoDate(item.createdAt) ? item.createdAt : new Date().toISOString()
  const legacyResult = isRecord(item.analysisResult) ? item.analysisResult : {}
  return {
    ...item,
    type: 'system-understanding',
    createdAt,
    updatedAt: createdAt,
    sourceInformationUpdatedAt: null,
    input: isRecord(item.inputSnapshot) ? item.inputSnapshot : {},
    result: normaliseUnderstanding(legacyResult) ?? {
      summary: '',
      purpose: '',
      systemScope: '',
      actors: [],
      stakeholders: [],
      processes: [],
      inputs: [],
      outputs: [],
      dataEntities: [],
      technologies: [],
      businessRules: [],
      assumptions: [],
      missingInformation: [],
    },
    meta: isAnalysisMeta(item.meta)
      ? item.meta
      : {
          provider: 'unknown',
          model: null,
          generatedAt: createdAt,
          durationMs: 0,
          attempts: 1,
          promptChars: 0,
          responseChars: 0,
          schemaVersion: 3,
        },
  }
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
