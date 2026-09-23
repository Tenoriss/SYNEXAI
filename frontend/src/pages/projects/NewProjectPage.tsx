import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, PageHeader } from '@/components/ui'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { draftToInput } from '@/features/projects/validation'
import { useProjectActions } from '@/hooks/useProjects'
import { STORAGE_KEYS } from '@/storage/keys'
import type { ProjectDraft } from '@/types/project'

export function NewProjectPage() {
  const navigate = useNavigate()
  const { createProject } = useProjectActions()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (draft: ProjectDraft) => {
    if (submitting) return // guard against double submit (spec §10)
    setSubmitting(true)
    const project = await createProject(draftToInput(draft))
    setSubmitting(false)
    if (project) navigate(`/projects/${project.id}`)
  }

  return (
    <>
      <Link
        to="/projects"
        className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-small font-medium text-fg-secondary hover:text-fg"
      >
        <ArrowLeft size={15} aria-hidden />
        All projects
      </Link>

      <PageHeader
        title="Create New Project"
        description="A project holds one system under analysis. Everything you enter here stays yours — SYNEX AI generates nothing until an analysis is run."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <ProjectForm mode="create" submitting={submitting} onSubmit={handleSubmit} onCancel={() => navigate('/projects')} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Where this is stored" icon={<Database size={18} aria-hidden />} as="h2" />
            <p className="text-small text-fg-secondary">
              Projects are saved in this browser under the <code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-caption">{STORAGE_KEYS.projects}</code>{' '}
              key. Nothing about this project is sent to a server, and no analysis is started automatically.
            </p>
          </Card>
          <Card className="bg-primary-soft/40">
            <CardHeader title="What comes next" icon={<ShieldCheck size={18} aria-hidden />} as="h2" />
            <p className="text-small text-fg-secondary">
              After saving, the project overview opens with its status set to Draft. Analysis modules become
              available in later phases; until then they stay empty rather than showing example content.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
