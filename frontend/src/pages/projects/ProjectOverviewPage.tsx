import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarClock, Copy, Fingerprint, Lock, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, SelectInput, Skeleton } from '@/components/ui'
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog'
import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { ProjectStatusBadge, STATUS_META } from '@/components/projects/ProjectStatusBadge'
import { SystemInformationCard } from '@/components/projects/SystemInformationCard'
import { PROJECT_MODULES } from '@/data/projectModules'
import { draftToPatch } from '@/features/projects/validation'
import { projectPath } from '@/features/projects/paths'
import { useProject, useProjectActions } from '@/hooks/useProjects'
import { formatDateTime, formatRelativeTime } from '@/utils/format'
import { PROJECT_STATUSES, type ProjectStatus } from '@/types/project'
import { cn } from '@/utils/cn'

export function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { project, loading, missing, error } = useProject(projectId)
  const actions = useProjectActions()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pending, setPending] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    if (pending) return
    setPending(true)
    try {
      await fn()
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full" />
        <Skeleton className="mt-6 h-56 w-full" />
      </>
    )
  }

  if (missing || !project) {
    return (
      <>
        <BackLink />
        <Card>
          <EmptyState
            icon={<Fingerprint size={22} aria-hidden />}
            title="Project not found"
            description={
              error
                ? error.message
                : 'The project may have been deleted, or the link may be invalid. Nothing else was changed.'
            }
            action={
              <Link to="/projects">
                <Button variant="secondary" leftIcon={<ArrowLeft size={16} aria-hidden />} tabIndex={-1}>
                  Back to Projects
                </Button>
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  const archived = project.status === 'Archived'

  return (
    <>
      <BackLink />

      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<Pencil size={16} aria-hidden />}
              onClick={() => setEditing(true)}
              disabled={pending}
            >
              Edit
            </Button>
            {archived ? (
              <Button variant="secondary" loading={pending} onClick={() => void run(() => actions.restoreProject(project))}>
                Restore from archive
              </Button>
            ) : (
              <Button variant="secondary" loading={pending} onClick={() => void run(() => actions.archiveProject(project))}>
                Archive
              </Button>
            )}
            <Button
              variant="ghost"
              leftIcon={<Trash2 size={16} aria-hidden />}
              className="text-error hover:bg-error-soft hover:text-error"
              onClick={() => setDeleting(true)}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Project details"
              description="Everything below is text you entered. No field is generated."
              icon={<Building2 size={18} aria-hidden />}
            />
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Meta label="System type" value={project.systemType || 'Not specified'} />
              <Meta label="Organization" value={project.organization || 'Not specified'} />
              <Meta label="Analyst" value={project.analyst || 'Not assigned'} />
              <Meta label="Project ID" value={project.id} mono />
              <Meta label="Created" value={formatDateTime(project.createdAt)} />
              <Meta label="Last updated" value={`${formatDateTime(project.updatedAt)} · ${formatRelativeTime(project.updatedAt)}`} />
            </dl>

            <div className="mt-6 border-t border-border pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProjectStatusBadge status={project.status} />
                  <p className="text-small text-fg-secondary">{STATUS_META[project.status].hint}</p>
                </div>
                <label
                  className="flex items-center gap-2 whitespace-nowrap text-small text-fg-secondary"
                  htmlFor={`${project.id}-status`}
                >
                  Status
                  <SelectInput
                    id={`${project.id}-status`}
                    className="h-10 w-[170px]"
                    value={project.status}
                    disabled={pending}
                    onChange={(e) => void run(() => actions.setStatus(project, e.target.value as ProjectStatus))}
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectInput>
                </label>
              </div>
              <p className="mt-3 text-caption text-fg-muted">
                Status is set by you. SYNEX AI never marks a project Completed without a real completed analysis.
              </p>
            </div>
          </Card>

          <SystemInformationCard projectId={project.id} />

          <Card>
            <CardHeader
              title="Analysis modules"
              description="Modules become available as the phases land. System understanding is available now; the rest stay empty until their phase builds them."
              icon={<CalendarClock size={18} aria-hidden />}
              action={
                <Badge icon={<Lock size={14} aria-hidden />}>
                  {PROJECT_MODULES.filter((module) => module.to).length} of {PROJECT_MODULES.length} available
                </Badge>
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {PROJECT_MODULES.map((module) => {
                const href = module.to?.(project.id)
                return (
                  <li
                    key={module.label}
                    aria-disabled={href ? undefined : 'true'}
                    className={cn(
                      'flex items-start gap-3 rounded-md border p-4',
                      href
                        ? 'border-border-strong bg-surface text-fg-secondary transition-colors hover:border-primary hover:bg-primary-soft/30'
                        : 'border-border bg-surface-muted/50 text-fg-secondary',
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-fg-muted">
                      <module.icon size={18} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-small font-semibold text-fg">
                        {href ? (
                          <Link to={href} className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-primary">
                            {module.label}
                          </Link>
                        ) : (
                          module.label
                        )}
                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-medium text-fg-muted">
                          Phase {module.phase}
                        </span>
                      </p>
                      <p className="mt-0.5 text-caption text-fg-muted">{module.description}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Local data" icon={<Fingerprint size={18} aria-hidden />} as="h2" />
            <p className="text-small text-fg-secondary">
              This project is stored in your browser under{' '}
              <code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-caption">synex_projects</code>.
              Clearing site data removes it.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full justify-center border border-border-strong"
              leftIcon={<Copy size={14} aria-hidden />}
              disabled={pending}
              onClick={() => void run(async () => {
                const copy = await actions.duplicateProject(project)
                if (copy) navigate(projectPath(copy.id))
              })}
            >
              Duplicate project
            </Button>
          </Card>

          <Card className="bg-surface-muted/60">
            <h2 className="text-body font-semibold text-fg">Ready for analysis</h2>
            <p className="mt-1 text-small text-fg-secondary">
              Phase 3 turns this description into a structured system-understanding input. Nothing runs yet — your
              text is exactly what future analyses will be traced back to.
            </p>
          </Card>
        </div>
      </div>

      <EditProjectDialog
        open={editing}
        project={project}
        busy={pending}
        onCancel={() => setEditing(false)}
        onSubmit={(draft) =>
          void run(async () => {
            const next = await actions.updateProject(project.id, draftToPatch(draft))
            if (next) setEditing(false)
          })
        }
      />

      <DeleteProjectDialog
        open={deleting}
        project={project}
        busy={pending}
        onCancel={() => setDeleting(false)}
        onConfirm={() =>
          void run(async () => {
            const ok = await actions.deleteProject(project)
            if (ok) navigate('/projects')
          })
        }
      />
    </>
  )
}

function BackLink() {
  return (
    <Link
      to="/projects"
      className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-small font-medium text-fg-secondary hover:text-fg"
    >
      <ArrowLeft size={15} aria-hidden />
      All projects
    </Link>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase tracking-wider text-fg-muted">{label}</dt>
      <dd className={cn('mt-1 break-words text-small text-fg', mono && 'font-mono text-caption text-fg-secondary')}>
        {value}
      </dd>
    </div>
  )
}
