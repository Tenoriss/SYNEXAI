import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, TriangleAlert } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog'
import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { EmptyProjectsState } from '@/components/projects/EmptyProjectsState'
import { ProjectFilters, ClearFiltersButton } from '@/components/projects/ProjectFilters'
import { ProjectTable } from '@/components/projects/ProjectTable'
import { ProjectCardList } from '@/components/projects/ProjectCard'
import { draftToPatch } from '@/features/projects/validation'
import { countProjects, isQueryActive, parseQuery, queryProjects, writeQuery, type ProjectQuery } from '@/features/projects/query'
import { useProjects, useProjectActions } from '@/hooks/useProjects'
import { storageService } from '@/storage'
import { STORAGE_KEYS } from '@/storage/keys'
import type { Project } from '@/types/project'

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { status, sort } = useMemo(() => parseQuery(searchParams), [searchParams])
  // The search box is authoritative in local state (typing stays responsive);
  // the URL mirrors it so a filtered view can still be shared or reloaded.
  const [search, setSearch] = useState(() => parseQuery(searchParams).search)
  const query: ProjectQuery = { search, status, sort }
  const { projects, loading, error, reload } = useProjects()
  const actions = useProjectActions()
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const visible = useMemo(() => queryProjects(projects, query), [projects, search, status, sort])
  const counts = useMemo(() => ({ ...countProjects(projects), All: projects.length }), [projects])
  const filtersActive = isQueryActive(query)
  const issues = useMemo(
    () => (loading ? [] : storageService.getIssues().filter((i) => i.key === STORAGE_KEYS.projects)),
    [loading],
  )

  const update = (patch: Partial<ProjectQuery>) => {
    if ('search' in patch) setSearch(patch.search ?? '')
    const next = { ...query, ...patch }
    setSearchParams(writeQuery(next), { replace: true })
  }

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setPendingId(id)
    try {
      await fn()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage and analyze your information system projects."
        actions={
          <Link to="/projects/new" className="w-full sm:w-auto">
            <Button leftIcon={<Plus size={16} aria-hidden />} className="w-full justify-center" tabIndex={-1}>
              New Project
            </Button>
          </Link>
        }
      />

      {!storageService.persistent && (
        <p
          role="status"
          className="mb-6 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-small text-warning"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          LocalStorage is unavailable in this browser, so projects will not survive a reload. Enable site data or
          use a normal browser window.
        </p>
      )}

      {issues.length > 0 && (
        <p className="mb-6 flex flex-wrap items-center gap-2 rounded-md bg-warning-soft p-3 text-small text-warning">
          <TriangleAlert size={16} aria-hidden />
          Some stored project data could not be read and was set aside instead of deleted.
          <Link to="/settings" className="font-medium underline">
            Review local data
          </Link>
        </p>
      )}

      {error && (
        <Card className="mb-6 border-error/30">
          <EmptyState
            icon={<TriangleAlert size={22} aria-hidden />}
            title="Projects could not be read"
            description={error.message}
            action={
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            }
          />
        </Card>
      )}

      {(projects.length > 0 || filtersActive) && (
        <div className="mb-6">
          <ProjectFilters query={query} counts={counts} resultCount={visible.length} onChange={update} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading projects">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyProjectsState />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TriangleAlert size={22} aria-hidden />}
            title="No projects found"
            description="No project matches the current search and status filter. Stored projects are unchanged."
            action={<ClearFiltersButton
              onClear={() => {
                setSearch('')
                setSearchParams({}, { replace: true })
              }}
            />}
          />
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <ProjectTable
              projects={visible}
              pendingId={pendingId}
              actions={(project) => ({
                onEdit: () => setEditing(project),
                onDuplicate: () => void run(project.id, () => actions.duplicateProject(project)),
                onArchive: () => void run(project.id, () => actions.archiveProject(project)),
                onRestore: () => void run(project.id, () => actions.restoreProject(project)),
                onDelete: () => setDeleting(project),
              })}
            />
          </div>
          <div className="md:hidden">
            <ProjectCardList
              projects={visible}
              pendingId={pendingId}
              actions={(project) => ({
                onEdit: () => setEditing(project),
                onDuplicate: () => void run(project.id, () => actions.duplicateProject(project)),
                onArchive: () => void run(project.id, () => actions.archiveProject(project)),
                onRestore: () => void run(project.id, () => actions.restoreProject(project)),
                onDelete: () => setDeleting(project),
              })}
            />
          </div>
        </>
      )}

      <EditProjectDialog
        project={editing}
        open={editing !== null}
        busy={editing !== null && pendingId === editing.id}
        onCancel={() => setEditing(null)}
        onSubmit={(draft) => {
          if (!editing) return
          void run(editing.id, async () => {
            const next = await actions.updateProject(editing.id, draftToPatch(draft))
            if (next) setEditing(null)
          })
        }}
      />

      <DeleteProjectDialog
        project={deleting}
        open={deleting !== null}
        busy={deleting !== null && pendingId === deleting.id}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          void run(deleting.id, async () => {
            const ok = await actions.deleteProject(deleting)
            if (ok) setDeleting(null)
          })
        }}
      />
    </>
  )
}
