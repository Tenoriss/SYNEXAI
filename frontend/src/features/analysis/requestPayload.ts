import type {
  BusinessRule,
  DataEntity,
  Stakeholder,
  SystemInformationContent,
  SystemProblem,
  SystemUser,
  Technology,
} from "@/types/systemInformation";

/**
 * The request body for `POST /api/analyze/system-understanding`.
 *
 * The key is `system_information`, exactly as the Phase 4 contract documents it.
 * Only the fields the backend schema knows are sent: entry ids, the project's
 * timestamps and any UI-only state stay in the browser.
 */
export interface AnalyzeRequestSource {
  projectId: string;
  /** `updatedAt` of the stored system information, or null when nothing is saved yet. */
  sourceUpdatedAt: string | null;
  content: SystemInformationContent;
}

export interface StakeholderPayload {
  name: string;
  role: string;
  description: string;
}

export interface SystemUnderstandingPayload {
  system_information: {
    projectId: string;
    systemName: string;
    systemType: string;
    systemPurpose: string;
    systemDescription: string;
    organization: string;
    stakeholders: StakeholderPayload[];
    users: { name: string; role: string; responsibilities: string }[];
    currentWorkflow: string;
    processTrigger: string;
    processInput: string;
    processMainProcessing: string;
    processOutput: string;
    processDecisionPoints: string;
    problems: { title: string; description: string; impact: string }[];
    technologies: { name: string; purpose: string }[];
    dataEntities: { name: string; description: string }[];
    businessRules: { rule: string; description: string }[];
    objectives: string[];
    constraints: string;
    additionalNotes: string;
    sourceUpdatedAt: string;
  };
}

const MAX_ROWS = 60;

const text = (value: string | undefined): string => (value ?? "").trim();

/**
 * Rows are mapped field by field, then blank rows are dropped: an empty
 * "stakeholder" in the form is not information, and sending it would let the
 * model invent something to fill the gap.
 */
function rows<T, R extends object>(
  list: readonly T[],
  map: (item: T) => R,
): R[] {
  return list
    .map(map)
    .filter((row) =>
      Object.values(row).some(
        (value) => typeof value === "string" && value !== "",
      ),
    )
    .slice(0, MAX_ROWS);
}

export function buildSystemUnderstandingPayload({
  projectId,
  sourceUpdatedAt,
  content,
}: AnalyzeRequestSource): SystemUnderstandingPayload {
  return {
    system_information: {
      projectId,
      systemName: text(content.systemName),
      systemType: text(content.systemType),
      systemPurpose: text(content.systemPurpose),
      systemDescription: text(content.systemDescription),
      organization: text(content.organization),
      stakeholders: rows(content.stakeholders, (item: Stakeholder) => ({
        name: text(item.name),
        role: text(item.role),
        description: text(item.description),
      })),
      users: rows(content.users, (item: SystemUser) => ({
        name: text(item.name),
        role: text(item.role),
        responsibilities: text(item.responsibilities),
      })),
      currentWorkflow: text(content.currentWorkflow),
      processTrigger: text(content.processTrigger),
      processInput: text(content.processInput),
      processMainProcessing: text(content.processMainProcessing),
      processOutput: text(content.processOutput),
      processDecisionPoints: text(content.processDecisionPoints),
      problems: rows(content.problems, (item: SystemProblem) => ({
        title: text(item.title),
        description: text(item.description),
        impact: text(item.impact),
      })),
      technologies: rows(content.technologies, (item: Technology) => ({
        name: text(item.name),
        purpose: text(item.purpose),
      })),
      dataEntities: rows(content.dataEntities, (item: DataEntity) => ({
        name: text(item.name),
        description: text(item.description),
      })),
      businessRules: rows(content.businessRules, (item: BusinessRule) => ({
        rule: text(item.rule),
        description: text(item.description),
      })),
      objectives: content.objectives
        .map(text)
        .filter((value) => value !== "")
        .slice(0, MAX_ROWS),
      constraints: text(content.constraints),
      additionalNotes: text(content.additionalNotes),
      sourceUpdatedAt: sourceUpdatedAt ?? "",
    },
  };
}
