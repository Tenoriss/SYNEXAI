import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Fingerprint, Save, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, Dialog, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { CompletenessIndicator } from '@/components/systemInformation/CompletenessIndicator'
import { SaveStatus } from '@/components/systemInformation/SaveStatus'
import { SectionNavigation } from '@/components/systemInformation/SectionNavigation'
import { SystemInformationForm } from '@/components/systemInformation/SystemInformationForm'
import type { SiController } from '@/components/systemInformation/shared'
import { STORAGE_KEYS, storageService } from '@/storage'
import { projectPath } from '@/features/projects/paths'
import { emptyContent, type Prefill } from '@/features/systemInformation/draft'
import { completedSections, SI_STATUS_LABEL } from '@/features/systemInformation/completeness'
import { MISSING_FIELD_SECTION } from '@/features/systemInformation/validation'
import { SI_SECTIONS, sectionAnchorId } from '@/features/systemInformation/sections'
import { formatRelativeTime } from '@/utils/format'
import type { SiSectionId, SystemInformationErrors } from '@/types/systemInformation'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { useProject } from '@/hooks/useProjects'
import { useSystemInformationDraft } from '@/hooks/useSystemInformation'

/** Where to put the caret for each required field, so a failed save lands on the cause. */
const FIELD_CONTROL: Partial<Record<keyof SystemInformationErrors, string>> = {
  systemName: 'si-systemName',
  systemPurpose: 'si-systemPurpose',
  systemType: 'si-system-type',
}

/**
 * The System Information workspace (spec §7–§22): nine sections, debounced
 * auto-save, explicit saving, inline validation on the three required fields
 * and a completeness read-out derived from what is actually stored.
 */
export function SystemInformationPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { project, loading: projectLoading, missing, error: projectError } = useProject(projectId)

  // Only the user's own project fields are copied in, and only on first open (spec §9).
  const prefill = useMemo<Prefill>(
    () => ({ systemType: project?.systemType ?? '', organization: project?.organization ?? '' }),
    [project?.systemType, project?.organization],
  )
  const draft = useSystemInformationDraft(projectId ?? '', prefill, projectLoading)
  const [busy, setBusy] = useState(false)

  const si: SiController = useMemo(
    () => ({ content: draft.content ?? emptyContent(), errors: draft.shownErrors, setField: draft.setField }),
    [draft.content, draft.shownErrors, draft.setField],
  )

  const anchors = useMemo(() => SI_SECTIONS.map((section) => sectionAnchorId(section.id)), [])
  const activeId = useActiveSection(anchors, draft.ready)

  const jump = useCallback(
    (sectionId: string) => {
      const section: SiSectionId | undefined = SI_SECTIONS.find((candidate) => candidate.id === sectionId)?.id
      if (!section) return
      document.getElementById(sectionAnchorId(section))?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [reduce],
  )

  const completed = useMemo(() => (draft.content ? completedSections(draft.content) : []), [draft.content])

  const flush = useCallback(async () => {
    if (!draft.dirty) return true
    return draft.saveDraft()
  }, [draft.dirty, draft.saveDraft])

  const guard = useNavigationGuard(draft.dirty, flush)

  const handleSaveDraft = useCallback(async () => {
    setBusy(true)
    await draft.saveDraft()
    setBusy(false)
  }, [draft])

  const handleContinue = useCallback(async () => {
    setBusy(true)
    const result = await draft.saveAndContinue()
    setBusy(false)
    if (result.ok) {
      if (projectId) navigate(projectPath(projectId))
      return
    }
    // Required input is missing: go to the first cause instead of navigating away.
    const [first] = Object.keys(result.errors) as (keyof SystemInformationErrors)[]
    const control = first ? document.getElementById(FIELD_CONTROL[first] ?? '') : null
    control?.focus({ preventScroll: true })
    jump((first && MISSING_FIELD_SECTION[first]) || 'overview')
  }, [draft, jump, navigate, projectId])

  if (projectLoading || !draft.ready) {
    return (
      <>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-56" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            {SI_SECTIONS.map((section) => (
              <Skeleton key={section.id} className="h-64 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full lg:sticky lg:top-20 lg:self-start" />
        </div>
      </>
    )
  }

  if (missing || !project || !projectId) {
    return (
      <>
        <BackLink projectId={projectId} name={project?.name} />
        <Card>
          <EmptyState
            icon={<Fingerprint size={22} aria-hidden />}
            title="Project not found"
            description={
              projectError
                ? projectError.message
                : 'System information belongs to a project, and this project is not stored in this browser. Nothing was created or changed.'
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

  const issues = storageService.getIssues().filter((issue) => issue.key === STORAGE_KEYS.systemInformation)

  return (
    <>
      <BackLink projectId={projectId} name={project.name} />

      <PageHeader
        title="System Information"
        description="Structured information about the system being analyzed. Everything on this page is your input — SYNEX AI stores what you write and never fills a field for you."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatus
              state={draft.saveState}
              dirty={draft.dirty}
              savedAt={draft.savedAt}
              error={draft.saveError}
              ready={draft.ready}
            />
            <Button variant="secondary" leftIcon={<Save size={16} aria-hidden />} disabled={busy} onClick={() => void handleSaveDraft()}>
              Save Draft
            </Button>
            <Button leftIcon={<ArrowRight size={16} aria-hidden />} loading={busy} onClick={() => void handleContinue()}>
              Save &amp; Continue
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-fg-secondary">
        <Badge tone={draft.summary.status === 'complete' ? 'success' : draft.summary.status === 'in-progress' ? 'info' : 'neutral'}>
          {SI_STATUS_LABEL[draft.summary.status]}
        </Badge>
        <span>
          Project <span className="font-medium text-fg">{project.name}</span>
        </span>
        {draft.savedAt && <span className="text-fg-muted">Last saved {formatRelativeTime(draft.savedAt)}</span>}
      </div>

      {!storageService.persistent && (
        <p
          role="status"
          className="mb-6 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-small text-warning"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          LocalStorage is unavailable in this browser, so auto-save cannot keep your input across a reload. Use a
          normal browser window, or export your notes elsewhere before you continue.
        </p>
      )}

      {issues.length > 0 && (
        <p className="mb-6 flex flex-wrap items-center gap-2 rounded-md bg-warning-soft p-3 text-small text-warning">
          <TriangleAlert size={16} aria-hidden />
          A stored system-information record could not be read and was set aside instead of deleted — what you see now
          is a fresh draft.
          <Link to="/settings" className="font-medium underline">
            Review local data
          </Link>
        </p>
      )}

      {draft.loadError && (
        <p className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-error/30 bg-error-soft p-3 text-small text-error">
          <TriangleAlert size={16} aria-hidden />
          The stored system information could not be opened: {draft.loadError.message}
        </p>
      )}

      {/* On small screens the rail comes first: it is how an analyst moves around a nine-section page. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* `min-w-0` keeps the rail's scrollable chip row from widening the whole grid on small screens. */}
        <div className="min-w-0 space-y-4 lg:order-2">
          <div className="min-w-0 lg:sticky lg:top-20 lg:space-y-4">
            <SectionNavigation content={draft.content} activeId={activeId} onJump={jump} />
            <CompletenessIndicator content={draft.content} summary={draft.summary} onJump={jump} />
          </div>
        </div>

        <div className="min-w-0 lg:order-1">
          <SystemInformationForm si={si} content={draft.content} completed={completed} />
        </div>
      </div>

      <Dialog
        open={guard.blocked}
        onClose={guard.stay}
        title="Leave without saving?"
        description="You have unsaved changes. Leaving now keeps only what was already saved to this browser."
        footer={
          <>
            <Button variant="secondary" onClick={guard.stay}>
              Stay
            </Button>
            <Button variant="destructive" onClick={guard.proceed}>
              Leave
            </Button>
          </>
        }
      />
    </>
  )
}

function BackLink({ projectId, name }: { projectId?: string; name?: string }) {
  return (
    <Link
      to={projectId ? projectPath(projectId) : '/projects'}
      className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-small font-medium text-fg-secondary hover:text-fg"
    >
      <ArrowLeft size={15} aria-hidden />
      {name ? `Back to ${name}` : 'Back to project'}
    </Link>
  )
}
