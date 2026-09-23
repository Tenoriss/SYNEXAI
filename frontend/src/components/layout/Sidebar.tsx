import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NAV_GROUPS } from '@/data/navigation'
import { BrandMark } from '../BrandMark'
import { Button } from '../ui'
import { cn } from '@/utils/cn'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed?: () => void
  /** When rendered as a mobile drawer. */
  onClose?: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, onClose, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-border', collapsed ? 'justify-center px-2' : 'px-5')}>
        <BrandMark size={30} />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-small font-bold tracking-tight text-fg">SYNEX AI</p>
            <p className="text-caption text-fg-muted">System Analysis</p>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <X size={18} aria-hidden />
          </Button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
            ) : (
              <p className="mb-1.5 px-3 text-caption uppercase tracking-wider text-fg-muted">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-10 items-center gap-3 rounded-control text-small font-medium transition-colors duration-[120ms]',
                        collapsed ? 'justify-center' : 'px-3',
                        isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-fg-secondary hover:bg-surface-muted hover:text-fg',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" aria-hidden />
                        )}
                        <item.icon size={18} aria-hidden className="shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {onToggleCollapsed && (
        <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={collapsed ? '' : 'w-full'}
            leftIcon={collapsed ? undefined : <PanelLeftClose size={16} aria-hidden />}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : 'Collapse'}
          </Button>
        </div>
      )}
    </div>
  )
}
