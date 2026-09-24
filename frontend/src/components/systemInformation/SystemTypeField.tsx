import { useState } from 'react'
import { Field, SelectInput, TextInput } from '@/components/ui'
import { isKnownSystemType, SYSTEM_TYPE_OPTIONS } from '@/features/projects/validation'
import { OTHER_SYSTEM_TYPE } from '@/types/project'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SiController } from './shared'

/**
 * System type as a category, with "Other" for anything the list does not cover
 * (spec §9). The stored value is always the text itself: picking a category
 * stores that category, choosing Other stores what the analyst types. So a
 * category selected once is never silently kept while the control says Other.
 * The list is a picker only — nothing is written to the project by it.
 */
export function SystemTypeField({ si }: { si: SiController }) {
  const value = si.content.systemType
  const custom = value.trim() !== '' && !isKnownSystemType(value)
  const [forcedOther, setForcedOther] = useState(false)
  const otherShown = forcedOther || custom
  const error = si.errors.systemType

  const pick = (next: string) => {
    if (next === OTHER_SYSTEM_TYPE) {
      // Entering free-text mode drops the category that was stored, so the two
      // controls can never disagree about what the value means.
      if (isKnownSystemType(value)) si.setField('systemType', '')
      setForcedOther(true)
      return
    }
    setForcedOther(false)
    si.setField('systemType', next)
  }

  return (
    <div className={otherShown ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
      <Field
        label="System Type"
        htmlFor="si-system-type"
        required
        error={otherShown ? undefined : error}
        hint="Pick a category, or choose Other to describe it in your own words."
      >
        <SelectInput
          id="si-system-type"
          name="systemType"
          value={otherShown ? OTHER_SYSTEM_TYPE : value}
          onChange={(event) => pick(event.target.value)}
          aria-required="true"
          aria-invalid={!otherShown && error ? true : undefined}
          aria-describedby={!otherShown && error ? 'si-system-type-error' : 'si-system-type-hint'}
        >
          <option value="">Select a category</option>
          {SYSTEM_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectInput>
      </Field>

      {otherShown && (
        <Field
          label="Specify system type"
          htmlFor="si-system-type-other"
          required
          error={error}
          counter={`${value.length} / ${SI_LIMITS.systemType}`}
          hint={custom ? undefined : 'Describe the type of system in your own words.'}
        >
          <TextInput
            id="si-system-type-other"
            name="systemTypeOther"
            value={value}
            maxLength={SI_LIMITS.systemType}
            autoComplete="off"
            placeholder="e.g. Fleet maintenance, or whatever your own words describe better"
            onChange={(event) => si.setField('systemType', event.target.value)}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'si-system-type-other-error' : 'si-system-type-other-hint'}
          />
        </Field>
      )}
    </div>
  )
}
