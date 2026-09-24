import { DynamicEntryList } from '../DynamicEntryList'
import { DATA_ENTITY_SPEC } from '../entrySpecs'
import type { SiSectionProps } from '../shared'

/** Section 6 — the records the system keeps (spec §15). */
export function DataEntitiesSection({ si }: SiSectionProps) {
  return (
    <>
      <DynamicEntryList
        spec={DATA_ENTITY_SPEC}
        items={si.content.dataEntities}
        onChange={(items) => si.setField('dataEntities', items)}
      />
      <p className="mt-3 text-caption text-fg-muted">
        Typical examples: Student, Transaction, Product, Employee, Order. Only list the ones your system really keeps.
      </p>
    </>
  )
}
