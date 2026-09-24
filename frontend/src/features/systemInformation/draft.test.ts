import { describe, expect, it } from 'vitest'
import {
  addEntry,
  removeAt,
  updateAt,
  blankBusinessRule,
  blankDataEntity,
  blankProblem,
  blankStakeholder,
  blankTechnology,
  blankUser,
  emptyContent,
  addObjective,
  removeEntry,
  updateEntry,
  type EntryKey,
} from './draft'
import { SI_SECTIONS, SI_SECTION_COUNT, sectionAnchorId, sectionById } from './sections'
import { SI_CONTENT_FIELDS, contentOf, normaliseContent } from '@/storage/systemInformationNormalisation'
import { NOT_PROVIDED, type SystemInformation } from '@/types/systemInformation'

describe('empty draft', () => {
  it('starts completely blank', () => {
    const blank = emptyContent()
    expect(blank.systemName).toBe('')
    expect(blank.systemPurpose).toBe('')
    expect(blank.currentWorkflow).toBe('')
    for (const key of ['stakeholders', 'users', 'problems', 'technologies', 'dataEntities', 'businessRules', 'objectives'] as EntryKey[]) {
      expect(blank[key]).toEqual([])
    }
    for (const field of SI_CONTENT_FIELDS) {
      const value = blank[field]
      expect(value === '' || (Array.isArray(value) && value.length === 0)).toBe(true)
    }
  })

  it('copies only what the analyst project already says', () => {
    const draft = emptyContent({ systemType: 'Inventory', organization: 'North Warehouse' })
    expect(draft).toMatchObject({ systemType: 'Inventory', organization: 'North Warehouse' })
    expect(draft.systemName).toBe('')
    expect(draft.systemPurpose).toBe('')
    expect(draft.systemDescription).toBe('')
    expect(draft.currentWorkflow).toBe('')
    expect(draft.objectives).toEqual([])
  })

  it('leaves fields blank when the project has no value for them', () => {
    expect(emptyContent({ systemType: '', organization: '' })).toMatchObject({ systemType: '', organization: '' })
    expect(emptyContent()).toMatchObject({ systemType: '', organization: '' })
  })
})

describe('list operations', () => {
  it('appends without touching existing rows', () => {
    const first = blankStakeholder()
    const list = addEntry([first], { ...blankStakeholder(), name: 'Finance team' })
    expect(list).toHaveLength(2)
    expect(list[0]).toBe(first)
    expect(list[1].name).toBe('Finance team')
  })

  it('does not mutate the list it was given', () => {
    const rows = [blankProblem()]
    addEntry(rows, blankProblem())
    removeEntry(rows, rows[0].id)
    updateEntry(rows, rows[0].id, { title: 'Late reports' })
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('')
  })

  it('ignores out-of-range index edits', () => {
    expect(updateAt(['a'], 4, 'b')).toEqual(['a'])
    expect(removeAt(['a'], 4)).toEqual(['a'])
  })

  it('patches the row with the matching id only', () => {
    const rows = [blankProblem(), blankProblem()]
    const next = updateEntry(rows, rows[1].id, { title: 'Late reports' })
    expect(next[0].title).toBe('')
    expect(next[1].title).toBe('Late reports')
  })

  it('removes exactly one row', () => {
    const rows = [blankTechnology(), blankDataEntity(), blankBusinessRule()]
    const next = removeEntry(rows, rows[1].id)
    expect(next).toHaveLength(2)
    expect(next.some((row) => row.id === rows[1].id)).toBe(false)
  })

  it('gives every blank row a distinct id', () => {
    const ids = new Set([blankStakeholder().id, blankUser().id, blankProblem().id, blankTechnology().id, blankDataEntity().id, blankBusinessRule().id])
    expect(ids.size).toBe(6)
  })

  it('appends objectives verbatim, including an empty one being typed', () => {
    expect(addObjective([], 'Cut double entry')).toEqual(['Cut double entry'])
    expect(addObjective(['a'], '')).toEqual(['a', ''])
  })
})

describe('sections', () => {
  it('declares the nine sections in the documented order', () => {
    expect(SI_SECTION_COUNT).toBe(9)
    expect(SI_SECTIONS.map((section) => section.id)).toEqual([
      'overview',
      'people',
      'process',
      'problems',
      'technology',
      'data',
      'rules',
      'objectives',
      'notes',
    ])
  })

  it('gives each section one stable anchor and label', () => {
    expect(sectionAnchorId('notes')).toBe('si-section-notes')
    expect(sectionById('people').label).toBe('Stakeholders & Users')
    expect(new Set(SI_SECTIONS.map((section) => sectionAnchorId(section.id))).size).toBe(SI_SECTION_COUNT)
  })
})

describe('content mapping', () => {
  it('exposes exactly the editable fields', () => {
    expect(SI_CONTENT_FIELDS).not.toContain('id')
    expect(SI_CONTENT_FIELDS).not.toContain('projectId')
    expect(SI_CONTENT_FIELDS).not.toContain('updatedAt')

    const record: SystemInformation = {
      id: 'si1',
      projectId: 'p1',
      ...emptyContent({ systemType: 'Library' }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }
    expect(contentOf(record)).toEqual(emptyContent({ systemType: 'Library' }))
  })

  it('is what "Not provided" is compared against', () => {
    expect(NOT_PROVIDED).toBe('Not provided')
    expect(normaliseContent(undefined).content).toEqual(emptyContent())
    expect(normaliseContent('nonsense').dropped).toBe(0)
    expect(normaliseContent({ objectives: null, stakeholders: {} }).content.objectives).toEqual([])
  })
})
