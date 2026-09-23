import { useEffect, useId, useMemo, useState } from 'react'
import { Button, Field, SelectInput, TextArea, TextInput } from '@/components/ui'
import {
  emptyDraft,
  hasErrors,
  projectToDraft,
  SYSTEM_TYPE_OPTIONS,
  validateProjectDraft,
} from '@/features/projects/validation'
import {
  OTHER_SYSTEM_TYPE,
  PROJECT_LIMITS,
  PROJECT_STATUSES,
  type Project,
  type ProjectDraft,
  type ProjectDraftErrors,
  type ProjectStatus,
} from '@/types/project'

/** Explains what each status means so the label is never just a word (spec §20). */
const STATUS_HINT: Record<ProjectStatus, string> = {
  Draft: 'Created, but no analysis has been run yet.',
  Analyzing: 'An analysis is currently in progress.',
  Completed: 'Only choose this once a real analysis is finished.',
  'Needs Review': 'Analysis exists but needs your review.',
  Archived: 'Kept for reference and hidden by the default filter.',
}

/** Fields that always render a hint, so the control can reference it. */
const HINT_FIELDS = new Set(['name', 'description', 'systemType', 'analyst', 'status'])

export interface ProjectFormProps {
  mode: 'create' | 'edit'
  /** When present the form is prefilled from it (edit). */
  project?: Project
  submitting: boolean
  onSubmit: (draft: ProjectDraft) => void
  onCancel?: () => void
}

/**
 * One form for creating and editing (spec §9, §11). Validation runs on submit
 * and then live per field, so feedback is inline rather than a browser bubble.
 * The submit button is disabled while `submitting` to prevent duplicates (§10).
 */
export function ProjectForm({ mode, project, submitting, onSubmit, onCancel }: ProjectFormProps) {
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [draft, setDraft] = useState<ProjectDraft>(() => (project ? projectToDraft(project) : emptyDraft()))
  const [errors, setErrors] = useState<ProjectDraftErrors>({})
  const [touched, setTouched] = useState(false)

  // Re-seed when the form is reused for another project (edit dialog).
  useEffect(() => {
    setDraft(project ? projectToDraft(project) : emptyDraft())
    setErrors({})
    setTouched(false)
  }, [project])

  const liveErrors = useMemo(() => (touched ? validateProjectDraft(draft) : {}), [draft, touched])
  const shown: ProjectDraftErrors = { ...errors, ...liveErrors }
  const isOther = draft.systemType === OTHER_SYSTEM_TYPE

  /** Accessible wiring: which message the control points at, plus required state. */
  const a11y = (name: keyof ProjectDraft, idAlias?: string, required?: boolean) => {
    const error = shown[name]
    const base = idAlias ?? name
    return {
      'aria-invalid': error ? (true as const) : undefined,
      'aria-describedby': error
        ? `${fieldId(base)}-error`
        : HINT_FIELDS.has(name)
          ? `${fieldId(name)}-hint`
          : undefined,
      'aria-required': required ? (true as const) : undefined,
    }
  }

  function set<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setTouched(true)
    const next = validateProjectDraft(draft)
    setErrors(next)
    if (hasErrors(next) || submitting) return
    onSubmit(draft)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <Field
        label="Project name"
        htmlFor={fieldId('name')}
        required
        error={shown.name}
        counter={`${draft.name.length} / ${PROJECT_LIMITS.name}`}
        hint="Name the system you are analyzing — it appears on every report."
      >
        <TextInput
          id={fieldId('name')}
          name="name"
          value={draft.name}
          maxLength={PROJECT_LIMITS.name}
          autoComplete="off"
          placeholder="e.g. Warehouse Inventory System"
          onChange={(e) => set('name', e.target.value)}
          {...a11y('name', undefined, true)}
        />
      </Field>

      <Field
        label="Description"
        htmlFor={fieldId('description')}
        required
        error={shown.description}
        counter={`${draft.description.length} / ${PROJECT_LIMITS.description}`}
        hint="Describe the system in your own words. Nothing is generated for you — later phases analyze exactly what you write here."
      >
        <TextArea
          id={fieldId('description')}
          name="description"
          value={draft.description}
          rows={5}
          maxLength={PROJECT_LIMITS.description}
          placeholder="What does the system do today, who uses it, and what should the analysis focus on?"
          onChange={(e) => set('description', e.target.value)}
          {...a11y('description', undefined, true)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="System type"
          htmlFor={fieldId('systemType')}
          required
          error={shown.systemType}
          hint="Pick the closest category, or choose Other."
        >
          <SelectInput
            id={fieldId('systemType')}
            name="systemType"
            value={draft.systemType}
            onChange={(e) => set('systemType', e.target.value)}
            {...a11y('systemType', undefined, true)}
          >
            <option value="">Select a category</option>
            {SYSTEM_TYPE_OPTIONS.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>

        {isOther ? (
          <Field label="Specify system type" htmlFor={fieldId('other')} required error={shown.systemType}>
            <TextInput
              id={fieldId('other')}
              name="otherSystemType"
              value={draft.otherSystemType}
              maxLength={PROJECT_LIMITS.systemType}
              autoComplete="off"
              placeholder="e.g. Fleet Maintenance"
              onChange={(e) => set('otherSystemType', e.target.value)}
              {...a11y('systemType', 'other', true)}
            />
          </Field>
        ) : (
          <Field label="Organization" htmlFor={fieldId('organization')} error={shown.organization}>
            <TextInput
              id={fieldId('organization')}
              name="organization"
              value={draft.organization}
              maxLength={PROJECT_LIMITS.organization}
              autoComplete="off"
              placeholder="Company, agency or department"
              onChange={(e) => set('organization', e.target.value)}
            />
          </Field>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {isOther && (
          <Field label="Organization" htmlFor={fieldId('organization')} error={shown.organization}>
            <TextInput
              id={fieldId('organization')}
              name="organization"
              value={draft.organization}
              maxLength={PROJECT_LIMITS.organization}
              autoComplete="off"
              placeholder="Company, agency or department"
              onChange={(e) => set('organization', e.target.value)}
            />
          </Field>
        )}

        <Field label="Analyst" htmlFor={fieldId('analyst')} error={shown.analyst} hint="Never filled in automatically.">
          <TextInput
            id={fieldId('analyst')}
            name="analyst"
            value={draft.analyst}
            maxLength={PROJECT_LIMITS.analyst}
            autoComplete="off"
            placeholder="Leave blank if not assigned yet"
            onChange={(e) => set('analyst', e.target.value)}
            {...a11y('analyst')}
          />
        </Field>

        <Field label="Status" htmlFor={fieldId('status')} required hint={STATUS_HINT[draft.status]}>
          <SelectInput
            id={fieldId('status')}
            name="status"
            value={draft.status}
            onChange={(e) => set('status', e.target.value as ProjectStatus)}
            {...a11y('status', undefined, true)}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="mt-1 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create Project'
              : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
