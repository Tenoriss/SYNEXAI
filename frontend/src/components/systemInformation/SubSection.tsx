import type { ReactNode } from 'react'

interface SubSectionProps {
  title: string
  hint?: string
  children: ReactNode
  /** Rendered as a list marker inside a section card. */
  id: string
}

/** A titled block inside one section card, e.g. Stakeholders within "Stakeholders & Users". */
export function SubSection({ title, hint, children, id }: SubSectionProps) {
  return (
    <div className="border-t border-border pt-5 first:border-0 first:pt-0">
      <div className="mb-3">
        <h3 id={`${id}-title`} className="text-small font-semibold text-fg">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-caption text-fg-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
