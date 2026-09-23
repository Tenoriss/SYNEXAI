import { Dialog, Button } from '@/components/ui'
import type { Project } from '@/types/project'

interface DeleteProjectDialogProps {
  project: Project | null
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Destructive actions are always confirmed (spec §12). The confirm button is a
 * separate deliberate click — nothing is deleted when the row button is pressed.
 */
export function DeleteProjectDialog({ project, open, busy, onCancel, onConfirm }: DeleteProjectDialogProps) {
  return (
    <Dialog
      open={open && project !== null}
      onClose={busy ? () => undefined : onCancel}
      title="Delete Project?"
      variant="danger"
      description={
        <div className="space-y-2">
          <p>This action cannot be undone.</p>
          {project && (
            <p className="rounded-md bg-surface-muted p-3 text-small text-fg">
              <span className="font-medium">{project.name}</span>
              {project.organization && <span className="text-fg-secondary"> · {project.organization}</span>}
            </p>
          )}
          <p className="text-small text-fg-secondary">
            The project and any analysis history it holds will be removed from this browser.
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" loading={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete Project'}
          </Button>
        </>
      }
    />
  )
}
