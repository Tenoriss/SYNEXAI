export const PROJECT_STATUSES = ['Draft', 'Analyzing', 'Completed', 'Needs Review', 'Archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Project {
  id: string
  name: string
  description: string
  domain: string
  status: ProjectStatus
  /** ISO-8601 timestamps */
  createdAt: string
  updatedAt: string
}

export interface NewProjectInput {
  name: string
  description?: string
  domain?: string
  status?: ProjectStatus
}

export type ProjectUpdate = Partial<Pick<Project, 'name' | 'description' | 'domain' | 'status'>>
