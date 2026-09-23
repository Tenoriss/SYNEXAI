import type { KeyValueDriver } from '../driver'
import { StoredValue, parseArray, type IssueReporter } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { isProject } from '../validators'
import { NotFoundError, ValidationError, type ProjectRepository } from './types'
import { PROJECT_STATUSES, type NewProjectInput, type Project, type ProjectUpdate } from '@/types/project'
import { createId } from '@/utils/id'
import { isOneOf } from '@/utils/guards'

export const PROJECT_LIMITS = { name: 120, domain: 120, description: 2000 } as const

function clean(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max)
}

export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly store: StoredValue<Project[]>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    this.store = new StoredValue<Project[]>({
      driver,
      key: STORAGE_KEYS.projects,
      fallback: () => [],
      parse: (data) => parseArray(data, isProject),
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
    const name = clean(input.name, PROJECT_LIMITS.name)
    if (!name) throw new ValidationError('Project name is required.')
    if (input.status !== undefined && !isOneOf(PROJECT_STATUSES, input.status)) {
      throw new ValidationError('Invalid project status.')
    }

    const now = new Date().toISOString()
    const project: Project = {
      id: createId(),
      name,
      description: clean(input.description, PROJECT_LIMITS.description),
      domain: clean(input.domain, PROJECT_LIMITS.domain),
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

    const current = projects[index]
    const next: Project = { ...current }

    if (patch.name !== undefined) {
      const name = clean(patch.name, PROJECT_LIMITS.name)
      if (!name) throw new ValidationError('Project name is required.')
      next.name = name
    }
    if (patch.description !== undefined) next.description = clean(patch.description, PROJECT_LIMITS.description)
    if (patch.domain !== undefined) next.domain = clean(patch.domain, PROJECT_LIMITS.domain)
    if (patch.status !== undefined) {
      if (!isOneOf(PROJECT_STATUSES, patch.status)) throw new ValidationError('Invalid project status.')
      next.status = patch.status
    }
    next.updatedAt = new Date().toISOString()

    const updated = [...projects]
    updated[index] = next
    this.store.write(updated)
    return next
  }

  async delete(id: string) {
    const projects = this.store.read()
    const remaining = projects.filter((p) => p.id !== id)
    if (remaining.length === projects.length) throw new NotFoundError('Project', id)
    this.store.write(remaining)
  }
}
