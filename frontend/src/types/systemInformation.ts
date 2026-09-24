/**
 * Structured information the analyst provides about the system under analysis
 * (Phase 3). Everything in here is user input: SYNEX AI never fills a field,
 * never invents a stakeholder, process, technology, business rule or constraint.
 *
 * The shape is deliberately plain JSON (ids + strings + arrays) so the same
 * record can later be posted to the backend as an analysis input (Phase 4/5).
 */

export const NOT_PROVIDED = 'Not provided'

export const SI_LIMITS = {
  systemName: 120,
  systemType: 120,
  systemPurpose: 1000,
  systemDescription: 4000,
  organization: 160,
  entryName: 160,
  entryRole: 160,
  entryDescription: 2000,
  entryImpact: 1000,
  entryRule: 500,
  workflow: 6000,
  processNote: 2000,
  objective: 500,
  constraints: 4000,
  additionalNotes: 4000,
} as const

export interface Identifiable {
  id: string
}

export interface Stakeholder extends Identifiable {
  name: string
  role: string
  description: string
}

export interface SystemUser extends Identifiable {
  name: string
  role: string
  responsibilities: string
}

export interface SystemProblem extends Identifiable {
  title: string
  description: string
  impact: string
}

export interface Technology extends Identifiable {
  name: string
  purpose: string
}

export interface DataEntity extends Identifiable {
  name: string
  description: string
}

export interface BusinessRule extends Identifiable {
  rule: string
  description: string
}

/** The nine sections of the analysis input (spec §8). */
export const SI_SECTION_IDS = [
  'overview',
  'people',
  'process',
  'problems',
  'technology',
  'data',
  'rules',
  'objectives',
  'notes',
] as const
export type SiSectionId = (typeof SI_SECTION_IDS)[number]

export interface SystemInformation extends Identifiable {
  projectId: string

  // 1 · System Overview
  systemName: string
  systemType: string
  systemPurpose: string
  systemDescription: string
  organization: string

  // 2 · Stakeholders & Users
  stakeholders: Stakeholder[]
  users: SystemUser[]

  // 3 · Current Process
  currentWorkflow: string
  processTrigger: string
  processInput: string
  processMainProcessing: string
  processOutput: string
  processDecisionPoints: string

  // 4 · Problems & Pain Points
  problems: SystemProblem[]

  // 5 · Technology
  technologies: Technology[]

  // 6 · Data
  dataEntities: DataEntity[]

  // 7 · Business Rules
  businessRules: BusinessRule[]

  // 8 · Objectives & Constraints
  objectives: string[]
  constraints: string

  // 9 · Additional Notes
  additionalNotes: string

  /** ISO-8601 timestamps */
  createdAt: string
  updatedAt: string
}

/** Only the editable content — ids, project link and timestamps are owned by storage. */
export type SystemInformationContent = Omit<SystemInformation, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>

export type SystemInformationPatch = Partial<SystemInformationContent>

export type SystemInformationErrors = Partial<Record<keyof SystemInformationContent, string>>

/** Keys whose value is plain text — everything the form edits with an input or textarea. */
export type SiTextFieldKey = {
  [K in keyof SystemInformationContent]: SystemInformationContent[K] extends string ? K : never
}[keyof SystemInformationContent]

/** Keys whose value is a list of identified entries — the dynamic sections. */
export type SiEntryKey = {
  [K in keyof SystemInformationContent]: SystemInformationContent[K] extends readonly Identifiable[] ? K : never
}[keyof SystemInformationContent]

/** Derived, never stored: how much of the input a project actually has. */
export type SystemInformationStatus = 'not-started' | 'in-progress' | 'complete'

export interface SystemInformationSummary {
  status: SystemInformationStatus
  sectionsProvided: number
  sectionCount: number
  updatedAt: string | null
}
