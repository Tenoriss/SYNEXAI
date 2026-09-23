import { createDefaultDriver, type KeyValueDriver } from './driver'
import type { StorageIssue } from './collection'
import { CORRUPT_BACKUP_PREFIX, STORAGE_KEYS, STORAGE_PREFIX } from './keys'
import { LocalStorageProjectRepository } from './repositories/localStorageProjectRepository'
import { LocalStorageAnalysisRepository } from './repositories/localStorageAnalysisRepository'
import { LocalStorageSettingsRepository } from './repositories/localStorageSettingsRepository'
import type { AnalysisRepository, ProjectRepository, SettingsRepository } from './repositories/types'
import type { NewProjectInput, Project, ProjectUpdate } from '@/types/project'
import type { AnalysisVersion, NewAnalysisVersion } from '@/types/analysis'
import type { AppSettings } from '@/types/settings'

export type StorageChange = 'projects' | 'analyses' | 'settings' | 'all'
type Listener = (change: StorageChange) => void

export interface StorageStats {
  persistent: boolean
  projects: number
  analysisVersions: number
  /** Approximate bytes used by `synex_*` keys (UTF-16 → 2 bytes/char). */
  approxBytes: number
  corruptBackups: number
}

/**
 * Single entry point for persistence used by the UI.
 *
 * It composes repositories behind interfaces, so swapping LocalStorage for a
 * PostgreSQL-backed API later only requires new repository implementations.
 * It also coordinates cross-entity rules (e.g. deleting a project deletes its
 * analysis history) and notifies subscribers when data changes.
 */
export class StorageService {
  readonly projects: ProjectRepository
  readonly analyses: AnalysisRepository
  readonly settings: SettingsRepository & { getSync?: () => AppSettings }

  private readonly driver: KeyValueDriver
  private readonly listeners = new Set<Listener>()
  private readonly issues: StorageIssue[] = []

  constructor(driver: KeyValueDriver = createDefaultDriver()) {
    this.driver = driver
    const report = (issue: StorageIssue) => {
      this.issues.push(issue)
      console.warn(`[SYNEX storage] ${issue.key}: ${issue.message}`)
    }
    this.projects = new LocalStorageProjectRepository(driver, report)
    this.analyses = new LocalStorageAnalysisRepository(driver, report)
    this.settings = new LocalStorageSettingsRepository(driver, report)

    // Keep multiple open tabs in sync.
    if (typeof window !== 'undefined' && driver.persistent) {
      window.addEventListener('storage', (e) => {
        if (e.key === null || e.key.startsWith(STORAGE_PREFIX)) this.emit(keyToChange(e.key))
      })
    }
  }

  // ---- Projects ----------------------------------------------------------

  getProjects(): Promise<Project[]> {
    return this.projects.list()
  }

  getProject(id: string): Promise<Project | null> {
    return this.projects.get(id)
  }

  async createProject(input: NewProjectInput): Promise<Project> {
    const project = await this.projects.create(input)
    this.emit('projects')
    return project
  }

  async updateProject(id: string, patch: ProjectUpdate): Promise<Project> {
    const project = await this.projects.update(id, patch)
    this.emit('projects')
    return project
  }

  /** Deletes the project and all of its analysis versions. */
  async deleteProject(id: string): Promise<void> {
    await this.projects.delete(id)
    await this.analyses.deleteByProject(id)
    this.emit('all')
  }

  // ---- Analyses ----------------------------------------------------------

  async saveAnalysis(input: NewAnalysisVersion): Promise<AnalysisVersion> {
    const project = await this.projects.get(input.projectId)
    if (!project) throw new Error('Cannot save an analysis for a project that does not exist.')
    const version = await this.analyses.create(input)
    this.emit('analyses')
    return version
  }

  getAnalysis(id: string): Promise<AnalysisVersion | null> {
    return this.analyses.get(id)
  }

  getAnalysisHistory(projectId: string): Promise<AnalysisVersion[]> {
    return this.analyses.listByProject(projectId)
  }

  async getLatestAnalysis(projectId: string): Promise<AnalysisVersion | null> {
    return (await this.analyses.listByProject(projectId))[0] ?? null
  }

  async deleteAnalysis(id: string): Promise<void> {
    await this.analyses.delete(id)
    this.emit('analyses')
  }

  // ---- Settings ----------------------------------------------------------

  getSettings(): Promise<AppSettings> {
    return this.settings.get()
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = await this.settings.update(patch)
    this.emit('settings')
    return next
  }

  // ---- Maintenance -------------------------------------------------------

  getIssues(): readonly StorageIssue[] {
    return this.issues
  }

  async getStats(): Promise<StorageStats> {
    const keys = this.driver.keys().filter((k) => k.startsWith(STORAGE_PREFIX))
    const approxBytes = keys.reduce((sum, k) => sum + (k.length + (this.driver.getItem(k)?.length ?? 0)) * 2, 0)
    return {
      persistent: this.driver.persistent,
      projects: (await this.projects.list()).length,
      analysisVersions: await this.analyses.countAll(),
      approxBytes,
      corruptBackups: keys.filter((k) => k.startsWith(CORRUPT_BACKUP_PREFIX)).length,
    }
  }

  /** Removes every `synex_*` key. Other sites' / apps' data is untouched. */
  resetAll(): void {
    for (const key of this.driver.keys()) {
      if (key.startsWith(STORAGE_PREFIX)) this.driver.removeItem(key)
    }
    this.issues.length = 0
    this.emit('all')
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(change: StorageChange) {
    for (const l of this.listeners) l(change)
  }
}

function keyToChange(key: string | null): StorageChange {
  switch (key) {
    case STORAGE_KEYS.projects:
      return 'projects'
    case STORAGE_KEYS.analysisVersions:
      return 'analyses'
    case STORAGE_KEYS.settings:
      return 'settings'
    default:
      return 'all'
  }
}

/** App-wide singleton. Tests construct their own instance with a MemoryDriver. */
export const storageService = new StorageService()
