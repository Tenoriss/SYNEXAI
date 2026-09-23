import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext } from '@/hooks/useTheme'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { storageService } from '@/storage'
import type { ThemePreference } from '@/types/settings'

function initialPreference(): ThemePreference {
  return storageService.settings.getSync?.().theme ?? 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(initialPreference)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  // Keep in sync with changes from other tabs / settings reset.
  useEffect(
    () =>
      storageService.subscribe((c) => {
        if (c === 'settings' || c === 'all') setPref(initialPreference())
      }),
    [],
  )

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p)
    void storageService.updateSettings({ theme: p })
  }, [])

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      toggle: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
