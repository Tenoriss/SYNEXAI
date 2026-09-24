import { CircleAlert, CircleDashed, CloudUpload } from 'lucide-react'
import type { SaveState } from '@/hooks/useSystemInformation'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

interface SaveStatusProps {
  state: SaveState
  dirty: boolean
  savedAt: string | null
  error: string | null
  ready: boolean
}

/** Subtle persistence state for the auto-save loop (spec §20). */
export function SaveStatus({ state, dirty, savedAt, error, ready }: SaveStatusProps) {
  if (!ready) return null

  let icon = <CircleDashed size={14} aria-hidden />
  let tone = 'text-fg-muted'
  let label = savedAt ? `Saved ${formatRelativeTime(savedAt)}` : 'Nothing saved yet'

  if (state === 'saving') {
    icon = <CloudUpload size={14} aria-hidden className="animate-pulse" />
    tone = 'text-info'
    label = 'Saving…'
  } else if (state === 'saved' && !dirty) {
    icon = <CloudUpload size={14} aria-hidden />
    tone = 'text-success'
    label = savedAt ? `Saved ${formatRelativeTime(savedAt)}` : 'Saved'
  } else if (dirty) {
    icon = <CircleDashed size={14} aria-hidden />
    tone = 'text-warning'
    label = 'Unsaved changes'
  }
  if (state === 'error') {
    icon = <CircleAlert size={14} aria-hidden />
    tone = 'text-error'
    label = error ?? 'Not saved'
  }

  return (
    <p role="status" aria-live="polite" className={cn('flex items-center gap-1.5 text-caption', tone)}>
      {icon}
      {label}
    </p>
  )
}
