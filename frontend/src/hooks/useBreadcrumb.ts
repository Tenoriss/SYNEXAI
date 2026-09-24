import { matchPath, useLocation } from 'react-router-dom'
import { findNavItem } from '@/data/navigation'
import { projectPath } from '@/features/projects/paths'
import { useProject } from './useProjects'

export interface Crumb {
  label: string
  /** Absent on the last crumb — the page you are already on. */
  to?: string
}

/** Breadcrumb for the header, including the open project's name (spec §18). */
export function useBreadcrumb(): Crumb[] {
  const { pathname } = useLocation()
  /** Nested project screens are matched first so the project stays one crumb deep. */
  const systemMatch = matchPath({ path: '/projects/:projectId/system', end: true }, pathname)
  const analysisMatch = matchPath({ path: '/projects/:projectId/analysis', end: true }, pathname)
  const match = systemMatch ?? analysisMatch ?? matchPath({ path: '/projects/:projectId', end: true }, pathname)
  const paramId = match?.params.projectId
  const projectId = paramId && paramId !== 'new' ? paramId : undefined
  const { project } = useProject(projectId)

  if (pathname === '/') return [{ label: 'Workspace', to: '/' }, { label: 'Dashboard' }]

  if (pathname.startsWith('/projects')) {
    if (pathname === '/projects') return [{ label: 'Workspace', to: '/' }, { label: 'Projects' }]
    if (pathname === '/projects/new')
      return [{ label: 'Workspace', to: '/' }, { label: 'Projects', to: '/projects' }, { label: 'New Project' }]
    const projectName = { label: project?.name ?? 'Project', to: projectId ? projectPath(projectId) : undefined }
    if (systemMatch || analysisMatch) {
      return [
        { label: 'Workspace', to: '/' },
        { label: 'Projects', to: '/projects' },
        projectId ? projectName : { label: 'Project' },
        { label: analysisMatch ? 'System Understanding' : 'System Information' },
      ]
    }
    return [{ label: 'Workspace', to: '/' }, { label: 'Projects', to: '/projects' }, { label: project?.name ?? 'Project' }]
  }

  const nav = findNavItem(pathname)
  if (nav) return [{ label: 'Workspace', to: '/' }, { label: nav.label }]
  return [{ label: 'Workspace', to: '/' }, { label: 'Not found' }]
}
