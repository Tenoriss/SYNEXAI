import type { ReactElement } from 'react'
import { SectionCard } from './SectionCard'
import { SI_SECTIONS } from '@/features/systemInformation/sections'
import { sectionDetail } from '@/features/systemInformation/completeness'
import type { SiSectionId, SystemInformationContent } from '@/types/systemInformation'
import type { SiController, SiSectionProps } from './shared'
import { SystemOverviewSection } from './sections/SystemOverviewSection'
import { PeopleSection } from './sections/PeopleSection'
import { CurrentProcessSection } from './sections/CurrentProcessSection'
import { ProblemsSection } from './sections/ProblemsSection'
import { TechnologySection } from './sections/TechnologySection'
import { DataEntitiesSection } from './sections/DataEntitiesSection'
import { BusinessRulesSection } from './sections/BusinessRulesSection'
import { ObjectivesSection } from './sections/ObjectivesSection'
import { AdditionalNotesSection } from './sections/AdditionalNotesSection'

const SECTION_RENDERERS: Record<SiSectionId, (props: SiSectionProps) => ReactElement> = {
  overview: SystemOverviewSection,
  people: PeopleSection,
  process: CurrentProcessSection,
  problems: ProblemsSection,
  technology: TechnologySection,
  data: DataEntitiesSection,
  rules: BusinessRulesSection,
  objectives: ObjectivesSection,
  notes: AdditionalNotesSection,
}

/** Says, once per section, what this phase deliberately does *not* do. */
const FOOTNOTES: Partial<Record<SiSectionId, string>> = {
  overview: 'This form only stores what you type. System understanding is generated in a later phase, from these words.',
  people: 'Roles, permissions and system boundaries are not inferred — add them only where you know them.',
  process: 'Nothing is modelled or normalised here. The current process stays exactly as you describe it.',
  problems: 'Severity, PIECES dimension and root causes belong to the analysis phases and are not assigned here.',
  technology: 'No recommendation is implied by listing a technology. Later phases evaluate what you record.',
  data: 'Attributes, keys and relationships are derived in the diagram phase, never guessed from a name.',
  rules: 'Rules are recorded as prose. Validation logic and enforcement are analysis outputs, not inputs.',
  objectives: 'Objectives are yours; feasibility, cost and priority are assessed in later phases.',
  notes: 'Free text is kept verbatim and quoted back as evidence where it is used.',
}

interface SystemInformationFormProps {
  si: SiController
  content: SystemInformationContent | null
  completed: SiSectionId[]
}

/** The nine sections in order, each numbered and addressable (spec §8). */
export function SystemInformationForm({ si, content, completed }: SystemInformationFormProps) {
  return (
    <div className="space-y-6">
      {SI_SECTIONS.map((section, index) => {
        const Renderer = SECTION_RENDERERS[section.id]
        return (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            complete={completed.includes(section.id)}
            detail={content ? sectionDetail(content, section.id) : 'Nothing entered yet'}
            footnote={FOOTNOTES[section.id]}
          >
            <Renderer si={si} />
          </SectionCard>
        )
      })}
    </div>
  )
}
