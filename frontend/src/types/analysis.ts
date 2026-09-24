/**
 * Analysis types for the AI layer (Phase 4).
 *
 * `SystemUnderstanding` mirrors the backend Pydantic schema field for field, in
 * camelCase as it appears on the wire. Nothing here is optional-by-accident: the
 * backend validates the model's answer before sending it, and the frontend
 * re-validates before storing it (see `storage/validators.ts`).
 */
import type { SystemInformationContent } from "./systemInformation";

/** Analysis tasks the backend can currently run. */
export type AnalysisTaskType = "system-understanding";

export const ANALYSIS_TASK_TYPES = [
  "system-understanding",
] as const satisfies readonly AnalysisTaskType[];

/** The twelve fields of a system understanding, in the order the backend defines them. */
export const UNDERSTANDING_FIELDS = [
  "summary",
  "purpose",
  "systemScope",
  "actors",
  "stakeholders",
  "processes",
  "inputs",
  "outputs",
  "dataEntities",
  "technologies",
  "businessRules",
  "assumptions",
  "missingInformation",
] as const satisfies readonly (keyof SystemUnderstanding)[];

export type UnderstandingTextField = "summary" | "purpose" | "systemScope";
export type UnderstandingListField = Exclude<
  (typeof UNDERSTANDING_FIELDS)[number],
  UnderstandingTextField
>;

/** What the analyst recorded, restated — not an independent description of reality. */
export interface SystemUnderstanding {
  summary: string;
  purpose: string;
  systemScope: string;
  actors: string[];
  stakeholders: string[];
  processes: string[];
  inputs: string[];
  outputs: string[];
  dataEntities: string[];
  technologies: string[];
  businessRules: string[];
  /** Inference, clearly separated from what the analyst stated. */
  assumptions: string[];
  /** What the input does not answer, phrased as a question to resolve. */
  missingInformation: string[];
}

/** Measured facts about the run. No estimates, no invented progress. */
export interface AnalysisMeta {
  provider: string;
  model: string | null;
  generatedAt: string;
  durationMs: number;
  attempts: number;
  promptChars: number;
  responseChars: number;
  schemaVersion: number;
}

/** Documented response shape: `{ "success": true, "data": { … } }`. */
export interface SystemUnderstandingResponse {
  success: true;
  data: SystemUnderstanding;
  meta: AnalysisMeta;
}

export interface AnalysisTaskInfo {
  type: string;
  label: string;
  status: "available" | "not-implemented";
  note: string;
}

/**
 * A persisted analysis: immutable once written. Re-running the analysis creates a
 * new record and leaves this one untouched, and the analyst's system information
 * is never modified by an analysis (spec §Phase 4).
 */
export interface AnalysisRecord {
  id: string;
  projectId: string;
  type: AnalysisTaskType;
  createdAt: string;
  /** Equal to `createdAt` today; kept so a later edit/re-run can differ. */
  updatedAt: string;
  /** `updatedAt` of the system information this was based on, for staleness checks. */
  sourceInformationUpdatedAt: string | null;
  /** Read-only copy of what was sent to the provider. */
  input: SystemInformationContent;
  result: SystemUnderstanding;
  meta: AnalysisMeta;
}

export interface NewAnalysisRecord {
  projectId: string;
  type?: AnalysisTaskType;
  sourceInformationUpdatedAt: string | null;
  input: SystemInformationContent;
  result: SystemUnderstanding;
  meta: AnalysisMeta;
}

/** A result is stale when the analyst changed the input after it was produced. */
export function isStale(
  record: Pick<AnalysisRecord, "sourceInformationUpdatedAt">,
  sourceUpdatedAt: string | null,
): boolean {
  if (!sourceUpdatedAt) return false;
  return record.sourceInformationUpdatedAt !== sourceUpdatedAt;
}
