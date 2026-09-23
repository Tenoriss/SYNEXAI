import { matchPath, useLocation } from 'react-router-dom'
import { findNavItem } from '@/data/navigation'
import { useProject } from './useProjects'

export interface Crumb {
  label: string
  /** Absent on the last crumb — the page you are already on. */
  to?: string
}

/** Breadcrumb for the header, including the open project's name (spec §18). */
export function useBreadcrumb(): Crumb[] {
  const { pathname } = useLocation()
  const match = matchPath({ path: '/projects/:projectId', end: true }, pathname)
  const paramId = match?.params.projectId
  const projectId = paramId && paramId !== 'new' ? paramId : undefined
  const { project } = useProject(projectId)

  if (pathname === '/') return [{ label: 'Workspace', to: '/' }, { label: 'Dashboard' }]

  if (pathname.startsWith('/projects')) {
    if (pathname === '/projects') return [{ label: 'Workspace', to: '/' }, { label: 'Projects' }]
    if (pathname === '/projects/new')
      return [{ label: 'Workspace', to: '/' }, { label: 'Projects', to: '/projects' }, { label: 'New Project' }]
    return [{ label: 'Workspace', to: '/' }, { label: 'Projects', to: '/projects' }, { label: project?.name ?? 'Project' }]
  }

  const nav = findNavItem(pathname)
  if (nav) return [{ label: 'Workspace', to: '/' }, { label: nav.label }]
  return [{ label: 'Workspace', to: '/' }, { label: 'Not found' }]
}
