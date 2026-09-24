import { isContentEmpty } from "@/features/systemInformation/completeness";
import { validateSystemInformation } from "@/features/systemInformation/validation";
import type {
  SiSectionId,
  SystemInformationContent,
  SystemInformationErrors,
} from "@/types/systemInformation";

/**
 * Pre-flight check before an AI request is sent (spec: "a useful message instead
 * of an empty request"). It never calls the provider and never blocks saving — it
 * only says what must be recorded first, and in which section.
 */
export interface PreflightIssue {
  field: keyof SystemInformationErrors;
  message: string;
  section: SiSectionId;
  label: string;
}

export type Preflight =
  | { status: "ready"; warning: string | null }
  | { status: "blocked"; issues: PreflightIssue[]; empty: boolean };

export const SECTION_LABELS: Record<SiSectionId, string> = {
  overview: "System Overview",
  people: "Stakeholders & Users",
  process: "Current Process",
  problems: "Problems & Pain Points",
  technology: "Technology",
  data: "Data",
  rules: "Business Rules",
  objectives: "Objectives & Constraints",
  notes: "Additional Notes",
};

/** Required before a first analysis: the same three fields the workspace requires. */
const REQUIRED_SECTION: Partial<
  Record<keyof SystemInformationErrors, SiSectionId>
> = {
  systemName: "overview",
  systemType: "overview",
  systemPurpose: "overview",
};

export function runPreflight(
  content: SystemInformationContent | null,
): Preflight {
  if (!content) {
    return {
      status: "blocked",
      empty: true,
      issues: [
        {
          field: "systemName",
          message:
            "No system information has been recorded for this project yet.",
          section: "overview",
          label: SECTION_LABELS.overview,
        },
      ],
    };
  }

  const errors = validateSystemInformation(content);
  const issues = (
    Object.keys(errors) as (keyof SystemInformationErrors)[]
  ).flatMap((field) => {
    const message = errors[field];
    if (!message) return [];
    const section = REQUIRED_SECTION[field] ?? "overview";
    return [{ field, message, section, label: SECTION_LABELS[section] }];
  });
  if (issues.length > 0)
    return { status: "blocked", issues, empty: isContentEmpty(content) };

  // Beyond the required fields the gate deliberately matches the backend's own
  // rule (refuse only a record that holds literally nothing) instead of inventing
  // a stricter one: a thin record is analyzed, and says so in its result.
  if (isContentEmpty(content)) {
    return {
      status: "blocked",
      empty: true,
      issues: [
        {
          field: "systemDescription",
          message:
            "There is nothing recorded yet for an analysis to be based on.",
          section: "overview",
          label: SECTION_LABELS.overview,
        },
      ],
    };
  }

  const prose = [
    content.systemPurpose,
    content.systemDescription,
    content.currentWorkflow,
  ].filter((value) => value.trim().length >= 12).length;
  const warning =
    prose === 0
      ? "Only short notes are recorded, so the understanding will be brief and will list most details as missing information."
      : null;
  return { status: "ready", warning };
}
