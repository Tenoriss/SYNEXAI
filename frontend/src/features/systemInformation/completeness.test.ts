import { describe, expect, it } from 'vitest'
import {
  completedSections,
  detailed,
  filled,
  isContentEmpty,
  isSectionComplete,
  sectionDetail,
  summarise,
  summariseContent,
  SI_STATUS_LABEL,
} from './completeness'
import { SI_SECTION_COUNT, SI_SECTIONS } from './sections'
import { emptyContent } from './draft'
import type { SystemInformationContent } from '@/types/systemInformation'

const allSections = (overrides: Partial<SystemInformationContent> = {}): SystemInformationContent => ({
  ...emptyContent(),
  systemName: 'Branch Lending System',
  systemType: 'Library',
  systemPurpose: 'Record loans and returns across branches.',
  stakeholders: [{ id: 's1', name: 'Head librarian', role: 'Owner', description: '' }],
  users: [{ id: 'u1', name: 'Desk clerk', role: 'Staff', responsibilities: '' }],
  currentWorkflow: 'Members present a book, the clerk scans it and the due date is printed.',
  problems: [{ id: 'p1', title: 'Late returns', description: '', impact: '' }],
  technologies: [{ id: 't1', name: 'Excel', purpose: '' }],
  dataEntities: [{ id: 'd1', name: 'Loan', description: '' }],
  businessRules: [{ id: 'b1', rule: 'Two books per member', description: '' }],
  objectives: ['Reduce queueing at the desk'],
  constraints: 'No budget for new hardware.',
  additionalNotes: 'A mobile app was proposed and rejected last year.',
  ...overrides,
})

describe('field thresholds', () => {
  it('treats noise as missing', () => {
    expect(filled('')).toBe(false)
    expect(filled('   ')).toBe(false)
    expect(filled('a')).toBe(false)
    expect(filled('ab')).toBe(true)
    expect(detailed('short')).toBe(false)
    expect(detailed('a long enough phrase')).toBe(true)
  })
})

describe('section rules', () => {
  it('requires the real fields, not just a visit to the section', () => {
    const blank = emptyContent()
    for (const section of SI_SECTIONS) expect(isSectionComplete(blank, section.id)).toBe(false)
    expect(completedSections(blank)).toEqual([])
  })

  it('counts a section only when its own content exists', () => {
    const partial = allSections({ systemPurpose: '', problems: [], additionalNotes: '' })
    expect(isSectionComplete(partial, 'overview')).toBe(false)
    expect(isSectionComplete(partial, 'problems')).toBe(false)
    expect(isSectionComplete(partial, 'notes')).toBe(false)
    expect(isSectionComplete(partial, 'people')).toBe(true)
    expect(completedSections(partial)).toHaveLength(SI_SECTION_COUNT - 3)
  })

  it('ignores an entry row that holds nothing', () => {
    const rows = allSections({ stakeholders: [{ id: 's1', name: '', role: '', description: '' }], users: [] })
    expect(isSectionComplete(rows, 'people')).toBe(false)
  })

  it('accepts an objective without a constraint, and the other way round', () => {
    const objectivesOnly = allSections({ constraints: '', objectives: ['Faster check-out'] })
    const constraintsOnly = allSections({ objectives: [], constraints: 'Budget is fixed.' })
    expect(isSectionComplete(objectivesOnly, 'objectives')).toBe(true)
    expect(isSectionComplete(constraintsOnly, 'objectives')).toBe(true)
  })

  it('does not count a single word as a workflow description', () => {
    expect(isSectionComplete(allSections({ currentWorkflow: 'manual' }), 'process')).toBe(false)
  })
})

describe('status', () => {
  it('is "not started" while nothing was entered', () => {
    expect(isContentEmpty(emptyContent())).toBe(true)
    expect(summariseContent(emptyContent(), null).status).toBe('not-started')
    expect(summarise(null).status).toBe('not-started')
    expect(summarise(null).updatedAt).toBeNull()
  })

  it('is "not started" for a record whose every field was cleared again', () => {
    const cleared = { ...emptyContent(), id: 'x', projectId: 'p', createdAt: '', updatedAt: '' }
    expect(summarise(cleared).status).toBe('not-started')
    expect(summarise(cleared).sectionsProvided).toBe(0)
  })

  it('is "in progress" between one section and eight', () => {
    const one = { ...emptyContent(), systemName: 'Warehouse System' }
    expect(summariseContent(one, null)).toMatchObject({ status: 'in-progress', sectionsProvided: 0, sectionCount: SI_SECTION_COUNT })
    const nearly = allSections({ additionalNotes: '' })
    expect(summariseContent(nearly, null).sectionsProvided).toBe(SI_SECTION_COUNT - 1)
    expect(summariseContent(nearly, null).status).toBe('in-progress')
  })

  it('is "complete" only when all nine sections hold real input', () => {
    const full = allSections()
    expect(summariseContent(full, null)).toMatchObject({ status: 'complete', sectionsProvided: SI_SECTION_COUNT })
    expect(SI_STATUS_LABEL.complete).toBe('Complete')
    expect(SI_STATUS_LABEL['not-started']).toBe('Not started')
  })

  it('never reports completion when a required field was emptied', () => {
    expect(summariseContent(allSections({ systemName: '  ' }), null).status).toBe('in-progress')
  })

  it('reports the stored timestamp, not a fabricated one', () => {
    const stamp = '2026-09-24T08:00:00.000Z'
    expect(summariseContent(allSections(), stamp).updatedAt).toBe(stamp)
  })
})

describe('section summaries', () => {
  it('names what is still missing instead of a percentage', () => {
    expect(sectionDetail({ ...emptyContent(), systemName: 'Library System' }, 'overview')).toBe(
      'Still needed: type, purpose',
    )
    expect(sectionDetail(allSections(), 'overview')).toBe('Required input present')
  })

  it('counts real entries', () => {
    const content = allSections({
      stakeholders: [
        { id: 's1', name: 'Head librarian', role: '', description: '' },
        { id: 's2', name: '', role: '', description: '' },
      ],
      users: [],
    })
    expect(sectionDetail(content, 'people')).toBe('1 stakeholder, 0 users')
    expect(sectionDetail(content, 'problems')).toBe('1 problem recorded')
    expect(sectionDetail(content, 'technology')).toBe('1 technology recorded')
    expect(sectionDetail(content, 'data')).toBe('1 entity named')
    expect(sectionDetail(content, 'rules')).toBe('1 rule recorded')
    expect(sectionDetail(content, 'objectives')).toBe('1 objective, constraints noted')
  })
})
