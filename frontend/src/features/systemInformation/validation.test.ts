import { describe, expect, it } from 'vitest'
import { hasValidationErrors, MISSING_FIELD_SECTION, validateSystemInformation } from './validation'
import { emptyContent } from './draft'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SystemInformationContent } from '@/types/systemInformation'

const content = (overrides: Partial<SystemInformationContent> = {}): SystemInformationContent => ({
  ...emptyContent(),
  systemName: 'Branch Lending System',
  systemType: 'Library',
  systemPurpose: 'Record loans and returns across branches.',
  ...overrides,
})

describe('validateSystemInformation', () => {
  it('accepts the three required fields and nothing else', () => {
    expect(validateSystemInformation(content())).toEqual({})
    expect(hasValidationErrors({})).toBe(false)
  })

  it('requires name, type and purpose only', () => {
    const errors = validateSystemInformation(content({ systemName: '', systemType: '', systemPurpose: '' }))
    expect(Object.keys(errors).sort()).toEqual(['systemName', 'systemPurpose', 'systemType'])
    expect(errors.systemName).toBe('System name is required.')
    expect(hasValidationErrors(errors)).toBe(true)
  })

  it('treats whitespace as missing', () => {
    expect(validateSystemInformation(content({ systemPurpose: '   \n ' })).systemPurpose).toBeDefined()
  })

  it('leaves every optional section unvalidated', () => {
    const sparse = content({
      stakeholders: [],
      users: [],
      problems: [],
      technologies: [],
      dataEntities: [],
      businessRules: [],
      objectives: [],
      constraints: '',
      additionalNotes: '',
      currentWorkflow: '',
      systemDescription: '',
      organization: '',
    })
    expect(validateSystemInformation(sparse)).toEqual({})
  })

  it('caps each required field at the model limit', () => {
    const errors = validateSystemInformation(
      content({
        systemName: 'x'.repeat(SI_LIMITS.systemName + 1),
        systemType: 'x'.repeat(SI_LIMITS.systemType + 1),
        systemPurpose: 'x'.repeat(SI_LIMITS.systemPurpose + 1),
      }),
    )
    expect(errors.systemName).toBe(`Use ${SI_LIMITS.systemName} characters or fewer.`)
    expect(errors.systemType).toBe(`Use ${SI_LIMITS.systemType} characters or fewer.`)
    expect(errors.systemPurpose).toBe(`Use ${SI_LIMITS.systemPurpose} characters or fewer.`)
  })

  it('sends the analyst to the overview for any missing field', () => {
    for (const key of ['systemName', 'systemType', 'systemPurpose'] as const) {
      expect(MISSING_FIELD_SECTION[key]).toBe('overview')
    }
  })
})
