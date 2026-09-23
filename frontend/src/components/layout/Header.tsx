import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Menu, Moon, Sun } from 'lucide-react'
import { findNavItem } from '@/data/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '../ui'
import { BackendStatusBadge } from '../BackendStatusBadge'
import type { BackendStatus } from '@/hooks/useBackendHealth'

interface HeaderProps {
  onOpenMenu: () => void
  backend: BackendStatus
}

export function Header({ onOpenMenu, backend }: HeaderProps) {
  const { pathname } = useLocation()
  const { resolved, toggle } = useTheme()
  const current = findNavItem(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={20} aria-hidden />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-small">
          <li className="hidden sm:block">
            <Link to="/" className="rounded-sm text-fg-muted hover:text-fg">
              Workspace
            </Link>
          </li>
          {current && current.path !== '/' && (
            <>
              <li className="hidden sm:block text-fg-muted" aria-hidden>
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="truncate font-medium text-fg">
                {current.label}
              </li>
            </>
          )}
          {current?.path === '/' && (
            <>
              <li className="hidden sm:block text-fg-muted" aria-hidden>
                <ChevronRight size={14} />
              </li>
              <li aria-current="page" className="truncate font-medium text-fg">
                Dashboard
              </li>
            </>
          )}
        </ol>
        {/* Current project indicator arrives with project selection in Phase 2. */}
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
