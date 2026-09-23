import { Link, useNavigate } from 'react-router-dom'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectActions, type ProjectActionHandlers } from './ProjectActions'
import { projectPath } from '@/features/projects/paths'
import { formatDateTime, formatRelativeTime } from '@/utils/format'
import type { Project } from '@/types/project'

export interface ProjectListProps {
  projects: Project[]
  pendingId: string | null
  /** Builds the row actions for one project. */
  actions: (project: Project) => Omit<ProjectActionHandlers, 'pending'>
}

function fallback(value: string): string {
  return value.trim() ? value : '—'
}

/** Desktop table (spec §7). Below `md` the same data renders as cards. */
export function ProjectTable({ projects, pendingId, actions }: ProjectListProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <caption className="sr-only">
          Your projects. Select a project name to open its overview.
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted/60 text-caption uppercase tracking-wider text-fg-muted">
            <th scope="col" className="px-4 py-3 font-medium">Project</th>
            <th scope="col" className="px-4 py-3 font-medium">System Type</th>
            <th scope="col" className="px-4 py-3 font-medium">Organization</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Last Updated</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => navigate(projectPath(project.id))}
              className="cursor-pointer border-b border-border transition-colors duration-[120ms] last:border-0 hover:bg-surface-muted/50 focus-within:bg-surface-muted/50"
            >
              <th scope="row" className="max-w-[320px] px-4 py-3 font-normal">
                <Link
                  to={projectPath(project.id)}
                  className="font-medium text-fg hover:text-primary hover:underline"
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="mt-0.5 line-clamp-2 text-small text-fg-muted">{project.description}</p>
                )}
              </th>
              <td className="px-4 py-3 text-fg-secondary">{fallback(project.systemType)}</td>
              <td className="px-4 py-3 text-fg-secondary">{fallback(project.organization)}</td>
              <td className="px-4 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-fg-secondary" title={formatDateTime(project.updatedAt)}>
                {formatRelativeTime(project.updatedAt)}
              </td>
              <td className="px-2 py-2 text-right align-middle">
                <ProjectActions
                  project={project}
                  handlers={{ ...actions(project), pending: pendingId === project.id }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
