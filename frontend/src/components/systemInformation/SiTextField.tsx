import type { ChangeEvent } from 'react'
import { Field, TextArea, TextInput } from '@/components/ui'
import type { SiController, TextFieldProps } from './shared'

/** A single text field wired to the draft, with counter and inline error. */
export function SiTextField({
  si,
  name,
  label,
  kind = 'text',
  placeholder,
  hint,
  required,
  max,
  rows = 4,
}: TextFieldProps & { si: SiController }) {
  // Stable id (not useId) so the page can focus the first invalid field after a
  // failed Save & Continue. Every name below is unique inside the form.
  const id = `si-${name}`
  const value = si.content[name] as string
  const error = si.errors[name]
  const shared = {
    id,
    name: String(name),
    value,
    maxLength: max,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
    'aria-required': required ? (true as const) : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      si.setField(name, event.target.value),
  }

  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      error={error}
      hint={hint}
      counter={`${value.length} / ${max}`}
    >
      {kind === 'textarea' ? (
        <TextArea {...shared} rows={rows} placeholder={placeholder} />
      ) : (
        <TextInput {...shared} placeholder={placeholder} autoComplete="off" />
      )}
    </Field>
  )
}
