import { CheckCircle2, CircleDashed } from 'lucide-react'
import { SI_SECTIONS } from '@/features/systemInformation/sections'
import { isSectionComplete, sectionDetail } from '@/features/systemInformation/completeness'
import type { SystemInformationContent } from '@/types/systemInformation'
import { cn } from '@/utils/cn'

interface SectionNavigationProps {
  content: SystemInformationContent | null
  activeId: string | null
  onJump: (sectionId: string) => void
}

/**
 * Section list (spec §27): a sticky rail on desktop, a scrollable chip row on
 * small screens. Every item states its own completion in words.
 */
export function SectionNavigation({ content, activeId, onJump }: SectionNavigationProps) {
  const completed = content ? SI_SECTIONS.filter((s) => isSectionComplete(content, s.id)).length : 0

  return (
    <nav aria-label="System information sections" className="lg:sticky lg:top-20">
      <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
        <p className="px-1 pb-2 text-caption uppercase tracking-wider text-fg-muted">
          Sections · {completed} of {SI_SECTIONS.length}
        </p>
        <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {SI_SECTIONS.map((section, index) => {
            const complete = content ? isSectionComplete(content, section.id) : false
            const active = activeId === section.id
            return (
              <li key={section.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => onJump(section.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'group flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors duration-[120ms]',
                    active ? 'bg-primary-soft text-primary' : 'text-fg-secondary hover:bg-surface-muted hover:text-fg',
                  )}
                >
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {complete ? <CheckCircle2 size={15} className="text-success" /> : <CircleDashed size={15} />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-small font-medium lg:whitespace-normal">
                      <span className="text-caption tabular-nums opacity-70">{index + 1}.</span>
                      {section.label}
                    </span>
                    <span className="hidden text-caption text-fg-muted lg:block">
                      {content ? sectionDetail(content, section.id) : 'Nothing entered yet'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
