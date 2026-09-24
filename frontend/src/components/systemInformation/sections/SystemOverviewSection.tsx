import { SiTextField } from '../SiTextField'
import { SystemTypeField } from '../SystemTypeField'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SiSectionProps } from '../shared'

/** Section 1 — what the system is and what it is for (spec §9). */
export function SystemOverviewSection({ si }: SiSectionProps) {
  return (
    <>
      <SystemTypeField si={si} />

      <SiTextField
        si={si}
        name="systemName"
        label="System Name"
        required
        max={SI_LIMITS.systemName}
        placeholder="Name the information system under analysis"
        hint="Used as the title of everything produced from this input."
      />

      <SiTextField
        si={si}
        name="systemPurpose"
        label="System Purpose"
        kind="textarea"
        required
        rows={4}
        max={SI_LIMITS.systemPurpose}
        placeholder="State what this system is intended to accomplish."
        hint="Explain briefly what the system is intended to accomplish."
      />

      <SiTextField
        si={si}
        name="systemDescription"
        label="System Description"
        kind="textarea"
        rows={6}
        max={SI_LIMITS.systemDescription}
        placeholder="Describe what the system does today, who takes part, and how it is used."
        hint="Optional but recommended — SYNEX AI analyses what you write here and never adds to it."
      />

      <SiTextField
        si={si}
        name="organization"
        label="Organization"
        max={SI_LIMITS.organization}
        placeholder="Company, agency or department"
        hint="Prefilled from your project. Changing it here does not change the project record."
      />
    </>
  )
}
