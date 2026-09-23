import type { KeyValueDriver } from '../driver'
import { StoredValue, parseArray, type IssueReporter, type Migration } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { isProject } from '../validators'
import { NotFoundError, ValidationError, type ProjectRepository } from './types'
import { PROJECT_LIMITS, PROJECT_STATUSES, type NewProjectInput, type Project, type ProjectStatus, type ProjectUpdate } from '@/types/project'
import { createId } from '@/utils/id'
import { isOneOf, isRecord, isString } from '@/utils/guards'

function clean(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max)
}

function required(value: string | undefined, max: number, label: string): string {
  const v = clean(value, max)
  if (!v) throw new ValidationError(`${label} is required.`)
  return v
}

/**
 * v1 → v2: a project stored `domain`; Phase 2 models it as `systemType` and
 * adds `organization` / `analyst`. Unknown fields are ignored, and anything
 * that is not a list of objects is left for the validator to reject.
 */
export const PROJECT_MIGRATIONS: Record<number, Migration> = {
  1: (data) => {
    if (!Array.isArray(data)) return data
    return data.map((item) => {
      if (!isRecord(item)) return item
      const next: Record<string, unknown> = { ...item }
      const legacyDomain = isString(item.domain) ? item.domain : ''
      delete next.domain
      if (!isString(next.systemType) || !next.systemType) next.systemType = legacyDomain
      if (!isString(next.organization)) next.organization = ''
      if (!isString(next.analyst)) next.analyst = ''
      return next
    })
  },
}

export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly store: StoredValue<Project[]>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    this.store = new StoredValue<Project[]>({
      driver,
      key: STORAGE_KEYS.projects,
      fallback: () => [],
      parse: (data) => parseArray(data, isProject),
      migrations: PROJECT_MIGRATIONS,
      onIssue,
    })
  }

  async list() {
    return this.store.read()
  }

  async get(id: string) {
    return this.store.read().find((p) => p.id === id) ?? null
  }

  async create(input: NewProjectInput) {
    if (input.status !== undefined && !isOneOf(PROJECT_STATUSES, input.status)) {
      throw new ValidationError('Invalid project status.')
    }
    const now = new Date().toISOString()
    const project: Project = {
      id: createId(),
      name: required(input.name, PROJECT_LIMITS.name, 'Project name'),
      description: required(input.description, PROJECT_LIMITS.description, 'Description'),
      systemType: required(input.systemType, PROJECT_LIMITS.systemType, 'System type'),
      organization: clean(input.organization, PROJECT_LIMITS.organization),
      analyst: clean(input.analyst, PROJECT_LIMITS.analyst),
      status: input.status ?? 'Draft',
      createdAt: now,
      updatedAt: now,
    }
    this.store.write([...this.store.read(), project])
    return project
  }

  async update(id: string, patch: ProjectUpdate) {
    const projects = this.store.read()
    const index = projects.findIndex((p) => p.id === id)
    if (index === -1) throw new NotFoundError('Project', id)

    const next: Project = { ...projects[index] }
    if (patch.name !== undefined) next.name = required(patch.name, PROJECT_LIMITS.name, 'Project name')
    if (patch.description !== undefined)
      next.description = required(patch.description, PROJECT_LIMITS.description, 'Description')
    if (patch.systemType !== undefined)
      next.systemType = required(patch.systemType, PROJECT_LIMITS.systemType, 'System type')
    if (patch.organization !== undefined) next.organization = clean(patch.organization, PROJECT_LIMITS.organization)
    if (patch.analyst !== undefined) next.analyst = clean(patch.analyst, PROJECT_LIMITS.analyst)
    if (patch.status !== undefined) {
      if (!isOneOf(PROJECT_STATUSES, patch.status)) throw new ValidationError('Invalid project status.')
      next.status = patch.status
    }
    // createdAt is never touched; updatedAt records the change (spec §11).
    next.updatedAt = new Date().toISOString()

    const updated = [...projects]
    updated[index] = next
    this.store.write(updated)
    return next
  }

  async setStatus(id: string, status: ProjectStatus) {
    if (!isOneOf(PROJECT_STATUSES, status)) throw new ValidationError('Invalid project status.')
    return this.update(id, { status })
  }

  /** Archiving is a status change, never a deletion (spec §13). */
  async archive(id: string) {
    const project = await this.get(id)
    if (!project) throw new NotFoundError('Project', id)
    if (project.status === 'Archived') return project
    return this.update(id, { status: 'Archived' })
  }

  async restore(id: string) {
    const project = await this.get(id)
    if (!project) throw new NotFoundError('Project', id)
    if (project.status !== 'Archived') return project
    return this.update(id, { status: 'Draft' })
  }

  /** Copies the descriptive fields into a new Draft project (analysis history is not copied). */
  async duplicate(id: string) {
    const source = await this.get(id)
    if (!source) throw new NotFoundError('Project', id)
    return this.create({
      name: `${source.name} (copy)`.slice(0, PROJECT_LIMITS.name),
      description: source.description,
      systemType: source.systemType,
      organization: source.organization,
      analyst: source.analyst,
    })
  }

  async delete(id: string) {
    const projects = this.store.read()
    const remaining = projects.filter((p) => p.id !== id)
    if (remaining.length === projects.length) throw new NotFoundError('Project', id)
    this.store.write(remaining)
  }
}
