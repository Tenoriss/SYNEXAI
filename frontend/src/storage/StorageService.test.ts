import { beforeEach, describe, expect, it } from 'vitest'
import { StorageService } from './StorageService'
import { LocalStorageDriver, MemoryDriver } from './driver'
import { STORAGE_KEYS } from './keys'
import { SCHEMA_VERSION } from './collection'
import { NotFoundError, ValidationError } from './repositories/types'
import { DATA_SAFE_NOTE, describeStorageError } from './errors'
import type { NewProjectInput } from '@/types/project'
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

/** Only test fixtures — the application itself never seeds projects. */
const input = (name: string, overrides: Partial<NewProjectInput> = {}): NewProjectInput => ({
  name,
  description: `What ${name} does today and what the analysis should focus on.`,
  systemType: 'Inventory',
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
    const p = await storage.createProject(input('  Library System ', { organization: '  City Library ' }))
    expect(p.name).toBe('Library System')
    expect(p.organization).toBe('City Library')
    expect(p.analyst).toBe('')
    expect(p.status).toBe('Draft')
    expect(p.createdAt).toBe(p.updatedAt)

    expect(await storage.getProject(p.id)).toEqual(p)

    await new Promise((r) => setTimeout(r, 2))
    const u = await storage.updateProject(p.id, { status: 'Analyzing', description: 'desc' })
    expect(u.status).toBe('Analyzing')
    expect(u.description).toBe('desc')
    expect(u.updatedAt > p.updatedAt).toBe(true)
    expect(u.createdAt).toBe(p.createdAt)
    expect(u.id).toBe(p.id)

    await storage.deleteProject(p.id)
    expect(await storage.getProject(p.id)).toBeNull()
  })

  it('persists across service instances (reload)', async () => {
    const p = await storage.createProject(input('Inventory'))
    const reloaded = new StorageService(driver)
    expect(await reloaded.getProject(p.id)).toEqual(p)
  })

  it('stores data in a versioned envelope under synex_projects', async () => {
    await storage.createProject(input('X'))
    const raw = JSON.parse(driver.getItem(STORAGE_KEYS.projects)!)
    expect(STORAGE_KEYS.projects).toBe('synex_projects')
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
    expect(Array.isArray(raw.data)).toBe(true)
  })

  it('validates required fields and unknown ids', async () => {
    await expect(storage.createProject(input('   '))).rejects.toBeInstanceOf(ValidationError)
    await expect(storage.createProject(input('Name', { description: '  ' }))).rejects.toThrow(/Description is required/)
    await expect(storage.createProject(input('Name', { systemType: '' }))).rejects.toThrow(/System type is required/)

    const p = await storage.createProject(input('Ok'))
    await expect(storage.updateProject(p.id, { name: '' })).rejects.toBeInstanceOf(ValidationError)
    // @ts-expect-error invalid status on purpose
    await expect(storage.updateProject(p.id, { status: 'Done' })).rejects.toBeInstanceOf(ValidationError)
    await expect(storage.updateProject('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(storage.deleteProject('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('truncates over-long values instead of rejecting the save', async () => {
    const p = await storage.createProject(input('n'.repeat(200), { systemType: 'Retail' }))
    expect(p.name).toHaveLength(120)
  })

  it('archives without deleting, and restores as a Draft', async () => {
    const p = await storage.createProject(input('Warehouse'))
    const a = await storage.archiveProject(p.id)
    expect(a.status).toBe('Archived')
    expect(a.createdAt).toBe(p.createdAt)
    expect(await storage.getProjects()).toHaveLength(1)
    // Archiving twice is a no-op that still leaves the project stored.
    expect((await storage.archiveProject(p.id)).status).toBe('Archived')

    const r = await storage.restoreProject(p.id)
    expect(r.status).toBe('Draft')
    expect(await storage.getProject(p.id)).not.toBeNull()
  })

  it('changes status explicitly', async () => {
    const p = await storage.createProject(input('Clinic'))
    expect((await storage.setProjectStatus(p.id, 'Needs Review')).status).toBe('Needs Review')
    // @ts-expect-error invalid status on purpose
    await expect(storage.setProjectStatus(p.id, 'Archived-ish')).rejects.toBeInstanceOf(ValidationError)
  })

  it('duplicates descriptive fields into a new Draft with a fresh id', async () => {
    const p = await storage.createProject(input('Billing', { organization: 'PT Maju', analyst: 'Rina' }))
    await storage.archiveProject(p.id)
    const copy = await storage.duplicateProject(p.id)
    expect(copy.id).not.toBe(p.id)
    expect(copy.name).toBe('Billing (copy)')
    expect(copy.status).toBe('Draft')
    expect(copy.organization).toBe('PT Maju')
    expect(copy.analyst).toBe('Rina')
    expect(copy.description).toBe(p.description)
    expect(copy.systemType).toBe(p.systemType)
  })

  it('notifies subscribers on change', async () => {
    const changes: string[] = []
    const off = storage.subscribe((c) => changes.push(c))
    const p = await storage.createProject(input('A'))
    await storage.updateProject(p.id, { name: 'B' })
    await storage.archiveProject(p.id)
    off()
    await storage.deleteProject(p.id)
    expect(changes).toEqual(['projects', 'projects', 'projects'])
  })

})

describe('storage limits', () => {
  it('turns a browser quota error into a readable message', () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
      removeItem: () => undefined,
      key: () => null,
      clear: () => undefined,
      length: 0,
    } as unknown as Storage

    const driver = new LocalStorageDriver(store)
    expect(() => driver.setItem(STORAGE_KEYS.projects, 'x')).toThrow(/Local storage is full/)
    // No stack details, no stored content: safe to show in the UI.
    try {
      driver.setItem(STORAGE_KEYS.projects, 'x')
    } catch (err) {
      expect(describeStorageError(err)).toBe('Local storage is full. Delete unused projects or analyses and try again.')
    }
  })

  it('keeps error text actionable for every known failure kind', () => {
    expect(describeStorageError(new Error(''))).toMatch(/could not be saved/)
    expect(describeStorageError(new NotFoundError('Project', 'abc-123'))).toMatch(/was not found/)
    expect(describeStorageError(new ValidationError('Description is required.'))).toBe('Description is required.')
    expect(DATA_SAFE_NOTE).toMatch(/still stored in this browser/)
  })
})

describe('schema migration', () => {
  it('upgrades v1 projects, folding `domain` into `systemType`', async () => {
    const legacy = {
      schemaVersion: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
      data: [
        {
          id: 'legacy-1',
          name: 'Old Library',
          description: 'Saved during Phase 1',
          domain: 'Library',
          status: 'Draft',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    }
    driver.setItem(STORAGE_KEYS.projects, JSON.stringify(legacy))

    const s = new StorageService(driver)
    const [project] = await s.getProjects()
    expect(project).toMatchObject({
      id: 'legacy-1',
      systemType: 'Library',
      organization: '',
      analyst: '',
    })
    expect((project as unknown as Record<string, unknown>).domain).toBeUndefined()

    // The upgrade is written back once, so a reload does not re-migrate.
    const stored = JSON.parse(driver.getItem(STORAGE_KEYS.projects)!)
    expect(stored.schemaVersion).toBe(SCHEMA_VERSION)
    expect(stored.data[0].systemType).toBe('Library')
  })

  it('keeps v1 analysis history and settings readable', async () => {
    driver.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ schemaVersion: 1, updatedAt: '', data: { theme: 'dark', sidebarCollapsed: true } }),
    )
    const s = new StorageService(driver)
    expect(await s.getSettings()).toEqual({ theme: 'dark', sidebarCollapsed: true })
    expect(s.getIssues()).toEqual([])
  })

  it('drops legacy records that were already invalid rather than crashing', async () => {
    driver.setItem(
      STORAGE_KEYS.projects,
      JSON.stringify({ schemaVersion: 1, updatedAt: '', data: [{ id: 'x', name: '' }] }),
    )
    const s = new StorageService(driver)
    expect(await s.getProjects()).toEqual([])
    expect(s.getIssues()[0].kind).toBe('invalid_items')
  })
})

describe('analysis history', () => {
  it('appends versions without overwriting and lists newest first', async () => {
    const p = await storage.createProject(input('Hospital'))
    const v1 = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: { n: 1 } })
    await new Promise((r) => setTimeout(r, 2))
    const v2 = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: { n: 2 } })

    const history = await storage.getAnalysisHistory(p.id)
    expect(history.map((v) => v.id)).toEqual([v2.id, v1.id])
    expect((await storage.getLatestAnalysis(p.id))?.id).toBe(v2.id)
    expect(await storage.getAnalysis(v1.id)).toEqual(v1)
  })

  it('snapshots input so later mutation does not change history', async () => {
    const p = await storage.createProject(input('Bank'))
    const input_ = emptyInput({ description: 'original' })
    const v = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: input_, analysisResult: {} })
    input_.description = 'mutated'
    expect((await storage.getAnalysis(v.id))?.inputSnapshot.description).toBe('original')
  })

  it('rejects analyses for unknown projects and invalid snapshots', async () => {
    await expect(
      storage.saveAnalysis({ projectId: 'nope', inputSnapshot: emptyInput(), analysisResult: {} }),
    ).rejects.toThrow()
    const p = await storage.createProject(input('X'))
    await expect(
      // @ts-expect-error invalid snapshot on purpose
      storage.saveAnalysis({ projectId: p.id, inputSnapshot: { systemName: 1 }, analysisResult: {} }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('deleting a project cascades to its analyses only', async () => {
    const a = await storage.createProject(input('A'))
    const b = await storage.createProject(input('B'))
    await storage.saveAnalysis({ projectId: a.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.saveAnalysis({ projectId: b.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.deleteProject(a.id)
    expect(await storage.getAnalysisHistory(a.id)).toEqual([])
    expect(await storage.getAnalysisHistory(b.id)).toHaveLength(1)
  })

  it('deletes a single analysis version', async () => {
    const p = await storage.createProject(input('A'))
    const v = await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.deleteAnalysis(v.id)
    expect(await storage.getAnalysis(v.id)).toBeNull()
  })

  it('archiving keeps analysis history intact', async () => {
    const p = await storage.createProject(input('A'))
    await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: {} })
    await storage.archiveProject(p.id)
    expect(await storage.getAnalysisHistory(p.id)).toHaveLength(1)
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
    const p = await storage.createProject(input('Valid'))
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
    await storage.createProject(input('A'))
    await storage.updateSettings({ theme: 'dark' })
    storage.resetAll()
    expect(driver.keys()).toEqual(['other_app'])
    expect(await storage.getProjects()).toEqual([])
  })

  it('reports stats', async () => {
    const p = await storage.createProject(input('A'))
    await storage.saveAnalysis({ projectId: p.id, inputSnapshot: emptyInput(), analysisResult: {} })
    const stats = await storage.getStats()
    expect(stats).toMatchObject({ persistent: false, projects: 1, analysisVersions: 1, corruptBackups: 0 })
    expect(stats.approxBytes).toBeGreaterThan(0)
  })

  it('reports whether persistence is real', () => {
    expect(storage.persistent).toBe(false)
  })
})
