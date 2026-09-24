import { useId } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Field, TextArea, TextInput } from '@/components/ui'
import { addEntry, removeAt, removeEntry, updateAt, updateEntry } from '@/features/systemInformation/draft'
import type { Identifiable } from '@/types/systemInformation'

/**
 * Declarative column definition for a dynamic entry list. Getters and setters
 * keep the component generic without `any` or unchecked index lookups.
 */
export interface EntryColumn<T> {
  key: string
  label: string
  get: (item: T) => string
  set: (item: T, value: string) => T
  kind?: 'text' | 'textarea'
  placeholder?: string
  hint?: string
  max: number
  rows?: number
}

export interface EntryListSpec<T extends Identifiable> {
  singular: string
  plural: string
  addLabel: string
  emptyText: string
  columns: EntryColumn<T>[]
  /** Headline for a row, taken from its most identifying field. */
  title: (item: T) => string
  blank: () => T
}

interface DynamicEntryListProps<T extends Identifiable> {
  spec: EntryListSpec<T>
  items: T[]
  onChange: (items: T[]) => void
}

/**
 * Add / edit / remove the analyst's own entries. Nothing is pre-filled: an
 * empty list stays empty until the analyst adds a row (spec §10–§17).
 */
export function DynamicEntryList<T extends Identifiable>({ spec, items, onChange }: DynamicEntryListProps<T>) {
  const uid = useId()

  // Every mutation goes through the shared list operations (features/systemInformation/draft).
  const replace = (item: T, next: T) => onChange(updateEntry(items, item.id, next))

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong bg-surface-muted/40 px-4 py-6 text-center text-small text-fg-secondary">
          {spec.emptyText}
        </p>
      ) : (
        <ul className="space-y-3" aria-label={spec.plural}>
          {items.map((item, index) => {
            const named = spec.title(item).trim()
            const heading = named || `${spec.singular} ${index + 1}`
            return (
              <li key={item.id} className="rounded-md border border-border bg-surface-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="flex min-w-0 items-center gap-2 text-small font-semibold text-fg">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-caption text-fg-muted tabular-nums"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="truncate">{heading}</span>
                    {!named && <span className="text-caption font-normal text-fg-muted">— nothing entered yet</span>}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<X size={14} aria-hidden />}
                    onClick={() => onChange(removeEntry(items, item.id))}
                    aria-label={`Remove ${spec.singular} ${index + 1}${named ? ` “${named}”` : ''}`}
                  >
                    Remove
                  </Button>
                </div>

                <div className={spec.columns.length > 1 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
                  {spec.columns.map((column) => {
                    const id = `${uid}-${item.id}-${column.key}`
                    const value = column.get(item)
                    const wide = column.kind === 'textarea'
                    const counter = `${value.length} / ${column.max}`
                    const write = (next: string) => replace(item, column.set(item, next))

                    return (
                      <div key={column.key} className={wide ? 'sm:col-span-2' : undefined}>
                        <Field label={column.label} htmlFor={id} hint={column.hint} counter={counter}>
                          {column.kind === 'textarea' ? (
                            <TextArea
                              id={id}
                              name={column.key}
                              rows={column.rows ?? 3}
                              value={value}
                              maxLength={column.max}
                              placeholder={column.placeholder}
                              onChange={(e) => write(e.target.value)}
                            />
                          ) : (
                            <TextInput
                              id={id}
                              name={column.key}
                              value={value}
                              maxLength={column.max}
                              autoComplete="off"
                              placeholder={column.placeholder}
                              onChange={(e) => write(e.target.value)}
                            />
                          )}
                        </Field>
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        leftIcon={<Plus size={14} aria-hidden />}
        onClick={() => onChange(addEntry(items, spec.blank()))}
      >
        {spec.addLabel}
      </Button>
    </div>
  )
}

/** Plain-text list (objectives): one input per line, no invented entries. */
export function StringEntryList({
  items,
  onChange,
  singular,
  plural,
  addLabel,
  emptyText,
  placeholder,
  max,
}: {
  items: string[]
  onChange: (items: string[]) => void
  singular: string
  plural: string
  addLabel: string
  emptyText: string
  placeholder?: string
  max: number
}) {
  const uid = useId()
  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong bg-surface-muted/40 px-4 py-6 text-center text-small text-fg-secondary">
          {emptyText}
        </p>
      ) : (
        <ol className="space-y-3" aria-label={plural}>
          {items.map((value, index) => (
            <li key={`${uid}-${index}`} className="flex items-start gap-3">
              <label className="flex flex-1 items-start gap-3">
                <span
                  className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-caption text-fg-muted tabular-nums"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{`${singular} ${index + 1}`}</span>
                  <TextInput
                    aria-label={`${singular} ${index + 1}`}
                    name={`${singular}-${index + 1}`}
                    value={value}
                    maxLength={max}
                    autoComplete="off"
                    placeholder={placeholder}
                    onChange={(e) => onChange(updateAt(items, index, e.target.value))}
                  />
                </span>
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5"
                aria-label={`Remove ${singular} ${index + 1}`}
                onClick={() => onChange(removeAt(items, index))}
              >
                <X size={16} aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        leftIcon={<Plus size={14} aria-hidden />}
        onClick={() => onChange([...items, ''])}
      >
        {addLabel}
      </Button>
    </div>
  )
}
