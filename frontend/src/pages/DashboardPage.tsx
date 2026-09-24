import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  FolderOpen,
  Plus,
  Search,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { countProjects, mostRecentlyUpdated } from '@/features/projects/query'
import { SI_STATUS_LABEL } from '@/features/systemInformation/completeness'
import { systemInformationPath } from '@/features/systemInformation/paths'
import { useStorageQuery } from '@/hooks/useStorage'
import { useSystemInformationSummaries } from '@/hooks/useSystemInformation'
import { storageService } from '@/storage'
import { formatRelativeTime } from '@/utils/format'
import { PROJECT_STATUSES, type Project } from '@/types/project'

interface DashboardData {
  projects: Project[]
  analysisVersions: number
  persistent: boolean
}

const WORKFLOW = [
  'Describe system',
  'System understanding',
  'PIECES analysis',
  'Requirements',
  'Process analysis',
  'Findings',
  'Recommendations',
  'Proposed system',
  'Diagrams',
  'Report',
]

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: number | undefined
  hint: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-small text-fg-secondary">
        <Icon size={16} aria-hidden />
        {label}
      </div>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-12" />
      ) : (
        <p className="mt-2 text-h2 text-fg tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-caption font-normal text-fg-muted">{hint}</p>
    </Card>
  )
}

export function DashboardPage() {
  const { data, loading, error, reload } = useStorageQuery<DashboardData>(
    async () => {
      const [projects, stats] = await Promise.all([storageService.getProjects(), storageService.getStats()])
      return { projects, analysisVersions: stats.analysisVersions, persistent: stats.persistent }
    },
    ['projects', 'analyses'],
  )

  const projects = data?.projects
  const { summaries } = useSystemInformationSummaries()
  const byStatus = countProjects(projects ?? [])
  // Real records only: a project counts as documented once anything was saved (spec §21).
  const documented = (projects ?? []).filter((p) => (summaries[p.id]?.sectionsProvided ?? 0) > 0).length
  const awaiting = (projects?.length ?? 0) - documented
  const recent = projects ? mostRecentlyUpdated(projects, 5) : []
  const hasProjects = (projects?.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Analyze, document and improve any information system with structured methodology and AI assistance."
        actions={
          <>
            <Link to="/projects/new">
              <Button leftIcon={<Plus size={16} aria-hidden />} className="w-full justify-center sm:w-auto" tabIndex={-1}>
                New Project
              </Button>
            </Link>
            <Link to="/projects">
              <Button variant="secondary" className="w-full justify-center sm:w-auto" tabIndex={-1}>
                View Projects
              </Button>
            </Link>
          </>
        }
      />

      {!loading && !data?.persistent && (
        <p className="mb-6 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-small text-warning">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          This browser is not saving local data, so anything you create now will disappear on reload.
        </p>
      )}

      {error && (
        <Card className="mb-6 border-error/30">
          <EmptyState
            icon={<TriangleAlert size={22} aria-hidden />}
            title="Workspace data could not be read"
            description={error.message}
            action={
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            }
          />
        </Card>
      )}

      {/* Every number below counts real projects — never a placeholder value (spec §19). */}
      <section aria-label="Workspace statistics" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={projects?.length}
          hint="Stored in this browser only"
        />
        <StatCard
          icon={Activity}
          label="Active Analyses"
          value={byStatus.Analyzing}
          hint="Projects you marked Analyzing"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Analyses"
          value={byStatus.Completed}
          hint="Projects you marked Completed"
        />
        <StatCard
          icon={Search}
          label="Needs Review"
          value={byStatus['Needs Review']}
          hint="Analyses waiting on your review"
        />
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Projects"
            icon={<FolderOpen size={18} aria-hidden />}
            action={
              hasProjects && (
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 rounded-sm text-small font-medium text-primary hover:underline"
                >
                  View all <ArrowRight size={14} aria-hidden />
                </Link>
              )
            }
          />
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : hasProjects ? (
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link to={`/projects/${p.id}`} className="truncate rounded-sm font-medium text-fg hover:text-primary hover:underline">
                      {p.name}
                    </Link>
                    <p className="truncate text-small text-fg-muted">
                      {[p.systemType, p.organization].filter(Boolean).join(' · ') || 'No system type yet'} ·
                      updated {formatRelativeTime(p.updatedAt)}
                    </p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FolderKanban size={22} aria-hidden />}
              title="No projects yet"
              description="Create your first system analysis project to begin understanding, analyzing, and improving an information system."
              action={
                <Link to="/projects/new">
                  <Button leftIcon={<Plus size={16} aria-hidden />} className="w-full justify-center sm:w-auto" tabIndex={-1}>
                    Create Project
                  </Button>
                </Link>
              }
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="System information"
              icon={<ClipboardList size={18} aria-hidden />}
              description="Structured input each project has to record before any analysis."
              action={<Badge tone={documented > 0 ? 'info' : 'neutral'}>{documented} of {projects?.length ?? 0} documented</Badge>}
            />
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : hasProjects ? (
              <>
                <ul className="space-y-2.5">
                  {recent.map((p) => {
                    const summary = summaries[p.id]
                    const status = summary?.status ?? 'not-started'
                    return (
                      <li key={p.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={systemInformationPath(p.id)}
                            className="block truncate rounded-sm text-small font-medium text-fg hover:text-primary hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-caption text-fg-muted tabular-nums">
                            {summary
                              ? `${summary.sectionsProvided} of ${summary.sectionCount} sections completed`
                              : `0 of 9 sections completed`}
                          </p>
                        </div>
                        <Badge tone={status === 'complete' ? 'success' : status === 'in-progress' ? 'info' : 'neutral'}>
                          {SI_STATUS_LABEL[status]}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 border-t border-border pt-3 text-caption text-fg-muted">
                  {awaiting} {awaiting === 1 ? 'project is' : 'projects are'} awaiting system information input. Counts
                  are read from stored records for all projects in this browser, archived ones included.
                </p>
              </>
            ) : (
              <p className="text-small text-fg-secondary">
                No projects yet — system information is recorded per project, so there is nothing to count.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Status breakdown"
              icon={<FolderKanban size={18} aria-hidden />}
              description="Counts of your own projects by status."
            />
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : hasProjects ? (
              <ul className="space-y-2">
                {PROJECT_STATUSES.map((status) => (
                  <li key={status} className="flex items-center justify-between gap-3">
                    <ProjectStatusBadge status={status} />
                    <span className="text-small font-medium text-fg tabular-nums">{byStatus[status]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-fg-secondary">
                Nothing to count yet. Statuses appear once you create a project.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent Findings"
              icon={<Search size={18} aria-hidden />}
              action={<Badge>Phase 6</Badge>}
            />
            <p className="text-small text-fg-secondary">
              {data?.analysisVersions
                ? `${data.analysisVersions} saved analysis version${data.analysisVersions === 1 ? '' : 's'} in this browser.`
                : 'No analysis versions stored yet.'}{' '}
              Findings appear after an analysis is completed, each linked to evidence, a PIECES dimension and a
              recommendation.
            </p>
          </Card>

          <Card className="bg-primary-soft/40">
            <CardHeader title="Recent AI Insights" icon={<Sparkles size={18} aria-hidden />} action={<Badge>Phase 4</Badge>} />
            <p className="text-small text-fg-secondary">
              No insights yet. SYNEX AI only reports what your system description supports and labels assumptions and
              missing information explicitly.
            </p>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Analysis workflow" description="Every project follows the same structured path." as="h2" />
        <ol className="flex flex-wrap gap-2">
          {WORKFLOW.map((step, i) => (
            <li
              key={step}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-small text-fg-secondary"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-caption text-fg-muted tabular-nums">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
