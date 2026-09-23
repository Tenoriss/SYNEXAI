import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useBackendHealth, type BackendStatus } from '@/hooks/useBackendHealth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { storageService } from '@/storage'
import { cn } from '@/utils/cn'

export interface AppOutletContext {
  backend: BackendStatus
  recheckBackend: () => void
}

export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const reduce = useReducedMotion()
  const { pathname } = useLocation()
  const { status: backend, recheck } = useBackendHealth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => storageService.settings.getSync?.().sidebarCollapsed ?? false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      void storageService.updateSettings({ sidebarCollapsed: !c })
      return !c
    })
  }, [])

  // Close the drawer on navigation and when switching to desktop.
  useEffect(() => setDrawerOpen(false), [pathname, isDesktop])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-[72px]' : 'w-[240px]',
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile / tablet drawer */}
      <AnimatePresence>
        {drawerOpen && !isDesktop && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-border bg-surface shadow-md"
              initial={reduce ? { opacity: 0 } : { x: -280 }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: -280 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            >
              <Sidebar collapsed={false} onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setDrawerOpen(true)} backend={backend} />
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
          <motion.div
            key={pathname}
            className="mx-auto w-full max-w-[1440px]"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <Outlet context={{ backend, recheckBackend: recheck } satisfies AppOutletContext} />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
