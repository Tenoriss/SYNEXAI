import { SiTextField } from '../SiTextField'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SiSectionProps } from '../shared'

/** Section 9 — everything that fits no other category (spec §18). */
export function AdditionalNotesSection({ si }: SiSectionProps) {
  return (
    <SiTextField
      si={si}
      name="additionalNotes"
      label="Additional Notes"
      kind="textarea"
      rows={8}
      max={SI_LIMITS.additionalNotes}
      placeholder="Context, history, upcoming changes, or anything a future analyst should know."
      hint="Optional. Free text only — it is kept as written and never rewritten."
    />
  )
}
