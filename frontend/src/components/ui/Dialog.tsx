import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** `lg` is used for forms; panels never exceed the viewport on small screens. */
  size?: 'md' | 'lg'
  variant?: 'default' | 'danger'
}

/** Accessible modal: focus trap, Escape to close, focus restoration, aria-modal. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', variant = 'default' }: DialogProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))

    requestAnimationFrame(() => (focusables()[0] ?? panel)?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-y-auto rounded-xl border bg-surface p-5 shadow-md sm:p-6',
              size === 'lg' ? 'max-w-2xl' : 'max-w-md',
              variant === 'danger' ? 'border-error/40' : 'border-border',
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-h4 text-fg">
                {title}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-2">
                <X size={18} aria-hidden />
              </Button>
            </div>
            {description && (
              <div id={descId} className="mt-2 text-small text-fg-secondary">
                {description}
              </div>
            )}
            {children && <div className="mt-4">{children}</div>}
            {footer && (
              <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
