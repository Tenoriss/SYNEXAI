import {
  OTHER_SYSTEM_TYPE,
  PROJECT_LIMITS,
  SYSTEM_TYPE_CATEGORIES,
  type NewProjectInput,
  type Project,
  type ProjectDraft,
  type ProjectDraftErrors,
  type ProjectUpdate,
} from '@/types/project'

/** Categories are selectable values only — the app never creates a project from them. */
export const SYSTEM_TYPE_OPTIONS: readonly string[] = [...SYSTEM_TYPE_CATEGORIES, OTHER_SYSTEM_TYPE]

export function isKnownSystemType(value: string): boolean {
  return (SYSTEM_TYPE_CATEGORIES as readonly string[]).includes(value)
}

export function emptyDraft(): ProjectDraft {
  return {
    name: '',
    description: '',
    systemType: '',
    otherSystemType: '',
    organization: '',
    analyst: '',
    status: 'Draft',
  }
}

export function projectToDraft(project: Project): ProjectDraft {
  const custom = project.systemType.length > 0 && !isKnownSystemType(project.systemType)
  return {
    name: project.name,
    description: project.description,
    systemType: custom ? OTHER_SYSTEM_TYPE : project.systemType,
    otherSystemType: custom ? project.systemType : '',
    organization: project.organization,
    analyst: project.analyst,
    status: project.status,
  }
}

/** The value that gets stored for `systemType` ("Other" resolves to the typed text). */
export function resolveSystemType(draft: ProjectDraft): string {
  return draft.systemType === OTHER_SYSTEM_TYPE ? draft.otherSystemType.trim() : draft.systemType.trim()
}

/**
 * Inline validation (spec §10). Runs before anything is written to storage;
 * the repository repeats the checks so bad data cannot arrive by another path.
 */
export function validateProjectDraft(draft: ProjectDraft): ProjectDraftErrors {
  const errors: ProjectDraftErrors = {}

  const name = draft.name.trim()
  if (!name) errors.name = 'Project name is required.'
  else if (name.length > PROJECT_LIMITS.name) errors.name = `Use ${PROJECT_LIMITS.name} characters or fewer.`

  const description = draft.description.trim()
  if (!description) errors.description = 'Description is required.'
  else if (description.length > PROJECT_LIMITS.description)
    errors.description = `Use ${PROJECT_LIMITS.description} characters or fewer.`

  const systemType = resolveSystemType(draft)
  if (!draft.systemType.trim()) errors.systemType = 'System type is required.'
  else if (draft.systemType === OTHER_SYSTEM_TYPE && !systemType)
    errors.systemType = 'Enter the system type.'
  else if (systemType.length > PROJECT_LIMITS.systemType)
    errors.systemType = `Use ${PROJECT_LIMITS.systemType} characters or fewer.`

  if (draft.organization.trim().length > PROJECT_LIMITS.organization)
    errors.organization = `Use ${PROJECT_LIMITS.organization} characters or fewer.`
  if (draft.analyst.trim().length > PROJECT_LIMITS.analyst)
    errors.analyst = `Use ${PROJECT_LIMITS.analyst} characters or fewer.`

  return errors
}

export function hasErrors(errors: ProjectDraftErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function draftToInput(draft: ProjectDraft): NewProjectInput {
  return {
    name: draft.name,
    description: draft.description,
    systemType: resolveSystemType(draft),
    organization: draft.organization,
    analyst: draft.analyst,
    status: draft.status,
  }
}

export function draftToPatch(draft: ProjectDraft): ProjectUpdate {
  return draftToInput(draft)
}
