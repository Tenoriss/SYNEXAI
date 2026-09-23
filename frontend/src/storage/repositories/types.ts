import type { NewProjectInput, Project, ProjectStatus, ProjectUpdate } from '@/types/project'
import type { AnalysisVersion, NewAnalysisVersion } from '@/types/analysis'
import type { AppSettings } from '@/types/settings'

/*
 * Repository contracts. Business logic depends ONLY on these interfaces.
 *
 * They are async on purpose: the current implementation is synchronous
 * LocalStorage, but a future `PostgresProjectRepository` (via the FastAPI
 * backend) can implement the same contract without touching callers.
 */

export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  create(input: NewProjectInput): Promise<Project>
  update(id: string, patch: ProjectUpdate): Promise<Project>
  setStatus(id: string, status: ProjectStatus): Promise<Project>
  /** Sets status to `Archived`; the project and its data stay stored. */
  archive(id: string): Promise<Project>
  /** Returns an archived project to `Draft`. */
  restore(id: string): Promise<Project>
  duplicate(id: string): Promise<Project>
  delete(id: string): Promise<void>
}

export interface AnalysisRepository {
  /** Versions for a project, newest first. */
  listByProject(projectId: string): Promise<AnalysisVersion[]>
  get(id: string): Promise<AnalysisVersion | null>
  /** Always appends a new immutable version; history is never overwritten. */
  create(input: NewAnalysisVersion): Promise<AnalysisVersion>
  delete(id: string): Promise<void>
  deleteByProject(projectId: string): Promise<number>
  countAll(): Promise<number>
}

export interface SettingsRepository {
  get(): Promise<AppSettings>
  update(patch: Partial<AppSettings>): Promise<AppSettings>
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found.`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
