import { useCallback, useEffect, useState } from 'react'
import { ApiError, ApiService } from '@/services/ApiService'
import type { HealthResponse } from '@/types/api'

export type BackendStatus =
  | { state: 'checking' }
  | { state: 'online'; health: HealthResponse }
  | { state: 'offline'; error: ApiError }

/** Checks the backend health endpoint on mount and on demand. */
export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>({ state: 'checking' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setStatus({ state: 'checking' })
    ApiService.health(controller.signal)
      .then((health) => setStatus({ state: 'online', health }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setStatus({
          state: 'offline',
          error: err instanceof ApiError ? err : new ApiError('unknown', 'Could not check server status.'),
        })
      })
    return () => controller.abort()
  }, [tick])

  const recheck = useCallback(() => setTick((t) => t + 1), [])
  return { status, recheck }
}
