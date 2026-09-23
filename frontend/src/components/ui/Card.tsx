import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-surface p-6 shadow-xs', className)} {...rest} />
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  as?: 'h2' | 'h3'
}

export function CardHeader({ title, description, icon, action, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <Heading className="text-body font-semibold text-fg">{title}</Heading>
          {description && <p className="mt-0.5 text-small text-fg-secondary">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
