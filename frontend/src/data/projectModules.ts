import { analysisPath } from '@/features/analysis/paths'
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
 * Analysis modules shown on a project's overview (spec §17). An entry names the
 * phase that delivers it and renders disabled until it exists; only modules with
 * a `to` are reachable, so nothing is presented as available before it is built.
 */
export interface ProjectModule {
  label: string
  icon: LucideIcon
  phase: number
  description: string
  /** Resolves to a route once the module exists. Absent means: not built yet. */
  to?: (projectId: string) => string
}

export const PROJECT_MODULES: ProjectModule[] = [
  {
    label: 'System Overview',
    icon: Layers,
    // Phase 4 delivered the first half of this module: the AI-generated system
    // understanding. The curated overview view grows with later phases.
    phase: 4,
    description: 'Purpose, actors, stakeholders, inputs, outputs and processes.',
    to: analysisPath,
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
