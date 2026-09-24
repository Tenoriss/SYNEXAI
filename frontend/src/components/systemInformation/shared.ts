import type { SiTextFieldKey, SystemInformationContent, SystemInformationErrors } from '@/types/systemInformation'

/**
 * What every section component needs: the draft content, the inline errors to
 * show, and one typed setter. Keeping this small means each section stays a
 * presentational component rather than a 200-line form.
 */
export interface SiController {
  content: SystemInformationContent
  errors: SystemInformationErrors
  setField: <K extends keyof SystemInformationContent>(key: K, value: SystemInformationContent[K]) => void
}

export interface SiSectionProps {
  si: SiController
}

export interface TextFieldProps {
  name: SiTextFieldKey
  label: string
  kind?: 'text' | 'textarea'
  placeholder?: string
  hint?: string
  required?: boolean
  max: number
  rows?: number
}
