import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

const TONE_STYLE: Record<ToastTone, { icon: typeof Info; className: string; label: string }> = {
  success: { icon: CircleCheck, className: 'text-success', label: 'Success' },
  error: { icon: CircleAlert, className: 'text-error', label: 'Error' },
  info: { icon: Info, className: 'text-info', label: 'Notice' },
}

function ToastCard({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const tone = TONE_STYLE[toast.tone]
  const Icon = tone.icon
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-md',
        'max-w-sm',
      )}
    >
      <Icon size={18} aria-hidden className={cn('mt-0.5 shrink-0', tone.className)} />
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-fg">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-small text-fg-secondary">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 shrink-0 rounded-sm p-1 text-fg-muted transition-colors duration-[120ms] hover:text-fg"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}

/** Live region for short confirmations. `role="status"` keeps it announceable. */
export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  const reduce = useReducedMotion()
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="w-full sm:w-auto"
          >
            <ToastCard toast={t} onDismiss={onDismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
