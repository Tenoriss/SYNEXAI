import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStorageQuery } from './useStorage'
import { useToast } from '@/app/ToastProvider'
import { storageService } from '@/storage'
import { describeStorageError } from '@/storage/errors'
import { contentOf } from '@/storage/systemInformationNormalisation'
import { emptyContent, type Prefill } from '@/features/systemInformation/draft'
import { summarise, summariseContent } from '@/features/systemInformation/completeness'
import type {
  SystemInformation,
  SystemInformationContent,
  SystemInformationErrors,
  SystemInformationSummary,
} from '@/types/systemInformation'
import { validateSystemInformation } from '@/features/systemInformation/validation'

/** One project's stored system information. */
export function useSystemInformationRecord(projectId: string | undefined) {
  const { data, loading, error, reload } = useStorageQuery<SystemInformation | null>(
    useCallback(() => (projectId ? storageService.getSystemInformation(projectId) : Promise.resolve(null)), [projectId]),
    ['system'],
    // Re-read when the project changes, not only on mount.
    [projectId],
  )
  return {
    record: data ?? null,
    /** Content without ids/timestamps — what the overview and later phases display. */
    content: data ? contentOf(data) : null,
    loading: loading && !data,
    error,
    reload,
  }
}

/** Every stored record, keyed by project — used by the dashboard and project overview. */
export function useSystemInformationSummaries(): {
  summaries: Record<string, SystemInformationSummary>
  loading: boolean
} {
  const { data, loading } = useStorageQuery<SystemInformation[]>(
    useCallback(() => storageService.listSystemInformation(), []),
    ['system', 'projects'],
  )
  const summaries = useMemo(() => {
    const out: Record<string, SystemInformationSummary> = {}
    for (const record of data ?? []) out[record.projectId] = summarise(record)
    return out
  }, [data])
  return { summaries, loading: loading && !data }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Auto-save waits for the analyst to stop typing, so storage is not hit per keystroke (spec §20). */
export const AUTO_SAVE_MS = 1200

/**
 * The workspace controller: local draft state, dirty tracking, debounced
 * auto-save, explicit saves and inline validation. Storage errors never throw
 * into the UI — they surface as a status and a toast.
 */
/**
 * @param prefill what may be copied from the user's own project record (spec §9)
 * @param defer   keep the workspace closed while that project data is still
 *                loading, so a first-ever draft is not seeded without it
 */
export function useSystemInformationDraft(projectId: string, prefill: Prefill, defer = false) {
  const { record, loading, error: loadError } = useSystemInformationRecord(projectId)
  const toast = useToast()

  const [content, setContent] = useState<SystemInformationContent | null>(null)
  const [baseline, setBaseline] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  // A new project means a new draft, even if the component stays mounted.
  useEffect(() => {
    setContent(null)
    setBaseline('')
    setSaveState('idle')
    setSaveError(null)
    setSavedAt(null)
    setShowErrors(false)
  }, [projectId])

  // Seed from storage exactly once per project, never overwriting in-progress typing.
  useEffect(() => {
    if (loading || defer || content !== null) return
    const initial = record ? contentOf(record) : emptyContent(prefill)
    setContent(initial)
    setBaseline(JSON.stringify(initial))
    setSavedAt(record?.updatedAt ?? null)
    // `prefill` is intentionally read once, on the first pass for this project.
  }, [loading, defer, record, content])

  const dirty = content !== null && JSON.stringify(content) !== baseline
  const errors: SystemInformationErrors = useMemo(() => (content ? validateSystemInformation(content) : {}), [content])

  const persist = useCallback(
    async (mode: 'auto' | 'explicit'): Promise<boolean> => {
      if (!content) return false
      const sent = content
      setSaveState('saving')
      try {
        const saved = await storageService.saveSystemInformation(projectId, sent)
        // Compare against what was sent (storage trims and caps), so the form does
        // not flip back to "unsaved" a moment after a successful write.
        setBaseline(JSON.stringify(sent))
        setSavedAt(saved.updatedAt)
        setSaveState('saved')
        setSaveError(null)
        if (mode === 'explicit') toast.success('Changes saved', 'System information is stored in this browser.')
        return true
      } catch (err) {
        const message = describeStorageError(err)
        setSaveState('error')
        setSaveError(message)
        if (mode === 'explicit') toast.error('Changes not saved', message)
        return false
      }
    },
    [content, projectId, toast],
  )

  useEffect(() => {
    if (!dirty || !projectId) return
    const timer = setTimeout(() => void persist('auto'), AUTO_SAVE_MS)
    return () => clearTimeout(timer)
  }, [dirty, projectId, persist])

  const setField = useCallback(
    <K extends keyof SystemInformationContent>(key: K, value: SystemInformationContent[K]) => {
      setContent((current) => (current ? { ...current, [key]: value } : current))
      // A fresh edit means a previous save failure is no longer the current state.
      if (saveState === 'error') {
        setSaveState('idle')
        setSaveError(null)
      }
    },
    [saveState],
  )

  // A draft that only holds values copied from the project has no analyst input yet:
  // it is reported as not started, so nothing can look "in progress" before the first keystroke.
  const summary: SystemInformationSummary = useMemo(() => {
    if (!record && content && !dirty) return summariseContent(emptyContent(), null)
    return summariseContent(content ?? record, record?.updatedAt ?? null)
  }, [content, record, dirty])

  /** Save Draft — persists whatever is there, including a partial record (spec §19). */
  const saveDraft = useCallback(() => persist('explicit'), [persist])

  /** Save & Continue — validates first and reveals inline errors. */
  const saveAndContinue = useCallback(async (): Promise<{ ok: boolean; errors: SystemInformationErrors }> => {
    setShowErrors(true)
    if (!content) return { ok: false, errors: {} }
    const found = validateSystemInformation(content)
    if (Object.values(found).some(Boolean)) return { ok: false, errors: found }
    const saved = await persist('explicit')
    return { ok: saved, errors: {} }
  }, [content, persist])

  return {
    ready: content !== null && !loading && !defer,
    content,
    record,
    dirty,
    saveState,
    saveError,
    savedAt,
    errors,
    shownErrors: showErrors ? errors : {},
    loadError,
    summary,
    setField,
    saveDraft,
    saveAndContinue,
  }
}
