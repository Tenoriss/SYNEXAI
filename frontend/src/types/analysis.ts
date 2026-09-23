/**
 * User-provided description of the system under analysis (spec §17).
 * All fields are free text; only `systemName` is required.
 */
export interface SystemInput {
  systemName: string
  domain: string
  systemType: string
  description: string
  stakeholders: string
  actors: string
  users: string
  currentProcess: string
  existingProblems: string
  currentTechnology: string
  importantData: string
  additionalContext: string
}

/**
 * Validated AI analysis result. The full structure (system understanding,
 * PIECES, requirements, findings, …) is defined in Phase 4 together with the
 * backend Pydantic schemas. Until then it is an opaque JSON object.
 */
export type AnalysisResult = Record<string, unknown>

/** An immutable snapshot of one analysis run (spec §27). */
export interface AnalysisVersion {
  id: string
  projectId: string
  createdAt: string
  inputSnapshot: SystemInput
  analysisResult: AnalysisResult
}

export interface NewAnalysisVersion {
  projectId: string
  inputSnapshot: SystemInput
  analysisResult: AnalysisResult
}
