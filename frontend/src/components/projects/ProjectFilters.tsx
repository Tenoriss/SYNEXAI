import { useId } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, SelectInput } from '@/components/ui'
import {
  ALL,
  PROJECT_SORTS,
  PROJECT_STATUS_FILTERS,
  SORT_LABELS,
  type ProjectQuery,
  type ProjectSort,
  type ProjectStatusFilter,
} from '@/features/projects/query'
import type { ProjectStatus } from '@/types/project'
import { cn } from '@/utils/cn'

interface ProjectFiltersProps {
  query: ProjectQuery
  counts: Record<ProjectStatus, number> & { All: number }
  resultCount: number
  onChange: (patch: Partial<ProjectQuery>) => void
}

/** Search + status filter + sort (spec §14, §15). Filter state lives in the URL. */
export function ProjectFilters({ query, counts, resultCount, onChange }: ProjectFiltersProps) {
  const searchId = useId()
  const sortId = `${searchId}-sort`
  return (
    <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            id={searchId}
            type="search"
            value={query.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search name, description, system type or organization"
            aria-label="Search projects"
            className={cn(
              'h-11 w-full rounded-control border border-border-strong bg-surface pl-10 pr-10 text-small text-fg',
              'placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          />
          {query.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-fg-muted transition-colors duration-[120ms] hover:bg-surface-muted hover:text-fg"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="flex items-center gap-1.5 text-small text-fg-secondary">
            <SlidersHorizontal size={15} aria-hidden />
            Sort
          </label>
          <SelectInput
            id={sortId}
            className="h-10 w-[168px]"
            value={query.sort}
            onChange={(e) => onChange({ sort: e.target.value as ProjectSort })}
          >
            {PROJECT_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5"
      >
        {PROJECT_STATUS_FILTERS.map((status: ProjectStatusFilter) => {
          const active = query.status === status
          const count = counts[status]
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ status })}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-small font-medium transition-colors duration-[120ms]',
                active
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-fg-secondary hover:bg-surface-muted hover:text-fg',
              )}
            >
              {status}
              <span
                className={cn(
                  'rounded-full px-1.5 text-caption tabular-nums',
                  active ? 'bg-surface text-primary' : 'bg-surface-muted text-fg-muted',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="mt-3 text-caption text-fg-muted">
        {resultCount === 0
          ? 'No projects match the current search and filter.'
          : `Showing ${resultCount} of ${counts[ALL]} project${counts[ALL] === 1 ? '' : 's'}`}
        {query.status !== ALL && ` · status: ${query.status}`}
        {query.search.trim() && ` · search: “${query.search.trim()}”`}
      </p>
    </div>
  )
}

export function ClearFiltersButton({ onClear }: { onClear: () => void }) {
  return (
    <Button variant="ghost" size="sm" leftIcon={<X size={14} aria-hidden />} onClick={onClear}>
      Clear search and filters
    </Button>
  )
}
