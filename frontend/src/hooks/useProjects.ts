import { useCallback, useMemo } from 'react'
import { useStorageQuery } from './useStorage'
import { useToast } from '@/app/ToastProvider'
import { storageService } from '@/storage'
import { describeStorageError } from '@/storage/errors'
import type { NewProjectInput, Project, ProjectStatus, ProjectUpdate } from '@/types/project'

/**
 * Reads the project list from the storage layer. `data` stays populated during
 * background refreshes so the table never flashes empty after a mutation.
 */
export function useProjects() {
  const { data, loading, error, reload } = useStorageQuery<Project[]>(
    useCallback(() => storageService.getProjects(), []),
    ['projects'],
  )
  return {
    projects: useMemo(() => data ?? [], [data]),
    loading: loading && !data,
    error,
    reload,
  }
}

export function useProject(id: string | undefined) {
  const { data, loading, error, reload } = useStorageQuery<Project | null>(
    useCallback(() => (id ? storageService.getProject(id) : Promise.resolve(null)), [id]),
    ['projects'],
    // The loader closes over `id`, so the query has to re-run when it changes.
    [id],
  )
  return {
    project: data ?? null,
    loading: loading && !data,
    /** Known after the first read: used to distinguish "missing" from "never asked". */
    missing: !loading && !error && id !== undefined && data === null,
    error,
    reload,
  }
}

/**
 * All project mutations go through here so every screen reports storage
 * failures the same way and never half-applies a change (spec §12, §24).
 */
export function useProjectActions() {
  const toast = useToast()

  const run = useCallback(
    async <T,>(action: () => Promise<T>, onError: (message: string) => void): Promise<T | null> => {
      try {
        return await action()
      } catch (err) {
        onError(describeStorageError(err))
        return null
      }
    },
    [],
  )

  const createProject = useCallback(
    async (input: NewProjectInput): Promise<Project | null> =>
      run(
        async () => {
          const project = await storageService.createProject(input)
          toast.success('Project created', `“${project.name}” is ready for analysis.`)
          return project
        },
        (message) => toast.error('Project could not be created', message),
      ),
    [run, toast],
  )

  const updateProject = useCallback(
    async (id: string, patch: ProjectUpdate, label = 'Project updated'): Promise<Project | null> =>
      run(
        async () => {
          const project = await storageService.updateProject(id, patch)
          toast.success(label, `“${project.name}” was saved to this browser.`)
          return project
        },
        (message) => toast.error('Changes could not be saved', message),
      ),
    [run, toast],
  )

  const setStatus = useCallback(
    async (project: Project, status: ProjectStatus): Promise<Project | null> =>
      run(
        async () => {
          const next = await storageService.setProjectStatus(project.id, status)
          toast.info(`Status set to ${status}`, `“${project.name}” · ${STATUS_HINT[status]}`)
          return next
        },
        (message) => toast.error('Status could not be changed', message),
      ),
    [run, toast],
  )

  const archiveProject = useCallback(
    async (project: Project) =>
      run(
        async () => {
          await storageService.archiveProject(project.id)
          toast.success('Project archived', 'It stays stored and can be restored at any time.')
          return true
        },
        (message) => toast.error('Project could not be archived', message),
      ),
    [run, toast],
  )

  const restoreProject = useCallback(
    async (project: Project) =>
      run(
        async () => {
          await storageService.restoreProject(project.id)
          toast.success('Project restored', 'Status is back to Draft.')
          return true
        },
        (message) => toast.error('Project could not be restored', message),
      ),
    [run, toast],
  )

  const duplicateProject = useCallback(
    async (project: Project): Promise<Project | null> =>
      run(
        async () => {
          const copy = await storageService.duplicateProject(project.id)
          toast.success('Project duplicated', `“${copy.name}” starts as an empty Draft.`)
          return copy
        },
        (message) => toast.error('Project could not be duplicated', message),
      ),
    [run, toast],
  )

  const deleteProject = useCallback(
    async (project: Project) =>
      run(
        async () => {
          await storageService.deleteProject(project.id)
          toast.success('Project deleted', `“${project.name}” was removed from this browser.`)
          return true
        },
        (message) => toast.error('Project could not be deleted', message),
      ),
    [run, toast],
  )

  return { createProject, updateProject, setStatus, archiveProject, restoreProject, duplicateProject, deleteProject }
}

const STATUS_HINT: Record<ProjectStatus, string> = {
  Draft: 'Not analyzed yet',
  Analyzing: 'An analysis is in progress',
  Completed: 'Analysis completed',
  'Needs Review': 'Waiting on analyst review',
  Archived: 'Archived',
}
