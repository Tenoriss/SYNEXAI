import { Link } from 'react-router-dom'
import { Bot, ClipboardList } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Skeleton } from '@/components/ui'
import { NOT_PROVIDED, type SystemInformationContent } from '@/types/systemInformation'
import { completedSections, filled, SI_STATUS_LABEL, summarise } from '@/features/systemInformation/completeness'
import { SI_SECTION_COUNT, SI_SECTIONS } from '@/features/systemInformation/sections'
import { systemInformationPath } from '@/features/systemInformation/paths'
import { analysisPath } from '@/features/analysis/paths'
import { useSystemInformationRecord } from '@/hooks/useSystemInformation'
import { useLatestAnalysis } from '@/hooks/useAnalysis'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

/** Lists whose size the overview reports, with the field that makes a row real. */
const COUNTS: { label: string; count: (content: SystemInformationContent) => number }[] = [
  { label: 'stakeholders', count: (c) => c.stakeholders.filter((i) => filled(i.name)).length },
  { label: 'users', count: (c) => c.users.filter((i) => filled(i.name)).length },
  { label: 'problems', count: (c) => c.problems.filter((i) => filled(i.title)).length },
  { label: 'technologies', count: (c) => c.technologies.filter((i) => filled(i.name)).length },
  { label: 'data entities', count: (c) => c.dataEntities.filter((i) => filled(i.name)).length },
  { label: 'business rules', count: (c) => c.businessRules.filter((i) => filled(i.rule)).length },
  { label: 'objectives', count: (c) => c.objectives.filter(filled).length },
]

/**
 * A project's system-information state on its overview page (spec §21). Every
 * figure here is read back from what the analyst stored; an absent value is
 * shown as "Not provided", never replaced with a plausible-looking default.
 */
export function SystemInformationCard({ projectId }: { projectId: string }) {
  const { record, content, loading } = useSystemInformationRecord(projectId)
  const { record: analysis, count: analysisCount } = useLatestAnalysis(projectId)
  const summary = summarise(record)
  const completed = content ? completedSections(content) : []
  const status = summary.status

  const cta =
    status === 'not-started' ? 'Start recording' : status === 'in-progress' ? 'Continue editing' : 'Review system information'

  return (
    <Card>
      <CardHeader
        title="System Information"
        description="Structured information about the system being analyzed, recorded by you."
        icon={<ClipboardList size={18} aria-hidden />}
        action={
          <Badge tone={status === 'complete' ? 'success' : status === 'in-progress' ? 'info' : 'neutral'}>
            {SI_STATUS_LABEL[status]}
          </Badge>
        }
      />

      {loading ? (
        <Skeleton className="h-36 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-small text-fg-secondary tabular-nums">
              {summary.sectionsProvided} of {SI_SECTION_COUNT} sections completed
            </p>
            {/* One mark per section — a count, not a percentage. */}
            <span className="flex items-center gap-1" aria-hidden>
              {SI_SECTIONS.map((section) => (
                <span
                  key={section.id}
                  className={cn(
                    'h-1.5 w-5 rounded-full',
                    completed.includes(section.id) ? 'bg-success' : 'bg-border-strong',
                  )}
                />
              ))}
            </span>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Meta label="System name" value={content?.systemName || NOT_PROVIDED} />
            <Meta label="System type" value={content?.systemType || NOT_PROVIDED} />
            <Meta label="Organization" value={content?.organization || NOT_PROVIDED} />
            <Meta label="Last saved" value={record ? formatRelativeTime(record.updatedAt) : NOT_PROVIDED} />
            <Meta label="System purpose" value={content?.systemPurpose || NOT_PROVIDED} wide clamp />
            <Meta label="Current process" value={content?.currentWorkflow || NOT_PROVIDED} wide clamp />
          </dl>

          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Entries recorded for this project">
            {COUNTS.map((entry) => {
              const count = content ? entry.count(content) : 0
              return (
                <li
                  key={entry.label}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-caption tabular-nums',
                    count > 0
                      ? 'border-border bg-surface-muted text-fg-secondary'
                      : 'border-dashed border-border-strong text-fg-muted',
                  )}
                >
                  {count} {entry.label}
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to={systemInformationPath(projectId)} className="min-w-0 flex-1">
              <Button variant={status === 'not-started' ? 'primary' : 'secondary'} className="w-full justify-center">
                {cta}
              </Button>
            </Link>
            <Link to={analysisPath(projectId)} className="min-w-0 flex-1">
              <Button
                variant={status === 'not-started' ? 'ghost' : 'primary'}
                className="w-full justify-center"
                leftIcon={<Bot size={16} aria-hidden />}
              >
                {analysis ? 'View System Understanding' : 'Analyze System'}
              </Button>
            </Link>
          </div>

          <p className="mt-3 text-caption text-fg-muted" role="status">
            {analysis
              ? `System understanding generated ${formatRelativeTime(analysis.meta.generatedAt)} by ${analysis.meta.provider}${analysis.meta.model ? ` (${analysis.meta.model})` : ''}${
                  analysisCount > 1 ? ` · ${analysisCount} runs stored` : ''
                }.`
              : 'No system understanding has been generated for this project yet.'}
          </p>
          <p className="mt-3 text-caption text-fg-muted">
            Nothing on this card is generated. Counts and status are derived from the record stored for this project in
            this browser.
          </p>
        </>
      )}
    </Card>
  )
}

function Meta({ label, value, wide, clamp }: { label: string; value: string; wide?: boolean; clamp?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-caption uppercase tracking-wider text-fg-muted">{label}</dt>
      <dd
        className={cn(
          'mt-1 break-words text-small text-fg',
          clamp && 'line-clamp-2',
          value === NOT_PROVIDED && 'text-fg-muted italic',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
