import { beforeEach, describe, expect, it } from 'vitest'
import { StorageService } from './StorageService'
import { MemoryDriver } from './driver'
import { STORAGE_KEYS } from './keys'
import { SCHEMA_VERSION } from './collection'
import { NotFoundError, ValidationError } from './repositories/types'
import type { SystemInput } from '@/types/analysis'

const emptyInput = (overrides: Partial<SystemInput> = {}): SystemInput => ({
  systemName: 'Test System',
  domain: '',
  systemType: '',
  description: '',
  stakeholders: '',
  actors: '',
  users: '',
  currentProcess: '',
  existingProblems: '',
  currentTechnology: '',
  importantData: '',
  additionalContext: '',
  ...overrides,
})

let driver: MemoryDriver
let storage: StorageService

beforeEach(() => {
  driver = new MemoryDriver()
  storage = new StorageService(driver)
})

describe('projects', () => {
  it('starts empty — no dummy data', async () => {
    expect(await storage.getProjects()).toEqual([])
  })

  it('creates, reads, updates and deletes a project', async () => {
    const p = await storage.createProject({ name: '  Library System ', domain: 'Education' })
    expect(p.name).toBe('Library System')
    expect(p.status).toBe('Draft')
    expect(p.createdAt).toBe(p.updatedAt)

    expect(await storage.getProject(p.id)).toEqual(p)

    await new Promise((r) => setTimeout(r, 2))
    const u = await storage.updateProject(p.id, { status: 'Analyzing', description: 'desc' })
    expect(u.status).toBe('Analyzing')
    expect(u.description).toBe('desc')
    expect(u.updatedAt > p.updatedAt).toBe(true)
    expect(u.createdAt).toBe(p.createdAt)

    await storage.deleteProject(p.id)
    expect(await storage.getProject(p.id)).toBeNull()
  })

  it('persists across service instances (reload)', async () => {
    const p = await storage.createProject({ name: 'Inventory' })
    const reloaded = new StorageService(driver)
    expect(await reloaded.getProject(p.id)).toEqual(p)
  })

  it('stores data in a versioned envelope under a synex_ key', async () => {
    await storage.createProject({ name: 'X' })
    const raw = JSON.parse(driver.getItem(STORAGE_KEYS.projects)!)
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
    expect(Array.isArray(raw.data)).toBe(true)
    expect(STORAGE_KEYS.projects.startsWith('synex_')).toBe(true)
  })

  it('validates input', async () => {
    await expect(storage.createProject({ name: '   ' })).rejects.toBeInstanceOf(ValidationError)
    const p = await storage.createProject({ name: 'Ok' })
    await expect(storage.updateProject(p.id, { name: '' })).rejects.toBeInstanceOf(ValidationError)
    // @ts-expect-error invalid status on purpose
    await expect(storage.updateProject(p.id, { status: 'Done' })).rejects.toBeInstanceOf(ValidationError)
    await expect(storage.updateProject('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(storage.deleteProject('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('notifies subscribers on change', async () => {
    const changes: string[] = []
    const off = storage.subscribe((c) => changes.push(c))
    const p = await storage.createProject({ name: 'A' })
    await storage.updateProject(p.id, { name: 'B' })
    off()
    await storage.deleteProject(p.id)
    expect(changes).toEqual(['projects', 'projects'])
  })
})

describe('analysis history', () => {
  it('appends versions without overwriting and lists newest first', async () => {
    const p = await storage.createProject({ name: 'Hospital' })
    const v1 = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: { n: 1 } })
    await new Promise((r) => setTimeout(r, 2))
    const v2 = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: { n: 2 } })

    const history = await storage.getAnalysisHistory(p.id)
    expect(history.map((v) => v.id)).toEqual([v2.id, v1.id])
    expect((await storage.getLatestAnalysis(p.id))?.id).toBe(v2.id)
    expect(await storage.getAnalysis(v1.id)).toEqual(v1)
  })

  it('snapshots input so later mutation does not change history', async () => {
    const p = await storage.createProject({ name: 'Bank' })
    const input = emptyInput({ description: 'original' })
    const v = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: input, analysisResult: {} })
    input.description = 'mutated'
    expect((await storage.getAnalysis(v.id))?.inputSnapshot.description).toBe('original')
  })

  it('rejects analyses for unknown projects and invalid snapshots', async () => {
    await expect(
      storage.saveAnalysis({ projectId: 'nope', inputSnapshot: emptyInput(), analysisResult: {} }),
    ).rejects.toThrow()
    const p = await storage.createProject({ name: 'X' })
    await expect(
      // @ts-expect-error invalid snapshot on purpose
      storage.saveAnalysis({ projectId: p.id, inputSnapshot: { systemName: 1 }, analysisResult: {} }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('deleting a project cascades to its analyses only', async () => {
    const a = await storage.createProject({ name: 'A' })
    const b = await storage.createProject({ name: 'B' })
    await storage.saveAnalysis({ projectId: a.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.saveAnalysis({ projectId: b.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.deleteProject(a.id)
    expect(await storage.getAnalysisHistory(a.id)).toEqual([])
    expect(await storage.getAnalysisHistory(b.id)).toHaveLength(1)
  })

  it('deletes a single analysis version', async () => {
    const p = await storage.createProject({ name: 'A' })
    const v = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.deleteAnalysis(v.id)
    expect(await storage.getAnalysis(v.id)).toBeNull()
  })
})

describe('corrupted and unexpected data', () => {
  it('quarantines invalid JSON instead of crashing or silently deleting it', async () => {
    driver.setItem(STORAGE_KEYS.projects, '{not json')
    const s = new StorageService(driver)
    expect(await s.getProjects()).toEqual([])
    const issue = s.getIssues()[0]
    expect(issue.kind).toBe('corrupted')
    expect(driver.getItem(issue.backupKey!)).toBe('{not json')
    expect(driver.getItem(STORAGE_KEYS.projects)).toBeNull()
  })

  it('quarantines data without an envelope', async () => {
    driver.setItem(STORAGE_KEYS.projects, JSON.stringify([{ id: 'x' }]))
    const s = new StorageService(driver)
    expect(await s.getProjects()).toEqual([])
    expect(s.getIssues()[0].kind).toBe('corrupted')
  })

  it('drops individual invalid records but keeps valid ones', async () => {
    const p = await storage.createProject({ name: 'Valid' })
    const raw = JSON.parse(driver.getItem(STORAGE_KEYS.projects)!)
    raw.data.push({ id: 'broken', name: '' }, 'garbage', null)
    driver.setItem(STORAGE_KEYS.projects, JSON.stringify(raw))

    const s = new StorageService(driver)
    expect((await s.getProjects()).map((x) => x.id)).toEqual([p.id])
    expect(s.getIssues()[0]).toMatchObject({ kind: 'invalid_items', message: expect.stringContaining('3') })
  })

  it('does not overwrite data written by a newer schema version', async () => {
    const future = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, updatedAt: '', data: [] })
    driver.setItem(STORAGE_KEYS.projects, future)
    const s = new StorageService(driver)
    expect(await s.getProjects()).toEqual([])
    expect(s.getIssues()[0].kind).toBe('future_version')
    expect(driver.getItem(STORAGE_KEYS.projects)).toBe(future)
  })

  it('normalises invalid settings to defaults', async () => {
    driver.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, updatedAt: '', data: { theme: 'neon', sidebarCollapsed: 'yes' } }),
    )
    expect(await new StorageService(driver).getSettings()).toEqual({ theme: 'system', sidebarCollapsed: false })
  })
})

describe('settings and maintenance', () => {
  it('updates settings', async () => {
    expect((await storage.updateSettings({ theme: 'dark' })).theme).toBe('dark')
    expect((await new StorageService(driver).getSettings()).theme).toBe('dark')
  })

  it('resetAll only removes synex_ keys', async () => {
    driver.setItem('other_app', 'keep')
    await storage.createProject({ name: 'A' })
    await storage.updateSettings({ theme: 'dark' })
    storage.resetAll()
    expect(driver.keys()).toEqual(['other_app'])
    expect(await storage.getProjects()).toEqual([])
  })

  it('reports stats', async () => {
    const p = await storage.createProject({ name: 'A' })
    await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: {} })
    const stats = await storage.getStats()
    expect(stats).toMatchObject({ persistent: false, projects: 1, analysisVersions: 1, corruptBackups: 0 })
    expect(stats.approxBytes).toBeGreaterThan(0)
  })
})
