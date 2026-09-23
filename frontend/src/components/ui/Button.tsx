import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-xs',
  secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-muted',
  ghost: 'text-fg-secondary hover:bg-surface-muted hover:text-fg',
  destructive: 'bg-error text-white hover:opacity-90 shadow-xs dark:text-background',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-small gap-1.5',
  md: 'h-11 px-4 text-small gap-2',
  icon: 'h-10 w-10 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center rounded-control font-medium transition-colors duration-[120ms]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  )
})
