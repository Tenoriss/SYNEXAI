import { Dialog } from '@/components/ui'
import { ProjectForm } from './ProjectForm'
import type { Project, ProjectDraft } from '@/types/project'

interface EditProjectDialogProps {
  project: Project | null
  open: boolean
  busy: boolean
  onCancel: () => void
  onSubmit: (draft: ProjectDraft) => void
}

/** Reuses the create form so both paths validate identically (spec §11). */
export function EditProjectDialog({ project, open, busy, onCancel, onSubmit }: EditProjectDialogProps) {
  return (
    <Dialog
      open={open && project !== null}
      onClose={busy ? () => undefined : onCancel}
      title="Edit Project"
      description="Changes are saved to this browser as soon as they are valid."
      size="lg"
    >
      {project && <ProjectForm mode="edit" project={project} submitting={busy} onSubmit={onSubmit} onCancel={onCancel} />}
    </Dialog>
  )
}
