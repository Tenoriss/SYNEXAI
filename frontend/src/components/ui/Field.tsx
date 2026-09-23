import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

/*
 * Form primitives shared by every SYNEX AI form. Labels are always visible,
 * errors are announced through aria-describedby, and colour is never the only
 * signal (an icon + text accompanies every message).
 */

const base =
  'w-full rounded-control border bg-surface px-3 text-small text-fg placeholder:text-fg-muted transition-colors duration-[120ms] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-error'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(base, 'h-11 border-border-strong', className)} {...rest} />
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, 'min-h-[120px] resize-y border-border-strong py-2.5 leading-relaxed', className)}
        {...rest}
      />
    )
  },
)

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function SelectInput({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, 'h-11 border-border-strong appearance-none bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b91a1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 12px center',
        }}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

interface FieldProps {
  label: string
  htmlFor: string
  required?: boolean
  hint?: ReactNode
  error?: string
  /** e.g. "24 / 2000" — kept out of the label so it does not read as required text. */
  counter?: string
  children: ReactNode
}

export function Field({ label, htmlFor, required, hint, error, counter, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-small font-medium text-fg">
          {label}
          {required && (
            <span className="ml-1 text-error" aria-hidden="true">
              *
            </span>
          )}
          {!required && <span className="ml-1.5 font-normal text-fg-muted">(optional)</span>}
        </label>
        {counter && <span className="shrink-0 text-caption tabular-nums text-fg-muted">{counter}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption text-error">
          <CircleAlert size={14} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="mt-1.5 text-caption text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
