import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
        {icon}
      </span>
      <h3 className="text-body font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-small text-fg-secondary">{description}</p>
      {action && <div className="mt-6 w-full sm:w-auto">{action}</div>}
    </div>
  )
}
