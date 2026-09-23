import { PROJECT_STATUSES, type Project, type ProjectStatus } from '@/types/project'
import { isOneOf } from '@/utils/guards'

/**
 * Search, filter, sort and count rules for projects (spec §14, §15, §19).
 * Pure functions so the behaviour is testable and never mutates stored data.
 */

export const ALL = 'All'
export const PROJECT_STATUS_FILTERS = [ALL, ...PROJECT_STATUSES] as const
export type ProjectStatusFilter = (typeof PROJECT_STATUS_FILTERS)[number]

export const PROJECT_SORTS = ['updated', 'created', 'name', 'status'] as const
export type ProjectSort = (typeof PROJECT_SORTS)[number]

export const SORT_LABELS: Record<ProjectSort, string> = {
  updated: 'Last updated',
  created: 'Date created',
  name: 'Project name',
  status: 'Status',
}

export interface ProjectQuery {
  search: string
  status: ProjectStatusFilter
  sort: ProjectSort
}

export const DEFAULT_QUERY: ProjectQuery = { search: '', status: ALL, sort: 'updated' }

/** Fields searched: name, description, system type, organization (spec §14). */
function haystack(project: Project): string {
  return [project.name, project.description, project.systemType, project.organization].join(' \u0000 ').toLowerCase()
}

export function splitSearchTerms(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function matchesSearch(project: Project, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const text = haystack(project)
  return terms.every((term) => text.includes(term))
}

export function matchesStatus(project: Project, filter: ProjectStatusFilter): boolean {
  return filter === ALL || project.status === filter
}

export function queryProjects(projects: readonly Project[], query: ProjectQuery): Project[] {
  const terms = splitSearchTerms(query.search)
  return projects
    .filter((p) => matchesStatus(p, query.status) && matchesSearch(p, terms))
    .sort((a, b) => compare(a, b, query.sort))
}

function compare(a: Project, b: Project, sort: ProjectSort): number {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    case 'created':
      return b.createdAt.localeCompare(a.createdAt) || b.updatedAt.localeCompare(a.updatedAt)
    case 'status':
      return PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status) || a.name.localeCompare(b.name)
    case 'updated':
      return b.updatedAt.localeCompare(a.updatedAt)
  }
}

export function mostRecentlyUpdated(projects: readonly Project[], limit: number): Project[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit)
}

export function countProjects(projects: readonly Project[]): Record<ProjectStatus, number> {
  return PROJECT_STATUSES.reduce(
    (acc, status) => {
      acc[status] = projects.filter((p) => p.status === status).length
      return acc
    },
    {} as Record<ProjectStatus, number>,
  )
}

/** URL <-> query state, so search/filter are shareable and survive a reload. */
export function parseQuery(params: URLSearchParams): ProjectQuery {
  const status = params.get('status')
  const sort = params.get('sort')
  const search = params.get('q')
  return {
    search: search ?? '',
    status: isOneOf(PROJECT_STATUS_FILTERS, status) ? status : ALL,
    sort: isOneOf(PROJECT_SORTS, sort) ? sort : DEFAULT_QUERY.sort,
  }
}

export function writeQuery(query: ProjectQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (query.search.trim()) out.q = query.search.trim()
  if (query.status !== ALL) out.status = query.status
  if (query.sort !== DEFAULT_QUERY.sort) out.sort = query.sort
  return out
}

/** True when a filter hides results — lets the UI distinguish "no projects" from "no matches". */
export function isQueryActive(query: ProjectQuery): boolean {
  return query.search.trim().length > 0 || query.status !== ALL
}
