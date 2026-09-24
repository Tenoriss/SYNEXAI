import {
  Boxes,
  CircleAlert,
  FileText,
  Layers,
  Scale,
  Target,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { SiSectionId } from '@/types/systemInformation'

/** The nine input sections of the Phase 3 workspace (spec §8). */
export interface SiSection {
  id: SiSectionId
  label: string
  icon: LucideIcon
  /** Shown in the navigation and as the section subtitle. */
  summary: string
}

export const SI_SECTIONS: SiSection[] = [
  {
    id: 'overview',
    label: 'System Overview',
    icon: Layers,
    summary: 'What the system is and what it is for',
  },
  {
    id: 'people',
    label: 'Stakeholders & Users',
    icon: Users,
    summary: 'Who has an interest, and who operates it',
  },
  { id: 'process', label: 'Current Process', icon: Workflow, summary: 'How work flows through it today' },
  { id: 'problems', label: 'Problems & Pain Points', icon: CircleAlert, summary: 'What is observed to go wrong' },
  { id: 'technology', label: 'Technology', icon: Wrench, summary: 'What it currently runs on' },
  { id: 'data', label: 'Data', icon: Boxes, summary: 'The records and objects it handles' },
  { id: 'rules', label: 'Business Rules', icon: Scale, summary: 'Conditions the system must honour' },
  {
    id: 'objectives',
    label: 'Objectives & Constraints',
    icon: Target,
    summary: 'What must improve, and within what limits',
  },
  { id: 'notes', label: 'Additional Notes', icon: FileText, summary: 'Anything that fits nowhere else' },
]

export const SI_SECTION_COUNT = SI_SECTIONS.length

export const sectionAnchorId = (id: SiSectionId): string => `si-section-${id}`

export const sectionById = (id: SiSectionId): SiSection => SI_SECTIONS.find((s) => s.id === id) ?? SI_SECTIONS[0]
