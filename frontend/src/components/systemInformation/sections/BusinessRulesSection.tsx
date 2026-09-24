import { DynamicEntryList } from '../DynamicEntryList'
import { BUSINESS_RULE_SPEC } from '../entrySpecs'
import type { SiSectionProps } from '../shared'

/** Section 7 — operational rules the system must honour (spec §16). */
export function BusinessRulesSection({ si }: SiSectionProps) {
  return (
    <DynamicEntryList
      spec={BUSINESS_RULE_SPEC}
      items={si.content.businessRules}
      onChange={(items) => si.setField('businessRules', items)}
    />
  )
}
