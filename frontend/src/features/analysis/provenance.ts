import type { SystemInformationContent } from "@/types/systemInformation";
import type {
  SystemUnderstanding,
  UnderstandingListField,
  UnderstandingTextField,
} from "@/types/analysis";
import { UNDERSTANDING_FIELDS } from "@/types/analysis";

/**
 * How a result is presented (spec: separate what the analyst provided from what
 * the AI interpreted and what is still missing).
 *
 * The three groups are not decoration: each list item is *labelled by where it
 * came from*. An interpreted item is only an interpretation because the input
 * does not state it outright, and the UI says which stored field it relates to.
 */
export type ProvenanceGroup = "provided" | "interpreted" | "missing";

export interface UnderstandingFieldMeta {
  field: (typeof UNDERSTANDING_FIELDS)[number];
  label: string;
  /** Wording that tells the analyst how much to trust this field. */
  note: string;
}

export const TEXT_FIELDS: readonly UnderstandingTextField[] = [
  "summary",
  "purpose",
  "systemScope",
];
export const LIST_FIELDS: readonly UnderstandingListField[] =
  UNDERSTANDING_FIELDS.filter(
    (field): field is UnderstandingListField =>
      !TEXT_FIELDS.includes(field as UnderstandingTextField),
  );

export const FIELD_META: Record<string, UnderstandingFieldMeta> = {
  summary: {
    field: "summary",
    label: "Summary",
    note: "A restatement of the recorded input.",
  },
  purpose: {
    field: "purpose",
    label: "Purpose",
    note: "What the input says the system is for.",
  },
  systemScope: {
    field: "systemScope",
    label: "Scope",
    note: "Boundaries only where the input draws them.",
  },
  actors: {
    field: "actors",
    label: "Actors",
    note: "Roles named in the input.",
  },
  stakeholders: {
    field: "stakeholders",
    label: "Stakeholders",
    note: "Taken from the recorded stakeholders.",
  },
  processes: {
    field: "processes",
    label: "Processes",
    note: "Steps taken from the current process.",
  },
  inputs: {
    field: "inputs",
    label: "Inputs",
    note: "What enters the system, as recorded.",
  },
  outputs: {
    field: "outputs",
    label: "Outputs",
    note: "What leaves the system, as recorded.",
  },
  dataEntities: {
    field: "dataEntities",
    label: "Data entities",
    note: "Records the input mentions.",
  },
  technologies: {
    field: "technologies",
    label: "Technologies",
    note: "Named in the technology section.",
  },
  businessRules: {
    field: "businessRules",
    label: "Business rules",
    note: "Rules the analyst wrote down.",
  },
  assumptions: {
    field: "assumptions",
    label: "Assumptions",
    note: "Inference. Not confirmed by the analyst — check before using it.",
  },
  missingInformation: {
    field: "missingInformation",
    label: "Missing information",
    note: "Open questions to resolve with the client.",
  },
};

/**
 * The one rule that decides how a field is presented. Keeping it as data means
 * the result view cannot accidentally show an inference as something the analyst
 * provided, and a new schema field has to be classified here before it renders.
 */
export const UNDERSTANDING_GROUP_OF: Record<
  (typeof UNDERSTANDING_FIELDS)[number],
  ProvenanceGroup
> = {
  summary: "interpreted",
  purpose: "interpreted",
  systemScope: "interpreted",
  assumptions: "interpreted",
  actors: "provided",
  stakeholders: "provided",
  processes: "provided",
  inputs: "provided",
  outputs: "provided",
  dataEntities: "provided",
  technologies: "provided",
  businessRules: "provided",
  missingInformation: "missing",
};

/** List fields that restate the analyst's own entries. */
export const PROVIDED_LIST_FIELDS = LIST_FIELDS.filter(
  (field) => UNDERSTANDING_GROUP_OF[field] === "provided",
);

export const EMPTY_LABEL =
  "Nothing was recorded for this, and the analysis did not infer anything either.";

/** Which stored fields the AI had to work from for a given list. */
export function sourceFieldsFor(
  field: UnderstandingListField,
  content: SystemInformationContent,
): string[] {
  switch (field) {
    case "actors":
      return tag("Users", content.users.length)
        .concat(tag("Stakeholders", content.stakeholders.length))
        .concat(content.currentWorkflow.trim() ? ["Current process"] : []);
    case "stakeholders":
      return tag("Stakeholders", content.stakeholders.length);
    case "processes":
      return [
        ...(content.currentWorkflow.trim() ? ["Current workflow"] : []),
        ...(content.processTrigger.trim() ? ["Trigger"] : []),
        ...(content.processMainProcessing.trim() ? ["Main processing"] : []),
        ...(content.processDecisionPoints.trim() ? ["Decision points"] : []),
      ];
    case "inputs":
      return content.processInput.trim() ? ["Process input"] : [];
    case "outputs":
      return content.processOutput.trim() ? ["Process output"] : [];
    case "dataEntities":
      return tag("Data entities", content.dataEntities.length);
    case "technologies":
      return tag("Technology", content.technologies.length);
    case "businessRules":
      return tag("Business rules", content.businessRules.length);
    case "assumptions":
      return [];
    case "missingInformation":
      return [];
  }
}

const tag = (label: string, count: number): string[] =>
  count > 0 ? [`${label} (${count})`] : [];

/** Sections the input left empty, so "missing" is shown as fact, not as a guess. */
export function emptySections(content: SystemInformationContent): string[] {
  const checks: [string, boolean][] = [
    ["System description", content.systemDescription.trim() !== ""],
    ["Organization", content.organization.trim() !== ""],
    ["Users", content.users.some((item) => item.name.trim() !== "")],
    ["Current process", content.currentWorkflow.trim() !== ""],
    ["Problems", content.problems.some((item) => item.title.trim() !== "")],
    [
      "Technology",
      content.technologies.some((item) => item.name.trim() !== ""),
    ],
    ["Data", content.dataEntities.some((item) => item.name.trim() !== "")],
    [
      "Business rules",
      content.businessRules.some((item) => item.rule.trim() !== ""),
    ],
    ["Objectives", content.objectives.some((item) => item.trim() !== "")],
    ["Constraints", content.constraints.trim() !== ""],
  ];
  return checks.filter(([, filled]) => !filled).map(([label]) => label);
}

/** Item counts per provenance group — the only "progress" figures this UI shows. */
export function understandingCounts(
  data: SystemUnderstanding,
): Record<ProvenanceGroup, number> {
  const counts: Record<ProvenanceGroup, number> = {
    provided: 0,
    interpreted: 0,
    missing: 0,
  };
  for (const field of LIST_FIELDS)
    counts[UNDERSTANDING_GROUP_OF[field]] += data[field].length;
  return counts;
}
