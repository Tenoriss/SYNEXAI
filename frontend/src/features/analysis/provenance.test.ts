import { describe, expect, it } from "vitest";
import {
  emptySections,
  sourceFieldsFor,
  understandingCounts,
  FIELD_META,
  UNDERSTANDING_GROUP_OF,
} from "./provenance";
import { emptyContent } from "@/features/systemInformation/draft";
import type { SystemUnderstanding } from "@/types/analysis";

const understanding: SystemUnderstanding = {
  summary: "s",
  purpose: "p",
  systemScope: "",
  actors: ["Clerk"],
  stakeholders: ["Owner"],
  processes: ["Take the card", "Stamp the date"],
  inputs: [],
  outputs: [],
  dataEntities: ["Loan"],
  technologies: [],
  businessRules: [],
  assumptions: ["Members are the only users of the desk"],
  missingInformation: ["Who approves fines?"],
};

describe("provenance", () => {
  it("counts every item by where it came from", () => {
    expect(understandingCounts(understanding)).toEqual({
      provided: 5,
      interpreted: 1,
      missing: 1,
    });
  });

  it("reports the stored fields an interpreted list was read from", () => {
    const content = {
      ...emptyContent(),
      users: [{ id: "u1", name: "Clerk", role: "", responsibilities: "" }],
      stakeholders: [
        { id: "s1", name: "Owner", role: "", description: "" },
        { id: "s2", name: "Manager", role: "", description: "" },
      ],
      currentWorkflow: "Queue at the desk.",
      processTrigger: "",
    };
    expect(sourceFieldsFor("actors", content)).toEqual([
      "Users (1)",
      "Stakeholders (2)",
      "Current process",
    ]);
    expect(sourceFieldsFor("inputs", content)).toEqual([]);
  });

  it("lists the sections the analyst left empty", () => {
    const sections = emptySections({
      ...emptyContent(),
      systemDescription: "Something.",
    });
    expect(sections).toContain("Users");
    expect(sections).not.toContain("System description");
  });

  it("labels every field of the schema so the UI cannot render an unknown one silently", () => {
    const labelled = Object.keys(FIELD_META);
    expect(labelled).toHaveLength(13);
    expect(UNDERSTANDING_GROUP_OF.assumptions).toBe("interpreted");
    expect(UNDERSTANDING_GROUP_OF.missingInformation).toBe("missing");
    expect(UNDERSTANDING_GROUP_OF.actors).toBe("provided");
  });
});
