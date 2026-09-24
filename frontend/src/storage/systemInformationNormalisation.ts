import { SI_LIMITS } from '@/types/systemInformation'
import type {
  BusinessRule,
  DataEntity,
  Stakeholder,
  SystemInformation,
  SystemInformationContent,
  SystemProblem,
  SystemUser,
  Technology,
} from '@/types/systemInformation'
import { isIsoDate, isNonEmptyString, isRecord, isString } from '@/utils/guards'
import { createId } from '@/utils/id'

/** Text is trimmed and capped; a non-string becomes empty rather than breaking the record. */
function text(value: unknown, max: number): string {
  return isString(value) ? value.trim().slice(0, max) : ''
}

function entryId(value: unknown, seen: Set<string>): string {
  return isNonEmptyString(value) && !seen.has(value) ? value : createId()
}

interface EntrySpec {
  fields: [field: string, max: number][]
}

/**
 * Keeps entries the analyst added — including rows still being typed — and
 * discards structural garbage, so one malformed entry can never take the whole
 * record (or the application) down.
 */
function entries<T extends { id: string }>(value: unknown, spec: EntrySpec): { items: T[]; dropped: number } {
  if (!Array.isArray(value)) return { items: [], dropped: 0 }
  const items: T[] = []
  const seen = new Set<string>()
  let dropped = 0
  for (const raw of value) {
    if (!isRecord(raw)) {
      dropped++
      continue
    }
    const item: Record<string, string> = { id: entryId(raw.id, seen) }
    seen.add(item.id)
    for (const [field, max] of spec.fields) item[field] = text(raw[field], max)
    items.push(item as unknown as T)
  }
  return { items, dropped }
}

function strings(value: unknown, max: number): { items: string[]; dropped: number } {
  if (!Array.isArray(value)) return { items: [], dropped: 0 }
  const items: string[] = []
  let dropped = 0
  for (const raw of value) {
    if (!isString(raw)) {
      dropped++
      continue
    }
    const trimmed = raw.trim().slice(0, max)
    if (trimmed) items.push(trimmed)
    else dropped++
  }
  return { items, dropped }
}

const STAKEHOLDER: EntrySpec = {
  fields: [
    ['name', SI_LIMITS.entryName],
    ['role', SI_LIMITS.entryRole],
    ['description', SI_LIMITS.entryDescription],
  ],
}
const USER: EntrySpec = {
  fields: [
    ['name', SI_LIMITS.entryName],
    ['role', SI_LIMITS.entryRole],
    ['responsibilities', SI_LIMITS.entryDescription],
  ],
}
const PROBLEM: EntrySpec = {
  fields: [
    ['title', SI_LIMITS.entryName],
    ['description', SI_LIMITS.entryDescription],
    ['impact', SI_LIMITS.entryImpact],
  ],
}
const TECHNOLOGY: EntrySpec = {
  fields: [
    ['name', SI_LIMITS.entryName],
    ['purpose', SI_LIMITS.entryDescription],
  ],
}
const DATA_ENTITY: EntrySpec = {
  fields: [
    ['name', SI_LIMITS.entryName],
    ['description', SI_LIMITS.entryDescription],
  ],
}
const BUSINESS_RULE: EntrySpec = {
  fields: [
    ['rule', SI_LIMITS.entryRule],
    ['description', SI_LIMITS.entryDescription],
  ],
}

/**
 * Normalises one editable record: the same rules apply whether the value comes
 * from storage or straight from the form, so a UI bug cannot persist junk.
 */
export function normaliseContent(input: unknown): { content: SystemInformationContent; dropped: number } {
  const raw = isRecord(input) ? input : {}
  const stakeholders = entries<Stakeholder>(raw.stakeholders, STAKEHOLDER)
  const users = entries<SystemUser>(raw.users, USER)
  const problems = entries<SystemProblem>(raw.problems, PROBLEM)
  const technologies = entries<Technology>(raw.technologies, TECHNOLOGY)
  const dataEntities = entries<DataEntity>(raw.dataEntities, DATA_ENTITY)
  const businessRules = entries<BusinessRule>(raw.businessRules, BUSINESS_RULE)
  const objectives = strings(raw.objectives, SI_LIMITS.objective)

  return {
    content: {
      systemName: text(raw.systemName, SI_LIMITS.systemName),
      systemType: text(raw.systemType, SI_LIMITS.systemType),
      systemPurpose: text(raw.systemPurpose, SI_LIMITS.systemPurpose),
      systemDescription: text(raw.systemDescription, SI_LIMITS.systemDescription),
      organization: text(raw.organization, SI_LIMITS.organization),
      stakeholders: stakeholders.items,
      users: users.items,
      currentWorkflow: text(raw.currentWorkflow, SI_LIMITS.workflow),
      processTrigger: text(raw.processTrigger, SI_LIMITS.processNote),
      processInput: text(raw.processInput, SI_LIMITS.processNote),
      processMainProcessing: text(raw.processMainProcessing, SI_LIMITS.processNote),
      processOutput: text(raw.processOutput, SI_LIMITS.processNote),
      processDecisionPoints: text(raw.processDecisionPoints, SI_LIMITS.processNote),
      problems: problems.items,
      technologies: technologies.items,
      dataEntities: dataEntities.items,
      businessRules: businessRules.items,
      objectives: objectives.items,
      constraints: text(raw.constraints, SI_LIMITS.constraints),
      additionalNotes: text(raw.additionalNotes, SI_LIMITS.additionalNotes),
    },
    dropped:
      stakeholders.dropped +
      users.dropped +
      problems.dropped +
      technologies.dropped +
      dataEntities.dropped +
      businessRules.dropped +
      objectives.dropped,
  }
}

/**
 * Normalises the whole `synex_system_information` collection.
 * Returns `null` (→ quarantine) only when the payload is not a list at all.
 */
export function normaliseSystemInformation(data: unknown): { value: SystemInformation[]; dropped: number } | null {
  if (!Array.isArray(data)) return null
  const value: SystemInformation[] = []
  let dropped = 0

  for (const raw of data) {
    if (!isRecord(raw) || !isNonEmptyString(raw.projectId)) {
      dropped++
      continue
    }
    const { content, dropped: entryDrops } = normaliseContent(raw)
    dropped += entryDrops

    const now = new Date().toISOString()
    value.push({
      id: isNonEmptyString(raw.id) ? raw.id : createId(),
      projectId: raw.projectId,
      ...content,
      createdAt: isIsoDate(raw.createdAt) ? raw.createdAt : now,
      updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : now,
    })
  }

  return { value, dropped }
}

/** Every field the editable content owns; ids, project link and timestamps stay with storage. */
export const SI_CONTENT_FIELDS = [
  'systemName',
  'systemType',
  'systemPurpose',
  'systemDescription',
  'organization',
  'stakeholders',
  'users',
  'currentWorkflow',
  'processTrigger',
  'processInput',
  'processMainProcessing',
  'processOutput',
  'processDecisionPoints',
  'problems',
  'technologies',
  'dataEntities',
  'businessRules',
  'objectives',
  'constraints',
  'additionalNotes',
] as const satisfies readonly (keyof SystemInformationContent)[]

/** Drops the fields storage owns (id, project link, timestamps) so the form can compare content. */
export function contentOf(record: SystemInformation): SystemInformationContent {
  const picked: Record<string, unknown> = {}
  for (const field of SI_CONTENT_FIELDS) picked[field] = (record as unknown as Record<string, unknown>)[field]
  return picked as unknown as SystemInformationContent
}
