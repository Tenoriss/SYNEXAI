import { Link } from 'react-router-dom'
import { ChevronRight, Menu, Moon, Sun } from 'lucide-react'
import { useBreadcrumb } from '@/hooks/useBreadcrumb'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '../ui'
import { BackendStatusBadge } from '../BackendStatusBadge'
import { cn } from '@/utils/cn'
import type { BackendStatus } from '@/hooks/useBackendHealth'

interface HeaderProps {
  onOpenMenu: () => void
  backend: BackendStatus
}

export function Header({ onOpenMenu, backend }: HeaderProps) {
  const { resolved, toggle } = useTheme()
  const crumbs = useBreadcrumb()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={20} aria-hidden />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-small">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1
            return (
              <li
                key={`${crumb.label}-${i}`}
                className={cn('min-w-0 items-center gap-1.5', i === 0 ? 'hidden sm:flex' : 'flex')}
              >
                {i > 0 && (
                  <span
                    className={cn('text-fg-muted', i === 1 && 'hidden sm:inline-flex')}
                    aria-hidden
                  >
                    <ChevronRight size={14} />
                  </span>
                )}
                {last || !crumb.to ? (
                  <span
                    {...(last ? { 'aria-current': 'page' as const } : {})}
                    className={cn('truncate', last ? 'font-medium text-fg' : 'text-fg-muted')}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to} className="rounded-sm text-fg-muted hover:text-fg">
                    {crumb.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-2">
        <Link to="/settings" className="hidden rounded-full sm:block" aria-label="Server status — open settings">
          <BackendStatusBadge status={backend} />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {resolved === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </Button>
      </div>
    </header>
  )
}
