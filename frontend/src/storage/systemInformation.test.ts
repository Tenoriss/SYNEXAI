import { beforeEach, describe, expect, it } from 'vitest'
import { StorageService } from './StorageService'
import { MemoryDriver } from './driver'
import { STORAGE_KEYS } from './keys'
import { CORRUPT_BACKUP_PREFIX } from './keys'
import { ValidationError } from './repositories/types'
import { emptyContent } from '@/features/systemInformation/draft'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SystemInformationContent } from '@/types/systemInformation'

/** A realistic fixture; the app itself never seeds anything like this. */
const content = (overrides: Partial<SystemInformationContent> = {}): SystemInformationContent => ({
  ...emptyContent(),
  systemName: 'Branch Lending System',
  systemType: 'Library',
  systemPurpose: 'Record loans and returns across city library branches.',
  ...overrides,
})

const envelope = (data: unknown) => JSON.stringify({ schemaVersion: 2, updatedAt: new Date().toISOString(), data })

let driver: MemoryDriver
let storage: StorageService

beforeEach(() => {
  driver = new MemoryDriver()
  storage = new StorageService(driver)
})

describe('system information collection', () => {
  it('is empty before the analyst records anything', async () => {
    expect(await storage.getSystemInformation('p1')).toBeNull()
    expect(await storage.listSystemInformation()).toEqual([])
  })

  it('keeps every project under one key instead of one key per project', async () => {
    await storage.saveSystemInformation('p1', content())
    await storage.saveSystemInformation('p2', content({ systemName: 'Warehouse Stock System' }))

    const keys = driver.keys().filter((k) => k.startsWith('synex_'))
    expect(keys).toContain(STORAGE_KEYS.systemInformation)
    expect(keys.filter((k) => /p1|p2/.test(k))).toEqual([])
    expect(keys).toEqual([STORAGE_KEYS.systemInformation])
    const stored = JSON.parse(driver.getItem(STORAGE_KEYS.systemInformation) as string) as { data: unknown[] }
    expect(stored.data).toHaveLength(2)
  })

  it('reads the record back after a reload', async () => {
    const saved = await storage.saveSystemInformation('p1', content({ organization: '  City Library  ' }))
    const reopened = new StorageService(driver)
    const reread = await reopened.getSystemInformation('p1')

    expect(reread).toEqual(saved)
    expect(reread?.organization).toBe('City Library')
  })

  it('creates on first save and updates the same record afterwards', async () => {
    const created = await storage.saveSystemInformation('p1', content())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = await storage.saveSystemInformation('p1', content({ systemPurpose: 'Track reservations instead.' }))

    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).not.toBe(created.updatedAt)
    expect(await storage.listSystemInformation()).toHaveLength(1)
  })

  it('leaves updatedAt alone when an auto-save writes identical content', async () => {
    const created = await storage.saveSystemInformation('p1', content())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const again = await storage.saveSystemInformation('p1', content())

    expect(again).toEqual(created)
    expect(driver.getItem(STORAGE_KEYS.systemInformation)).toContain(created.updatedAt)
  })

  it('trims and caps text so stored records stay inside the model', async () => {
    const saved = await storage.saveSystemInformation('p1', content({
      systemName: `  ${'n'.repeat(SI_LIMITS.systemName + 40)}  `,
      currentWorkflow: '  Returns are logged by hand at each desk.  ',
    }))

    expect(saved.systemName).toHaveLength(SI_LIMITS.systemName)
    expect(saved.currentWorkflow).toBe('Returns are logged by hand at each desk.')
  })

  it('keeps an entry row that is still being typed', async () => {
    const saved = await storage.saveSystemInformation(
      'p1',
      content({ stakeholders: [{ id: 's1', name: '', role: '', description: '' }] }),
    )
    expect(saved.stakeholders).toEqual([{ id: 's1', name: '', role: '', description: '' }])
  })

  it('applies a patch without disturbing the other fields', async () => {
    await storage.saveSystemInformation('p1', content({ organization: 'City Library' }))
    const patched = await storage.updateSystemInformation('p1', { constraints: 'Budget is fixed for this year.' })

    expect(patched.constraints).toBe('Budget is fixed for this year.')
    expect(patched.organization).toBe('City Library')
    expect(patched.systemName).toBe('Branch Lending System')
  })

  it('refuses to store information that belongs to no project', async () => {
    await expect(storage.saveSystemInformation('   ', content())).rejects.toBeInstanceOf(ValidationError)
    expect(await storage.listSystemInformation()).toEqual([])
  })

  it('deletes idempotently', async () => {
    await storage.saveSystemInformation('p1', content())
    expect(await storage.deleteSystemInformation('p1')).toBe(true)
    expect(await storage.deleteSystemInformation('p1')).toBe(false)
    expect(await storage.getSystemInformation('p1')).toBeNull()
  })

  it('is removed together with its project', async () => {
    const project = await storage.createProject({ name: 'Library', description: 'Lending records.', systemType: 'Library' })
    await storage.saveSystemInformation(project.id, content())

    await storage.deleteProject(project.id)
    expect(await storage.getSystemInformation(project.id)).toBeNull()
    expect(await storage.listSystemInformation()).toEqual([])
  })

  it('counts records for the settings screen', async () => {
    expect((await storage.getStats()).systemInformation).toBe(0)
    await storage.saveSystemInformation('p1', content())
    await storage.saveSystemInformation('p2', content())
    expect((await storage.getStats()).systemInformation).toBe(2)
  })
})

describe('system information robustness', () => {
  it('drops malformed entries but keeps the usable ones', async () => {
    driver.setItem(
      STORAGE_KEYS.systemInformation,
      envelope([
        {
          projectId: 'p1',
          systemName: 'Warehouse System',
          stakeholders: ['not-an-object', { name: 'Finance team', role: 42 }, null],
          objectives: ['  Cut double entry  ', 7, '   '],
          currentWorkflow: { nested: true },
        },
      ]),
    )

    const record = await storage.getSystemInformation('p1')
    expect(record?.systemName).toBe('Warehouse System')
    expect(record?.stakeholders).toHaveLength(1)
    expect(record?.stakeholders[0]).toMatchObject({ name: 'Finance team', role: '' })
    expect(record?.objectives).toEqual(['Cut double entry'])
    expect(record?.currentWorkflow).toBe('')
    expect(storage.getIssues().some((issue) => issue.kind === 'invalid_items')).toBe(true)
  })

  it('tolerates a record with no content at all', async () => {
    driver.setItem(STORAGE_KEYS.systemInformation, envelope([{ projectId: 'p1' }]))
    const record = await storage.getSystemInformation('p1')
    expect(record).toMatchObject({ projectId: 'p1', systemName: '', stakeholders: [], objectives: [] })
    expect(record?.createdAt).toBe(record?.updatedAt)
  })

  it('sets aside a collection that is not a list, without losing the bytes', async () => {
    driver.setItem(STORAGE_KEYS.systemInformation, envelope({ projectId: 'p1' }))
    expect(await storage.getSystemInformation('p1')).toBeNull()

    const backup = driver.keys().find((key) => key.startsWith(CORRUPT_BACKUP_PREFIX))
    expect(backup).toBeDefined()
    expect(driver.getItem(backup as string)).toContain('projectId')
    // A fresh save still works on the repaired, empty collection.
    await storage.saveSystemInformation('p1', content())
    expect(await storage.listSystemInformation()).toHaveLength(1)
  })

  it('survives a payload that is not JSON', async () => {
    driver.setItem(STORAGE_KEYS.systemInformation, '{{{')
    expect(await storage.getSystemInformation('p1')).toBeNull()
    expect(driver.keys().some((key) => key.startsWith(CORRUPT_BACKUP_PREFIX))).toBe(true)
  })

  it('never lets one broken record hide the healthy ones', async () => {
    driver.setItem(
      STORAGE_KEYS.systemInformation,
      envelope([
        { projectId: 'p1', systemName: 'Good system' },
        'garbage',
        42,
        { systemName: 'no project link' },
      ]),
    )
    const list = await storage.listSystemInformation()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ projectId: 'p1', systemName: 'Good system' })
  })

  it('stays plain JSON so a later phase can post it to the API', async () => {
    const saved = await storage.saveSystemInformation('p1', content({ problems: [{ id: 'x1', title: 'Late reports', description: 'Monthly totals arrive on the 9th.', impact: 'Decisions are made on stale numbers.' }] }))
    const roundTrip: unknown = JSON.parse(JSON.stringify(saved))
    expect(roundTrip).toEqual(saved)
    expect(Object.keys(saved as unknown as Record<string, unknown>).sort()).toEqual(
      Object.keys(roundTrip as object).sort(),
    )
  })
})
