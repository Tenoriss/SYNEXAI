import { createId } from '@/utils/id'
import type {
  BusinessRule,
  DataEntity,
  Stakeholder,
  SystemInformationContent,
  SystemProblem,
  SystemUser,
  Technology,
} from '@/types/systemInformation'

export type EntryKey = 'stakeholders' | 'users' | 'problems' | 'technologies' | 'dataEntities' | 'businessRules'

export function blankStakeholder(): Stakeholder {
  return { id: createId(), name: '', role: '', description: '' }
}
export function blankUser(): SystemUser {
  return { id: createId(), name: '', role: '', responsibilities: '' }
}
export function blankProblem(): SystemProblem {
  return { id: createId(), title: '', description: '', impact: '' }
}
export function blankTechnology(): Technology {
  return { id: createId(), name: '', purpose: '' }
}
export function blankDataEntity(): DataEntity {
  return { id: createId(), name: '', description: '' }
}
export function blankBusinessRule(): BusinessRule {
  return { id: createId(), rule: '', description: '' }
}

/** What the form pre-fills from the user's own project record — nothing else. */
export interface Prefill {
  systemType?: string
  organization?: string
}

export function emptyContent(prefill: Prefill = {}): SystemInformationContent {
  return {
    systemName: '',
    systemType: prefill.systemType ?? '',
    systemPurpose: '',
    systemDescription: '',
    organization: prefill.organization ?? '',
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
  }
}

/** Pure list operations shared by every dynamic section. */
export function addEntry<T extends { id: string }>(list: readonly T[], entry: T): T[] {
  return [...list, entry]
}

export function updateEntry<T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function removeEntry<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((item) => item.id !== id)
}

export function addObjective(list: readonly string[], value: string): string[] {
  return [...list, value]
}

/** Index-based edits for the plain-text lists (objectives). Out-of-range writes are ignored. */
export function updateAt(list: readonly string[], index: number, value: string): string[] {
  return list.map((current, i) => (i === index ? value : current))
}

export function removeAt(list: readonly string[], index: number): string[] {
  return list.filter((_, i) => i !== index)
}
