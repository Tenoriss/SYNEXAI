import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Warns before leaving with unsaved changes (spec §22): in-app through a
 * dialog the page renders, and for tab close/reload through the browser's own
 * guard. Because auto-save is debounced, an in-app departure first gives the
 * draft a chance to persist — the dialog only appears if that fails, so
 * ordinary navigation stays frictionless.
 */
export function useNavigationGuard(when: boolean, onFlush?: () => Promise<boolean>): {
  blocked: boolean
  flushing: boolean
  proceed: () => void
  stay: () => void
} {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return when && currentLocation.pathname !== nextLocation.pathname
  })
  const blockerRef = useRef(blocker)
  blockerRef.current = blocker

  const [flushing, setFlushing] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  useEffect(() => {
    if (blocker.state !== 'blocked' || !onFlush) return
    let cancelled = false
    setFlushing(true)
    void onFlush().then((ok) => {
      if (cancelled) return
      setFlushing(false)
      if (ok) blockerRef.current.proceed?.()
      else setFailed(true)
    })
    return () => {
      cancelled = true
      setFlushing(false)
    }
  }, [blocker.state, onFlush])

  const proceed = useCallback(() => {
    setFailed(false)
    blockerRef.current.proceed?.()
  }, [])

  const stay = useCallback(() => {
    setFailed(false)
    blockerRef.current.reset?.()
  }, [])

  return {
    blocked: blocker.state === 'blocked' && (onFlush === undefined || failed),
    flushing,
    proceed,
    stay,
  }
}
