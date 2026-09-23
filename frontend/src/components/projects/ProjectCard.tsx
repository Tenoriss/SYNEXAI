import { Link } from 'react-router-dom'
import { Building2, Layers } from 'lucide-react'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectActions, type ProjectActionHandlers } from './ProjectActions'
import { type ProjectListProps } from './ProjectTable'
import { projectPath } from '@/features/projects/paths'
import { formatRelativeTime } from '@/utils/format'
import type { Project } from '@/types/project'

/** Mobile / tablet layout for the same list (spec §7, §22). */
export function ProjectCardList({ projects, pendingId, actions }: ProjectListProps) {
  return (
    <ul className="grid gap-3">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} pending={pendingId === project.id} handlers={actions(project)} />
        </li>
      ))}
    </ul>
  )
}

export function ProjectCard({
  project,
  pending,
  handlers,
}: {
  project: Project
  pending: boolean
  handlers: Omit<ProjectActionHandlers, 'pending'>
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-xs transition-colors duration-[120ms] hover:border-border-strong focus-within:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-semibold text-fg">
            <Link to={projectPath(project.id)} className="rounded-sm hover:text-primary hover:underline">
              {project.name}
            </Link>
          </h3>
          <div className="mt-1.5">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        <p className="shrink-0 text-caption text-fg-muted">{formatRelativeTime(project.updatedAt)}</p>
      </div>

      {project.description && (
        <p className="mt-3 line-clamp-2 text-small text-fg-secondary">{project.description}</p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-fg-secondary">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">System type</dt>
          <Layers size={14} aria-hidden className="text-fg-muted" />
          <dd className="font-medium text-fg">{project.systemType || 'No system type'}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Organization</dt>
          <Building2 size={14} aria-hidden className="text-fg-muted" />
          <dd>{project.organization || 'No organization'}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        {pending && (
          <span className="text-caption text-fg-muted tabular-nums" role="status">
            Saving…
          </span>
        )}
        <ProjectActions project={project} handlers={{ ...handlers, pending }} />
      </div>
    </article>
  )
}
