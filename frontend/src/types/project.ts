/** Project statuses (spec §2, §20). The order is also the order used by filters. */
export const PROJECT_STATUSES = ['Draft', 'Analyzing', 'Completed', 'Needs Review', 'Archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/** Selectable categories (spec §8). They are categories only — never seeded projects. */
export const SYSTEM_TYPE_CATEGORIES = [
  'Academic',
  'Inventory',
  'E-Commerce',
  'Healthcare',
  'Banking',
  'Government',
  'Library',
  'HR',
  'Logistics',
  'Manufacturing',
  'Retail',
] as const

export const OTHER_SYSTEM_TYPE = 'Other'

export const PROJECT_LIMITS = {
  name: 120,
  systemType: 120,
  organization: 160,
  analyst: 120,
  description: 2000,
} as const

/**
 * A system analysis project (spec §2). All data originates from the user;
 * nothing here is ever seeded or invented by the application.
 */
export interface Project {
  id: string
  name: string
  description: string
  /** Free-text system category, e.g. "Inventory" or a custom value. */
  systemType: string
  organization: string
  analyst: string
  status: ProjectStatus
  /** ISO-8601 timestamps */
  createdAt: string
  updatedAt: string
}

/** Fields the user supplies when creating a project. */
export interface NewProjectInput {
  name: string
  description: string
  systemType: string
  organization?: string
  analyst?: string
  status?: ProjectStatus
}

export type ProjectUpdate = Partial<
  Pick<Project, 'name' | 'description' | 'systemType' | 'organization' | 'analyst' | 'status'>
>

/**
 * Shape of the form used for both creating and editing (spec §9, §11).
 * `systemType` holds a category from `SYSTEM_TYPE_CATEGORIES` or
 * `OTHER_SYSTEM_TYPE`, in which case `otherSystemType` becomes the stored value.
 */
export interface ProjectDraft {
  name: string
  description: string
  systemType: string
  otherSystemType: string
  organization: string
  analyst: string
  status: ProjectStatus
}

export type ProjectDraftErrors = Partial<Record<keyof ProjectDraft, string>>
