import { Archive, ArchiveRestore, Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { Project } from '@/types/project'

export interface ProjectActionHandlers {
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  /** True while a mutation for this project is in flight. */
  pending?: boolean
}

/**
 * Row / card actions. Kept as real buttons with unique accessible names, and
 * `stopPropagation` so they never trigger the row link behind them.
 */
interface ProjectActionsProps {
  project: Pick<Project, 'name' | 'status'>
  handlers: ProjectActionHandlers
}

export function ProjectActions({ project, handlers }: ProjectActionsProps) {
  const { onEdit, onDuplicate, onArchive, onRestore, onDelete, pending } = handlers
  const archived = project.status === 'Archived'

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  const iconProps = {
    size: 18,
    'aria-hidden': true as const,
    className: 'transition-colors',
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" aria-label={`Edit ${project.name}`} disabled={pending} onClick={stop(onEdit)}>
        <Pencil {...iconProps} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Duplicate ${project.name}`}
        disabled={pending}
        onClick={stop(onDuplicate)}
      >
        <Copy {...iconProps} />
      </Button>
      {archived ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Restore ${project.name} from archive`}
          disabled={pending}
          onClick={stop(onRestore)}
        >
          <ArchiveRestore {...iconProps} />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Archive ${project.name}`}
          disabled={pending}
          onClick={stop(onArchive)}
        >
          <Archive {...iconProps} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${project.name}`}
        disabled={pending}
        onClick={stop(onDelete)}
        className="hover:text-error"
      >
        <Trash2 {...iconProps} />
      </Button>
    </div>
  )
}
