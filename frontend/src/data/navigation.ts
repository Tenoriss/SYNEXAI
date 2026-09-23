import {
  BarChart3,
  ClipboardList,
  FileText,
  FolderKanban,
  GitBranch,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Lightbulb,
  ListChecks,
  Search,
  Settings,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Development phase that delivers this screen (spec §79). */
  phase: number
  description: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Sidebar structure (spec §55). Single source of truth for routes + breadcrumbs. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, phase: 1, description: 'Overview of your workspace.' },
      { label: 'Projects', path: '/projects', icon: FolderKanban, phase: 2, description: 'Create and manage independent analysis projects.' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'System Overview', path: '/system-overview', icon: Layers, phase: 5, description: 'Purpose, actors, stakeholders, inputs, outputs and processes extracted from your system description.' },
      { label: 'PIECES Analysis', path: '/pieces', icon: BarChart3, phase: 6, description: 'Performance, Information, Economy, Control, Efficiency and Service analysis with evidence status.' },
      { label: 'Requirements', path: '/requirements', icon: ListChecks, phase: 7, description: 'Functional and non-functional requirements traced to evidence.' },
      { label: 'Processes', path: '/processes', icon: Workflow, phase: 8, description: 'Current versus proposed processes, problems and improvements.' },
      { label: 'Findings', path: '/findings', icon: Search, phase: 6, description: 'Evidence-based findings with justified severity.' },
      { label: 'Recommendations', path: '/recommendations', icon: Lightbulb, phase: 6, description: 'Actionable recommendations linked to findings.' },
    ],
  },
  {
    label: 'Artifacts',
    items: [
      { label: 'Diagrams', path: '/diagrams', icon: GitBranch, phase: 9, description: 'FOD, flowchart, context diagram, DFD, ERD, use case, activity, decision table/tree and HIPO.' },
      { label: 'Reports', path: '/reports', icon: FileText, phase: 10, description: 'Professional analysis report with PDF export.' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings, phase: 1, description: 'Appearance, server status and local data.' },
      { label: 'Help', path: '/help', icon: HelpCircle, phase: 11, description: 'How to use SYNEX AI and the methodology behind it.' },
    ],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/** Extra, non-sidebar routes. */
export const EXTRA_ROUTES: NavItem[] = [
  { label: 'Create Analysis', path: '/analysis/new', icon: ClipboardList, phase: 3, description: 'Describe a system to start a structured analysis.' },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS, ...EXTRA_ROUTES].find((i) => i.path === pathname)
}
