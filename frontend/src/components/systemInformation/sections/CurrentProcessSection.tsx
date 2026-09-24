import { SiTextField } from '../SiTextField'
import { SI_LIMITS } from '@/types/systemInformation'
import type { SiSectionProps } from '../shared'

/** Section 3 — how the system works today, free text first, structure optional (spec §12). */
export function CurrentProcessSection({ si }: SiSectionProps) {
  return (
    <>
      <SiTextField
        si={si}
        name="currentWorkflow"
        label="Current Workflow"
        kind="textarea"
        rows={9}
        max={SI_LIMITS.workflow}
        placeholder="Describe the current process..."
        hint="Describe how the system currently works from beginning to end. Include important steps, actors, inputs, outputs, and decision points."
      />

      <div className="border-t border-border pt-5">
        <h3 className="text-small font-semibold text-fg">Structured process notes</h3>
        <p className="mt-0.5 text-caption text-fg-muted">
          Optional. Use these only if they help you describe what you already know — blanks stay blank.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SiTextField si={si} name="processTrigger" label="Trigger" kind="textarea" rows={3} max={SI_LIMITS.processNote} placeholder="What starts the process" />
          <SiTextField si={si} name="processInput" label="Input" kind="textarea" rows={3} max={SI_LIMITS.processNote} placeholder="What enters the process" />
          <SiTextField si={si} name="processMainProcessing" label="Main Processing" kind="textarea" rows={3} max={SI_LIMITS.processNote} placeholder="The steps performed in between" />
          <SiTextField si={si} name="processOutput" label="Output" kind="textarea" rows={3} max={SI_LIMITS.processNote} placeholder="What the process produces" />
          <div className="sm:col-span-2">
            <SiTextField si={si} name="processDecisionPoints" label="Decision Points" kind="textarea" rows={3} max={SI_LIMITS.processNote} placeholder="Where the path splits, and on what condition" />
          </div>
        </div>
      </div>
    </>
  )
}
