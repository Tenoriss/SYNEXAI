import { DynamicEntryList } from '../DynamicEntryList'
import { PROBLEM_SPEC } from '../entrySpecs'
import type { SiSectionProps } from '../shared'

/** Section 4 — observed problems only: no severity, no PIECES category (spec §13). */
export function ProblemsSection({ si }: SiSectionProps) {
  return (
    <DynamicEntryList
      spec={PROBLEM_SPEC}
      items={si.content.problems}
      onChange={(items) => si.setField('problems', items)}
    />
  )
}
