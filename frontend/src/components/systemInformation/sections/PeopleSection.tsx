import { DynamicEntryList } from '../DynamicEntryList'
import { SubSection } from '../SubSection'
import { STAKEHOLDER_SPEC, USER_SPEC } from '../entrySpecs'
import type { SiSectionProps } from '../shared'

/**
 * Section 2 — stakeholders and users stay separate lists even when the same
 * person appears in both (spec §10, §11). Nothing is copied between them.
 */
export function PeopleSection({ si }: SiSectionProps) {
  return (
    <>
      <SubSection
        id="si-stakeholders"
        title="Stakeholders"
        hint="Anyone with an interest in the system — they may never use it themselves."
      >
        <DynamicEntryList
          spec={STAKEHOLDER_SPEC}
          items={si.content.stakeholders}
          onChange={(items) => si.setField('stakeholders', items)}
        />
      </SubSection>

      <SubSection id="si-users" title="Users" hint="The people who operate the system day to day.">
        <DynamicEntryList
          spec={USER_SPEC}
          items={si.content.users}
          onChange={(items) => si.setField('users', items)}
        />
      </SubSection>
    </>
  )
}
