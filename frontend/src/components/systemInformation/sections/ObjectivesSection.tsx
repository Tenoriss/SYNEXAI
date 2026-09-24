import { StringEntryList } from '../DynamicEntryList'
import { SiTextField } from '../SiTextField'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SiSectionProps } from '../shared'

/**
 * Section 8 — what should improve, and the limits to work within (spec §17).
 * A constraint is only recorded if the analyst says so; none is assumed.
 */
export function ObjectivesSection({ si }: SiSectionProps) {
  return (
    <>
      <div>
        <h3 className="mb-1 text-small font-semibold text-fg">Objectives</h3>
        <p className="mb-3 text-caption text-fg-muted">One outcome per line, in your own words.</p>
        <StringEntryList
          items={si.content.objectives}
          onChange={(items) => si.setField('objectives', items)}
          singular="objective"
          plural="objectives"
          addLabel="Add Objective"
          emptyText="No objectives recorded. Add what you want the improved system to achieve."
          placeholder="What should be better, faster, cheaper or safer"
          max={SI_LIMITS.objective}
        />
      </div>

      <div className="border-t border-border pt-5">
        <SiTextField
          si={si}
          name="constraints"
          label="Constraints"
          kind="textarea"
          rows={5}
          max={SI_LIMITS.constraints}
          placeholder="List any limits that the analysis must respect."
          hint="Common kinds: budget, time, technology, regulation, human resources, infrastructure. Leave empty if none apply — nothing is assumed."
        />
      </div>
    </>
  )
}
