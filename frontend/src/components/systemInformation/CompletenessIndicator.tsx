import { SI_SECTIONS } from '@/features/systemInformation/sections'
import { isSectionComplete } from '@/features/systemInformation/completeness'
import type { SystemInformationContent, SystemInformationSummary } from '@/types/systemInformation'
import { cn } from '@/utils/cn'

interface CompletenessIndicatorProps {
  content: SystemInformationContent | null
  summary: SystemInformationSummary
  /** When absent every section is reported from the draft alone. */
  onJump?: (sectionId: string) => void
}

/**
 * How much of the analyst's input exists (spec §23). Deliberately worded as
 * "sections with information" — it is not AI analysis progress, and it never
 * counts a section until real content is there.
 */
export function CompletenessIndicator({ content, summary, onJump }: CompletenessIndicatorProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-small font-semibold text-fg">Sections with information</h2>
        <p className="text-caption text-fg-secondary tabular-nums">
          {summary.sectionsProvided} of {summary.sectionCount} sections completed
        </p>
      </div>

      <ul className="mt-3 hidden flex-wrap gap-1.5 lg:flex" aria-label="Section completeness">
        {SI_SECTIONS.map((section) => {
          const complete = content ? isSectionComplete(content, section.id) : false
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onJump?.(section.id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium transition-colors duration-[120ms]',
                  complete
                    ? 'border-transparent bg-success-soft text-success'
                    : 'border-border bg-surface-muted text-fg-secondary hover:border-border-strong hover:text-fg',
                )}
                aria-label={`${section.label}: ${complete ? 'information provided' : 'not filled in yet'}`}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', complete ? 'bg-success' : 'bg-border-strong')}
                  aria-hidden
                />
                {section.label}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-caption text-fg-muted">
        Counts the information you have supplied. It is not analysis progress, and nothing is marked complete on your
        behalf.
      </p>
    </div>
  )
}
