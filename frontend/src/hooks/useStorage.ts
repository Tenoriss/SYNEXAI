import { useCallback, useEffect, useRef, useState } from 'react'
import { storageService, type StorageChange } from '@/storage'

interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
}

/**
 * Loads data from StorageService and re-runs when relevant storage changes.
 * `deps` controls when the loader identity changes (like useEffect deps).
 */
export function useStorageQuery<T>(
  loader: () => Promise<T>,
  watch: StorageChange[],
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const watchRef = useRef(watch)
  watchRef.current = watch

  const load = useCallback(loader, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    load()
      .then((d) => active && (setData(d), setError(null)))
      .catch((e: unknown) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [load, tick])

  useEffect(
    () =>
      storageService.subscribe((change) => {
        if (change === 'all' || watchRef.current.includes(change)) setTick((t) => t + 1)
      }),
    [],
  )

  return { data, loading, error, reload: () => setTick((t) => t + 1) }
}
