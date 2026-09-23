import { Link } from 'react-router-dom'
import { FolderKanban, Plus } from 'lucide-react'
import { Button, Card, EmptyState } from '@/components/ui'

/** Shown only when there is genuinely no stored project (spec §16) — never seeded data. */
export function EmptyProjectsState() {
  return (
    <Card>
      <EmptyState
        icon={<FolderKanban size={22} aria-hidden />}
        title="No projects yet"
        description="Create your first system analysis project to begin understanding, analyzing, and improving an information system."
        action={
          <Link to="/projects/new">
            <Button leftIcon={<Plus size={16} aria-hidden />} className="w-full justify-center sm:w-auto" tabIndex={-1}>
              Create Project
            </Button>
          </Link>
        }
      />
    </Card>
  )
}
