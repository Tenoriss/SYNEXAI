import type { ReactNode } from 'react'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { Card } from '@/components/ui'
import { sectionAnchorId } from '@/features/systemInformation/sections'
import type { SiSection } from '@/features/systemInformation/sections'
import { cn } from '@/utils/cn'

interface SectionCardProps {
  section: SiSection
  index: number
  complete: boolean
  /** One-line, data-derived status, e.g. "2 stakeholders, 1 user". */
  detail: string
  children: ReactNode
  /** Optional reassurance shown under the fields, e.g. what this phase does not do. */
  footnote?: ReactNode
}

/** One numbered block of the workspace, addressable from the section navigation. */
export function SectionCard({ section, index, complete, detail, children, footnote }: SectionCardProps) {
  const anchorId = sectionAnchorId(section.id)
  return (
    <section
      id={anchorId}
      aria-labelledby={`${anchorId}-title`}
      className="scroll-mt-24"
    >
      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <section.icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id={`${anchorId}-title`} className="flex items-center gap-2 text-body font-semibold text-fg">
                <span className="text-caption font-medium text-fg-muted tabular-nums">{index + 1}.</span>
                {section.label}
              </h2>
              <p className="mt-0.5 text-small text-fg-secondary">{section.summary}</p>
            </div>
          </div>
          {/* Meaning is carried by the icon + words, never by colour alone. */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption',
              complete
                ? 'border-transparent bg-success-soft text-success'
                : 'border-border bg-surface-muted text-fg-secondary',
            )}
          >
            {complete ? <CheckCircle2 size={14} aria-hidden /> : <CircleDashed size={14} aria-hidden />}
            {complete ? 'Information provided' : 'Not filled in yet'}
          </span>
        </div>

        <div className="grid gap-5">{children}</div>

        {footnote && <p className="mt-5 border-t border-border pt-4 text-caption text-fg-muted">{footnote}</p>}
        <span className="sr-only">{detail}</span>
      </Card>
    </section>
  )
}
