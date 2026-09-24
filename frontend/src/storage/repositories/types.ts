import type { NewProjectInput, Project, ProjectStatus, ProjectUpdate } from '@/types/project'
import type { AnalysisRecord, NewAnalysisRecord } from '@/types/analysis'
import type { AppSettings } from '@/types/settings'
import type {
  SystemInformation,
  SystemInformationContent,
  SystemInformationPatch,
} from '@/types/systemInformation'

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

/**
 * System information is one record per project (Phase 3). `save` upserts the
 * whole editable content; `update` merges a partial patch. Deleting is
 * idempotent because the workspace auto-saves and may never have written at all.
 */
export interface SystemInformationRepository {
  list(): Promise<SystemInformation[]>
  get(projectId: string): Promise<SystemInformation | null>
  save(projectId: string, content: SystemInformationContent): Promise<SystemInformation>
  update(projectId: string, patch: SystemInformationPatch): Promise<SystemInformation>
  delete(projectId: string): Promise<boolean>
  deleteByProject(projectId: string): Promise<number>
  countAll(): Promise<number>
}

export interface AnalysisRepository {
  /** Results for one project, newest first. */
  listByProject(projectId: string): Promise<AnalysisRecord[]>
  getLatest(projectId: string): Promise<AnalysisRecord | null>
  get(id: string): Promise<AnalysisRecord | null>
  /** Always appends a new immutable record; history is never overwritten. */
  create(input: NewAnalysisRecord): Promise<AnalysisRecord>
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
