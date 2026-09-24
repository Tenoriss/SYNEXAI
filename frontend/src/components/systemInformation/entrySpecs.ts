/**
 * Column definitions for the six dynamic entry lists. The placeholder text is
 * illustrative only — it never becomes stored data (spec §10–§17).
 */
import { SI_LIMITS } from '@/types/systemInformation'
import type { BusinessRule, DataEntity, Stakeholder, SystemProblem, SystemUser, Technology } from '@/types/systemInformation'
import {
  blankBusinessRule,
  blankDataEntity,
  blankProblem,
  blankStakeholder,
  blankTechnology,
  blankUser,
} from '@/features/systemInformation/draft'
import type { EntryListSpec } from './DynamicEntryList'

export const STAKEHOLDER_SPEC: EntryListSpec<Stakeholder> = {
  singular: 'stakeholder',
  plural: 'stakeholders',
  addLabel: 'Add Stakeholder',
  emptyText: 'No stakeholders recorded. Add the people or groups with an interest in this system.',
  blank: blankStakeholder,
  title: (item) => item.name,
  columns: [
    {
      key: 'name',
      label: 'Name',
      get: (i) => i.name,
      set: (i, v) => ({ ...i, name: v }),
      max: SI_LIMITS.entryName,
      placeholder: 'Person, team or department',
    },
    {
      key: 'role',
      label: 'Role',
      get: (i) => i.role,
      set: (i, v) => ({ ...i, role: v }),
      max: SI_LIMITS.entryRole,
      placeholder: 'How they relate to the system',
    },
    {
      key: 'description',
      label: 'Description',
      kind: 'textarea',
      get: (i) => i.description,
      set: (i, v) => ({ ...i, description: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'What this stakeholder needs from, or contributes to, the system',
    },
  ],
}

export const USER_SPEC: EntryListSpec<SystemUser> = {
  singular: 'user',
  plural: 'users',
  addLabel: 'Add User',
  emptyText: 'No users recorded. Add the people who actually operate the system today.',
  blank: blankUser,
  title: (item) => item.name,
  columns: [
    {
      key: 'name',
      label: 'Name',
      get: (i) => i.name,
      set: (i, v) => ({ ...i, name: v }),
      max: SI_LIMITS.entryName,
      placeholder: 'Job title or group, e.g. Branch librarian',
    },
    {
      key: 'role',
      label: 'Role',
      get: (i) => i.role,
      set: (i, v) => ({ ...i, role: v }),
      max: SI_LIMITS.entryRole,
      placeholder: 'What they do in the process',
    },
    {
      key: 'responsibilities',
      label: 'Responsibilities',
      kind: 'textarea',
      get: (i) => i.responsibilities,
      set: (i, v) => ({ ...i, responsibilities: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'Tasks this person is accountable for',
    },
  ],
}

export const PROBLEM_SPEC: EntryListSpec<SystemProblem> = {
  singular: 'problem',
  plural: 'problems',
  addLabel: 'Add Problem',
  emptyText: 'No problems recorded yet. Note what you observed; severity and categories come from later analysis.',
  blank: blankProblem,
  title: (item) => item.title,
  columns: [
    {
      key: 'title',
      label: 'Title',
      get: (i) => i.title,
      set: (i, v) => ({ ...i, title: v }),
      max: SI_LIMITS.entryName,
      placeholder: 'Short name for the problem',
    },
    {
      key: 'impact',
      label: 'Impact',
      get: (i) => i.impact,
      set: (i, v) => ({ ...i, impact: v }),
      max: SI_LIMITS.entryImpact,
      placeholder: 'What it costs, delays or blocks',
    },
    {
      key: 'description',
      label: 'Description',
      kind: 'textarea',
      get: (i) => i.description,
      set: (i, v) => ({ ...i, description: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'What happens, when, and how often',
    },
  ],
}

export const TECHNOLOGY_SPEC: EntryListSpec<Technology> = {
  singular: 'technology',
  plural: 'technologies',
  addLabel: 'Add Technology',
  emptyText: 'No technology recorded. Add only what the system actually uses today.',
  blank: blankTechnology,
  title: (item) => item.name,
  columns: [
    {
      key: 'name',
      label: 'Technology name',
      get: (i) => i.name,
      set: (i, v) => ({ ...i, name: v }),
      max: SI_LIMITS.entryName,
      placeholder: 'Language, framework, database, OS, hosting…',
    },
    {
      key: 'purpose',
      label: 'Purpose',
      get: (i) => i.purpose,
      set: (i, v) => ({ ...i, purpose: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'What it is used for here',
    },
  ],
}

export const DATA_ENTITY_SPEC: EntryListSpec<DataEntity> = {
  singular: 'data entity',
  plural: 'data entities',
  addLabel: 'Add Data Entity',
  emptyText: 'No data entities recorded. Name the objects the system keeps records about.',
  blank: blankDataEntity,
  title: (item) => item.name,
  columns: [
    {
      key: 'name',
      label: 'Entity name',
      get: (i) => i.name,
      set: (i, v) => ({ ...i, name: v }),
      max: SI_LIMITS.entryName,
      placeholder: 'The thing a record is about',
    },
    {
      key: 'description',
      label: 'Description',
      kind: 'textarea',
      get: (i) => i.description,
      set: (i, v) => ({ ...i, description: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'What is stored, where it comes from, how long it is kept',
    },
  ],
}

export const BUSINESS_RULE_SPEC: EntryListSpec<BusinessRule> = {
  singular: 'business rule',
  plural: 'business rules',
  addLabel: 'Add Business Rule',
  emptyText: 'No business rules recorded. Describe conditions the system must honour.',
  blank: blankBusinessRule,
  title: (item) => item.rule,
  columns: [
    {
      key: 'rule',
      label: 'Rule',
      kind: 'textarea',
      rows: 2,
      get: (i) => i.rule,
      set: (i, v) => ({ ...i, rule: v }),
      max: SI_LIMITS.entryRule,
      placeholder: 'Describe an operational rule or condition that the system must follow…',
    },
    {
      key: 'description',
      label: 'Description',
      kind: 'textarea',
      get: (i) => i.description,
      set: (i, v) => ({ ...i, description: v }),
      max: SI_LIMITS.entryDescription,
      placeholder: 'Exceptions, who enforces it, what happens when it is broken',
    },
  ],
}
