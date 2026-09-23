import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ToastViewport, type ToastMessage, type ToastTone } from '@/components/ui/Toast'
import { createId } from '@/utils/id'

interface ToastApi {
  notify: (tone: ToastTone, title: string, description?: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Small, dependency-free notification queue (spec §12). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const notify = useCallback((tone: ToastTone, title: string, description?: string) => {
    setToasts((list) => [...list.slice(-2), { id: createId(), tone, title, description }])
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      notify,
      success: (title, description) => notify('success', title, description),
      error: (title, description) => notify('error', title, description),
      info: (title, description) => notify('info', title, description),
    }),
    [notify],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
