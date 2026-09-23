import { describe, expect, it } from 'vitest'
import {
  draftToInput,
  emptyDraft,
  hasErrors,
  isKnownSystemType,
  projectToDraft,
  resolveSystemType,
  validateProjectDraft,
} from './validation'
import { OTHER_SYSTEM_TYPE, type Project } from '@/types/project'

const valid = {
  name: 'Warehouse Inventory System',
  description: 'Tracks stock across three warehouses using paper forms.',
  systemType: 'Inventory',
}

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Warehouse',
  description: 'desc',
  systemType: 'Inventory',
  organization: 'PT Maju',
  analyst: 'Rina',
  status: 'Draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
})

describe('validateProjectDraft', () => {
  it('accepts the three required fields', () => {
    expect(validateProjectDraft({ ...emptyDraft(), ...valid })).toEqual({})
    expect(hasErrors({})).toBe(false)
  })

  it('names every missing required field', () => {
    const errors = validateProjectDraft(emptyDraft())
    expect(errors).toMatchObject({
      name: 'Project name is required.',
      description: 'Description is required.',
      systemType: 'System type is required.',
    })
    expect(hasErrors(errors)).toBe(true)
  })

  it('treats whitespace as empty', () => {
    const errors = validateProjectDraft({ ...emptyDraft(), ...valid, name: '   ', description: '\n' })
    expect(errors.name).toBe('Project name is required.')
    expect(errors.description).toBe('Description is required.')
  })

  it('requires text when Other is selected', () => {
    const errors = validateProjectDraft({ ...emptyDraft(), ...valid, systemType: OTHER_SYSTEM_TYPE, otherSystemType: ' ' })
    expect(errors.systemType).toBe('Enter the system type.')
    expect(
      resolveSystemType({ ...emptyDraft(), ...valid, systemType: OTHER_SYSTEM_TYPE, otherSystemType: ' Fleet Maintenance ' }),
    ).toBe('Fleet Maintenance')
  })

  it('rejects over-long values with a concrete limit', () => {
    const errors = validateProjectDraft({ ...emptyDraft(), ...valid, name: 'x'.repeat(121) })
    expect(errors.name).toMatch(/120 characters or fewer/)
  })

  it('optional fields stay optional', () => {
    expect(validateProjectDraft({ ...emptyDraft(), ...valid, organization: '', analyst: '' })).toEqual({})
  })
})

describe('draft <-> project', () => {
  it('resolves Other into the stored system type', () => {
    const input = draftToInput({
      ...emptyDraft(),
      ...valid,
      systemType: OTHER_SYSTEM_TYPE,
      otherSystemType: 'Fleet Maintenance',
    })
    expect(input.systemType).toBe('Fleet Maintenance')
  })

  it('round-trips a custom system type through the Other option', () => {
    const draft = projectToDraft(project({ systemType: 'Fleet Maintenance' }))
    expect(draft.systemType).toBe(OTHER_SYSTEM_TYPE)
    expect(draft.otherSystemType).toBe('Fleet Maintenance')
    expect(resolveSystemType(draft)).toBe('Fleet Maintenance')
    expect(validateProjectDraft(draft)).toEqual({})
  })

  it('keeps a known category selected', () => {
    const draft = projectToDraft(project({ systemType: 'Retail' }))
    expect(draft.systemType).toBe('Retail')
    expect(draft.otherSystemType).toBe('')
  })

  it('never invents an analyst or organization', () => {
    const draft = projectToDraft(project({ organization: '', analyst: '' }))
    expect(draft.organization).toBe('')
    expect(draft.analyst).toBe('')
  })
})

describe('system type categories', () => {
  it('offers the methodology categories plus Other', () => {
    for (const category of ['Academic', 'Inventory', 'E-Commerce', 'Healthcare', 'Banking', 'Government', 'Library', 'HR', 'Logistics', 'Manufacturing', 'Retail']) {
      expect(isKnownSystemType(category)).toBe(true)
    }
    expect(isKnownSystemType(OTHER_SYSTEM_TYPE)).toBe(false)
    expect(isKnownSystemType('')).toBe(false)
  })
})
