import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-secondary border-border',
  primary: 'bg-primary-soft text-primary border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  error: 'bg-error-soft text-error border-transparent',
  info: 'bg-info-soft text-info border-transparent',
}

interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/** Always contains text so meaning never relies on colour alone. */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
