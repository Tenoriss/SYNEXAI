import { beforeEach, describe, expect, it } from 'vitest'
import { StorageService } from './StorageService'
import { LocalStorageDriver, MemoryDriver } from './driver'
import { STORAGE_KEYS } from './keys'
import { SCHEMA_VERSION } from './collection'
import { NotFoundError, ValidationError } from './repositories/types'
import { DATA_SAFE_NOTE, describeStorageError } from './errors'
import type { NewProjectInput } from '@/types/project'
import type { AnalysisMeta, NewAnalysisRecord, SystemUnderstanding } from '@/types/analysis'
import type { SystemInformationContent } from '@/types/systemInformation'

/** The Phase 3 content shape, as the analysis snapshot stores it. */
const emptyInput = (overrides: Partial<SystemInformationContent> = {}): SystemInformationContent => ({
  systemName: 'Test System',
  systemType: '',
  systemPurpose: '',
  systemDescription: '',
  organization: '',
  stakeholders: [],
  users: [],
  currentWorkflow: '',
  processTrigger: '',
  processInput: '',
  processMainProcessing: '',
  processOutput: '',
  processDecisionPoints: '',
  problems: [],
  technologies: [],
  dataEntities: [],
  businessRules: [],
  objectives: [],
  constraints: '',
  additionalNotes: '',
  ...overrides,
})

const understanding = (overrides: Partial<SystemUnderstanding> = {}): SystemUnderstanding => ({
  summary: 'A system that records loans for four branches.',
  purpose: 'Replace the paper card process.',
  systemScope: '',
  actors: ['Desk clerk'],
  stakeholders: ['Head librarian'],
  processes: [],
  inputs: [],
  outputs: [],
  dataEntities: ['Loan'],
  technologies: [],
  businessRules: [],
  assumptions: [],
  missingInformation: ['Which staff approve a lost card?'],
  ...overrides,
})

const meta = (overrides: Partial<AnalysisMeta> = {}): AnalysisMeta => ({
  provider: 'gemini',
  model: 'gemini-test',
  generatedAt: '2026-09-24T00:00:00.000Z',
  durationMs: 4321,
  attempts: 1,
  promptChars: 1180,
  responseChars: 640,
  schemaVersion: 3,
  ...overrides,
})

const analysisRecord = (projectId: string, overrides: Partial<NewAnalysisRecord> = {}): NewAnalysisRecord => ({
  projectId,
  sourceInformationUpdatedAt: '2026-09-23T00:00:00.000Z',
  input: emptyInput(),
  result: understanding(),
  meta: meta(),
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

describe('analysis results', () => {
  it('appends records without overwriting and lists newest first', async () => {
    const project = await storage.createProject(input('Hospital'))
    const first = await storage.saveAnalysis(analysisRecord(project.id, { meta: meta({ attempts: 1 }) }))
    await new Promise((resolve) => setTimeout(resolve, 2))
    const second = await storage.saveAnalysis(analysisRecord(project.id, { result: understanding({ summary: 'Newer' }) }))

    const history = await storage.getAnalysisHistory(project.id)
    expect(history.map((record) => record.id)).toEqual([second.id, first.id])
    expect((await storage.getLatestAnalysis(project.id))?.id).toBe(second.id)
    expect(await storage.getAnalysis(first.id)).toEqual(first)
  })

  it('persists the whole validated result plus run metadata', async () => {
    const project = await storage.createProject(input('Hospital'))
    const record = await storage.saveAnalysis(analysisRecord(project.id))

    expect(record.type).toBe('system-understanding')
    expect(record.createdAt).toBe(record.updatedAt)
    expect(record.sourceInformationUpdatedAt).toBe('2026-09-23T00:00:00.000Z')
    expect(record.meta).toEqual(meta())
    const stored = await storage.getAnalysis(record.id)
    expect(stored?.result).toEqual(understanding())
  })

  it('snapshots the input so a later autosave does not change history', async () => {
    const project = await storage.createProject(input('Bank'))
    const source = emptyInput({ systemPurpose: 'original' })
    const record = await storage.saveAnalysis(analysisRecord(project.id, { input: source }))
    source.systemPurpose = 'mutated'

    expect((await storage.getAnalysis(record.id))?.input.systemPurpose).toBe('original')
    // and the project's own system information is a separate record, untouched here
    expect(await storage.getSystemInformation(project.id)).toBeNull()
  })

  it('rejects an analysis whose result is not a validated object', async () => {
    const project = await storage.createProject(input('X'))
    await expect(storage.saveAnalysis(analysisRecord('nope'))).rejects.toThrow(/does not exist/)
    await expect(
      // @ts-expect-error raw model text must never be stored as analysis
      storage.saveAnalysis(analysisRecord(project.id, { result: 'The system seems fine' })),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      storage.saveAnalysis(analysisRecord(project.id, { result: understanding({ summary: 42 as unknown as string }) })),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('drops a stored result that no longer validates, keeping the rest', async () => {
    const project = await storage.createProject(input('X'))
    const good = await storage.saveAnalysis(analysisRecord(project.id))
    driver.setItem(
      STORAGE_KEYS.analysisVersions,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        updatedAt: '',
        data: [
          good,
          { ...good, id: 'tampered', result: { summary: 'hand written, unvalidated' } },
        ],
      }),
    )
    const reloaded = new StorageService(driver)
    const history = await reloaded.getAnalysisHistory(project.id)

    expect(history.map((record) => record.id)).toEqual([good.id])
    expect(reloaded.getIssues().some((issue) => issue.kind === 'invalid_items')).toBe(true)
  })

  it('upgrades legacy versions saved under schema v2', async () => {
    driver.setItem(
      STORAGE_KEYS.analysisVersions,
      JSON.stringify({
        schemaVersion: 2,
        updatedAt: '',
        data: [
          {
            id: 'legacy-1',
            projectId: 'project-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            inputSnapshot: { systemName: 'Old', description: 'free text', stakeholders: '' },
            analysisResult: { summary: 'legacy summary', purpose: 'legacy purpose', actors: ['Clerk'] },
          },
        ],
      }),
    )
    const upgraded = new StorageService(driver)
    const [record] = await upgraded.getAnalysisHistory('project-1')

    expect(record).toMatchObject({
      id: 'legacy-1',
      type: 'system-understanding',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceInformationUpdatedAt: null,
      result: { summary: 'legacy summary', purpose: 'legacy purpose', actors: ['Clerk'], processes: [] },
      meta: { provider: 'unknown', attempts: 1 },
    })
    expect(record.input.systemName).toBe('Old')
    // the migrated shape is written back once, so a second load does not re-migrate
    const stored = JSON.parse(driver.getItem(STORAGE_KEYS.analysisVersions)!)
    expect(stored.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('deleting a project cascades to its analyses only', async () => {
    const a = await storage.createProject(input('A'))
    const b = await storage.createProject(input('B'))
    await storage.saveAnalysis(analysisRecord(a.id))
    await storage.saveAnalysis(analysisRecord(b.id))
    await storage.deleteProject(a.id)

    expect(await storage.getAnalysisHistory(a.id)).toEqual([])
    expect(await storage.getAnalysisHistory(b.id)).toHaveLength(1)
  })

  it('deletes a single analysis record', async () => {
    const project = await storage.createProject(input('A'))
    const record = await storage.saveAnalysis(analysisRecord(project.id))
    await storage.deleteAnalysis(record.id)
    expect(await storage.getAnalysis(record.id)).toBeNull()
  })

  it('archiving keeps analysis history intact', async () => {
    const project = await storage.createProject(input('A'))
    await storage.saveAnalysis(analysisRecord(project.id))
    await storage.archiveProject(project.id)
    expect(await storage.getAnalysisHistory(project.id)).toHaveLength(1)
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
    await storage.saveAnalysis(analysisRecord(p.id))
    const stats = await storage.getStats()
    expect(stats).toMatchObject({ persistent: false, projects: 1, analysisVersions: 1, corruptBackups: 0 })
    expect(stats.approxBytes).toBeGreaterThan(0)
  })

  it('reports whether persistence is real', () => {
    expect(storage.persistent).toBe(false)
  })
})
