import { DynamicEntryList } from '../DynamicEntryList'
import { TECHNOLOGY_SPEC } from '../entrySpecs'
import type { SiSectionProps } from '../shared'

/** Section 5 — the technology actually in use today (spec §14). */
export function TechnologySection({ si }: SiSectionProps) {
  return (
    <>
      <DynamicEntryList
        spec={TECHNOLOGY_SPEC}
        items={si.content.technologies}
        onChange={(items) => si.setField('technologies', items)}
      />
      <p className="mt-3 text-caption text-fg-muted">
        Examples of what people usually list here: programming language, framework, database, operating system,
        hosting platform, network infrastructure. They are examples only — nothing is added to your project.
      </p>
    </>
  )
}
