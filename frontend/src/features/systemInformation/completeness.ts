import type {
  SystemInformation,
  SystemInformationContent,
  SystemInformationStatus,
  SystemInformationSummary,
  SiSectionId,
} from '@/types/systemInformation'
import { SI_SECTION_COUNT, SI_SECTIONS } from './sections'

/**
 * Completeness of the analyst's input (spec §23). This is *not* analysis
 * progress — it only reports whether meaningful information exists.
 */

/** Short fields count once they hold something other than noise. */
export const filled = (value: string | undefined): boolean => (value?.trim().length ?? 0) >= 2

/** Long-form text counts once it is at least a phrase, not "." or "abc". */
export const detailed = (value: string | undefined): boolean => (value?.trim().length ?? 0) >= 12

const anyEntry = <T,>(entries: readonly T[], pick: (entry: T) => string): boolean =>
  entries.some((entry) => filled(pick(entry)))

const countEntries = <T,>(entries: readonly T[], pick: (entry: T) => string): number =>
  entries.filter((entry) => filled(pick(entry))).length

const plural = (n: number): string => (n === 1 ? '' : 's')

/** One rule per section, so "completed" never means anything other than real input. */
export function isSectionComplete(content: SystemInformationContent, id: SiSectionId): boolean {
  switch (id) {
    case 'overview':
      return filled(content.systemName) && filled(content.systemType) && detailed(content.systemPurpose)
    case 'people':
      return anyEntry(content.stakeholders, (s) => s.name) || anyEntry(content.users, (u) => u.name)
    case 'process':
      return detailed(content.currentWorkflow)
    case 'problems':
      return anyEntry(content.problems, (p) => p.title)
    case 'technology':
      return anyEntry(content.technologies, (t) => t.name)
    case 'data':
      return anyEntry(content.dataEntities, (d) => d.name)
    case 'rules':
      return anyEntry(content.businessRules, (r) => r.rule)
    case 'objectives':
      return content.objectives.some(filled) || detailed(content.constraints)
    case 'notes':
      return detailed(content.additionalNotes)
  }
}

export function completedSections(content: SystemInformationContent): SiSectionId[] {
  return SI_SECTIONS.filter((section) => isSectionComplete(content, section.id)).map((section) => section.id)
}

/** True when the analyst has typed nothing at all — a project then stays "Not started". */
export function isContentEmpty(content: SystemInformationContent): boolean {
  const prose = [
    content.systemName,
    content.systemType,
    content.systemPurpose,
    content.systemDescription,
    content.organization,
    content.currentWorkflow,
    content.processTrigger,
    content.processInput,
    content.processMainProcessing,
    content.processOutput,
    content.processDecisionPoints,
    content.constraints,
    content.additionalNotes,
  ]
    .join('')
    .trim()
  const entries =
    content.stakeholders.length +
    content.users.length +
    content.problems.length +
    content.technologies.length +
    content.dataEntities.length +
    content.businessRules.length +
    content.objectives.length
  return prose.length === 0 && entries === 0
}

/** Status is derived from real content — stored or still being typed (spec §24). */
export function summariseContent(
  content: SystemInformationContent | null,
  updatedAt: string | null,
): SystemInformationSummary {
  if (!content || isContentEmpty(content)) {
    return { status: 'not-started', sectionsProvided: 0, sectionCount: SI_SECTION_COUNT, updatedAt: null }
  }
  const sectionsProvided = completedSections(content).length
  const status: SystemInformationStatus = sectionsProvided === SI_SECTION_COUNT ? 'complete' : 'in-progress'
  return { status, sectionsProvided, sectionCount: SI_SECTION_COUNT, updatedAt }
}

export function summarise(record: SystemInformation | null): SystemInformationSummary {
  return summariseContent(record, record?.updatedAt ?? null)
}

export const SI_STATUS_LABEL: Record<SystemInformationStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
}

/** One-line summary per section, built from the actual entries — used in the section nav. */
export function sectionDetail(content: SystemInformationContent, id: SiSectionId): string {
  switch (id) {
    case 'overview': {
      const missing = [
        !filled(content.systemName) && 'name',
        !filled(content.systemType) && 'type',
        !detailed(content.systemPurpose) && 'purpose',
      ].filter(Boolean)
      return missing.length ? `Still needed: ${missing.join(', ')}` : 'Required input present'
    }
    case 'people': {
      const stakeholders = countEntries(content.stakeholders, (s) => s.name)
      const users = countEntries(content.users, (u) => u.name)
      return `${stakeholders} stakeholder${plural(stakeholders)}, ${users} user${plural(users)}`
    }
    case 'process':
      return detailed(content.currentWorkflow) ? 'Workflow described' : 'No workflow described'
    case 'problems': {
      const n = countEntries(content.problems, (p) => p.title)
      return `${n} problem${plural(n)} recorded`
    }
    case 'technology': {
      const n = countEntries(content.technologies, (t) => t.name)
      return `${n} technolog${n === 1 ? 'y' : 'ies'} recorded`
    }
    case 'data': {
      const n = countEntries(content.dataEntities, (d) => d.name)
      return `${n} entit${n === 1 ? 'y' : 'ies'} named`
    }
    case 'rules': {
      const n = countEntries(content.businessRules, (r) => r.rule)
      return `${n} rule${plural(n)} recorded`
    }
    case 'objectives': {
      const n = content.objectives.filter(filled).length
      return `${n} objective${plural(n)}${content.constraints.trim() ? ', constraints noted' : ', no constraints noted'}`
    }
    case 'notes':
      return detailed(content.additionalNotes) ? 'Notes recorded' : 'No notes yet'
  }
}
