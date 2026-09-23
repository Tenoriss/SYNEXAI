import { Archive, Activity, CheckCircle2, CircleDashed, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui'
import type { ProjectStatus } from '@/types/project'

/**
 * Status is always conveyed with icon + text, never colour alone (spec §23).
 * The wording also explains what each status means for the project (§20).
 */
export const STATUS_META: Record<ProjectStatus, { tone: BadgeTone; icon: LucideIcon; hint: string }> = {
  Draft: { tone: 'neutral', icon: CircleDashed, hint: 'Created, but no analysis has been run yet.' },
  Analyzing: { tone: 'info', icon: Activity, hint: 'An analysis is currently in progress.' },
  Completed: { tone: 'success', icon: CheckCircle2, hint: 'Analysis completed.' },
  'Needs Review': { tone: 'warning', icon: TriangleAlert, hint: 'Results exist but need analyst review.' },
  Archived: { tone: 'neutral', icon: Archive, hint: 'Archived and kept for reference.' },
}

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} icon={<Icon size={14} aria-hidden />} className={className}>
      {status}
    </Badge>
  )
}
