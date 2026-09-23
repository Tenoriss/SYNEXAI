import {
  BarChart3,
  FileText,
  GitBranch,
  Layers,
  Lightbulb,
  ListChecks,
  Search,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/**
 * Analysis modules shown on a project's overview (spec §17).
 * They are deliberately **not** routes yet — Phase 2 only builds the project
 * foundation, so each entry names the phase that will deliver it and renders
 * disabled. No placeholder content is fabricated for them.
 */
export interface ProjectModule {
  label: string
  icon: LucideIcon
  phase: number
  description: string
}

export const PROJECT_MODULES: ProjectModule[] = [
  {
    label: 'System Overview',
    icon: Layers,
    phase: 5,
    description: 'Purpose, actors, stakeholders, inputs, outputs and processes.',
  },
  {
    label: 'PIECES Analysis',
    icon: BarChart3,
    phase: 6,
    description: 'Performance, Information, Economy, Control, Efficiency, Service.',
  },
  {
    label: 'Requirements',
    icon: ListChecks,
    phase: 7,
    description: 'Functional and non-functional requirements traced to evidence.',
  },
  {
    label: 'Processes',
    icon: Workflow,
    phase: 8,
    description: 'Current versus proposed processes, problems and improvements.',
  },
  {
    label: 'Findings',
    icon: Search,
    phase: 6,
    description: 'Evidence-based findings with justified severity.',
  },
  {
    label: 'Recommendations',
    icon: Lightbulb,
    phase: 6,
    description: 'Actionable recommendations linked to each finding.',
  },
  {
    label: 'Diagrams',
    icon: GitBranch,
    phase: 9,
    description: 'FOD, flowchart, context diagram, DFD, ERD, use case and more.',
  },
  {
    label: 'Reports',
    icon: FileText,
    phase: 10,
    description: 'Professional analysis report with PDF export.',
  },
]
