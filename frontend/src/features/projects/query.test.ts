import { describe, expect, it } from 'vitest'
import {
  countProjects,
  isQueryActive,
  matchesSearch,
  mostRecentlyUpdated,
  parseQuery,
  queryProjects,
  splitSearchTerms,
  writeQuery,
  DEFAULT_QUERY,
} from './query'
import type { Project, ProjectStatus } from '@/types/project'

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'id',
  name: 'Project',
  description: '',
  systemType: '',
  organization: '',
  analyst: '',
  status: 'Draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const FIXTURES: Project[] = [
  project({
    id: 'a',
    name: 'Warehouse Inventory System',
    description: 'Paper-based stock cards in three warehouses',
    systemType: 'Inventory',
    organization: 'PT Maju',
    status: 'Draft',
    updatedAt: '2026-03-01T10:00:00.000Z',
    createdAt: '2026-01-05T10:00:00.000Z',
  }),
  project({
    id: 'b',
    name: 'Campus Registration',
    description: 'Students enrol each semester',
    systemType: 'Academic',
    organization: 'Universitas Contoh',
    status: 'Analyzing',
    updatedAt: '2026-03-05T10:00:00.000Z',
    createdAt: '2026-02-01T10:00:00.000Z',
  }),
  project({
    id: 'c',
    name: 'Old Billing Portal',
    description: 'Legacy invoicing',
    systemType: 'E-Commerce',
    organization: 'PT Maju',
    status: 'Archived',
    updatedAt: '2026-02-01T10:00:00.000Z',
    createdAt: '2025-12-01T10:00:00.000Z',
  }),
]

describe('search', () => {
  it('splits into terms and ignores case and padding', () => {
    expect(splitSearchTerms('  Inventory   SYSTEM ')).toEqual(['inventory', 'system'])
    expect(splitSearchTerms('   ')).toEqual([])
  })

  it('searches name, description, system type and organization', () => {
    expect(matchesSearch(FIXTURES[0], ['warehouse'])).toBe(true)
    expect(matchesSearch(FIXTURES[0], ['paper-based'])).toBe(true)
    expect(matchesSearch(FIXTURES[0], ['inventory'])).toBe(true)
    expect(matchesSearch(FIXTURES[0], ['pt maju'])).toBe(true)
    expect(matchesSearch(FIXTURES[0], ['analyst-name'])).toBe(false)
  })

  it('requires every term to appear (AND, not OR)', () => {
    expect(matchesSearch(FIXTURES[0], ['warehouse', 'inventory'])).toBe(true)
    expect(matchesSearch(FIXTURES[0], ['warehouse', 'billing'])).toBe(false)
  })

  it('an empty search matches everything', () => {
    expect(matchesSearch(FIXTURES[0], [])).toBe(true)
  })
})

describe('filter + sort', () => {
  it('combines search and status', () => {
    const result = queryProjects(FIXTURES, { search: 'inventory', status: 'Draft', sort: 'updated' })
    expect(result.map((p) => p.id)).toEqual(['a'])
    expect(queryProjects(FIXTURES, { search: 'inventory', status: 'Archived', sort: 'updated' })).toEqual([])
  })

  it('sorts by last updated descending, created descending, then name', () => {
    expect(queryProjects(FIXTURES, { ...DEFAULT_QUERY, sort: 'updated' }).map((p) => p.id)).toEqual(['b', 'a', 'c'])
    expect(queryProjects(FIXTURES, { ...DEFAULT_QUERY, sort: 'created' }).map((p) => p.id)).toEqual(['b', 'a', 'c'])
    expect(queryProjects(FIXTURES, { ...DEFAULT_QUERY, sort: 'name' }).map((p) => p.id)).toEqual(['b', 'c', 'a'])
    const ordered: ProjectStatus[] = ['Draft', 'Analyzing', 'Completed', 'Needs Review', 'Archived']
    expect(queryProjects(FIXTURES, { ...DEFAULT_QUERY, sort: 'status' }).map((p) => p.status)).toEqual(
      ordered.filter((s) => FIXTURES.some((p) => p.status === s)),
    )
  })

  it('never mutates the input array', () => {
    const before = FIXTURES.map((p) => p.id)
    queryProjects(FIXTURES, { ...DEFAULT_QUERY, sort: 'name' })
    expect(FIXTURES.map((p) => p.id)).toEqual(before)
  })
})

describe('counts', () => {
  it('counts every status, including zeros', () => {
    expect(countProjects(FIXTURES)).toEqual({
      Draft: 1,
      Analyzing: 1,
      Completed: 0,
      'Needs Review': 0,
      Archived: 1,
    })
  })

  it('an empty workspace counts zero everywhere', () => {
    expect(countProjects([])).toEqual({ Draft: 0, Analyzing: 0, Completed: 0, 'Needs Review': 0, Archived: 0 })
  })

  it('picks the most recently updated projects', () => {
    expect(mostRecentlyUpdated(FIXTURES, 2).map((p) => p.id)).toEqual(['b', 'a'])
    expect(mostRecentlyUpdated([], 5)).toEqual([])
  })
})

describe('url state', () => {
  it('only writes non-default values', () => {
    expect(writeQuery(DEFAULT_QUERY)).toEqual({})
    expect(writeQuery({ search: '  inventory ', status: 'Draft', sort: 'updated' })).toEqual({
      q: 'inventory',
      status: 'Draft',
    })
  })

  it('parses back what it wrote', () => {
    const query = { search: 'inventory', status: 'Draft' as const, sort: 'name' as const }
    const params = new URLSearchParams(writeQuery(query))
    expect(parseQuery(params)).toEqual(query)
  })

  it('falls back to defaults for garbage input', () => {
    expect(parseQuery(new URLSearchParams('status=Bogus&sort=sideways'))).toEqual(DEFAULT_QUERY)
    expect(isQueryActive(parseQuery(new URLSearchParams('')))).toBe(false)
    expect(isQueryActive(parseQuery(new URLSearchParams('q=x')))).toBe(true)
    expect(isQueryActive(parseQuery(new URLSearchParams('status=Archived')))).toBe(true)
  })
})
