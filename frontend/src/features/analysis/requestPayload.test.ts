import { describe, expect, it } from "vitest";
import { buildSystemUnderstandingPayload } from "./requestPayload";
import { emptyContent } from "@/features/systemInformation/draft";

const source = (overrides = {}) => ({
  projectId: "project-1",
  sourceUpdatedAt: "2026-09-24T01:00:00.000Z",
  content: { ...emptyContent(), ...overrides },
});

describe("buildSystemUnderstandingPayload", () => {
  it("uses the documented `system_information` key and field names", () => {
    const payload = buildSystemUnderstandingPayload(
      source({ systemName: "  Library System  " }),
    );
    const info = payload.system_information;

    expect(Object.keys(payload)).toEqual(["system_information"]);
    expect(info.systemName).toBe("Library System");
    expect(info.sourceUpdatedAt).toBe("2026-09-24T01:00:00.000Z");
    expect(info).toMatchObject({
      systemType: "",
      systemPurpose: "",
      currentWorkflow: "",
      objectives: [],
      constraints: "",
      additionalNotes: "",
    });
  });

  it("sends no local ids and no blank rows", () => {
    const payload = buildSystemUnderstandingPayload(
      source({
        stakeholders: [
          {
            id: "row-1",
            name: "Head librarian",
            role: " Owner ",
            description: "",
          },
          { id: "row-2", name: "   ", role: "", description: "   " },
        ],
        businessRules: [
          { id: "r1", rule: "Fines after due date", description: "" },
        ],
        objectives: [" Cut the queue ", ""],
      }),
    );

    expect(payload.system_information.stakeholders).toEqual([
      { name: "Head librarian", role: "Owner", description: "" },
    ]);
    expect(payload.system_information.businessRules).toEqual([
      { rule: "Fines after due date", description: "" },
    ]);
    expect(payload.system_information.objectives).toEqual(["Cut the queue"]);
    expect(JSON.stringify(payload)).not.toContain("row-1");
  });

  it("keeps a sourceUpdatedAt of null out of the wire format as an empty string", () => {
    const payload = buildSystemUnderstandingPayload({
      ...source(),
      sourceUpdatedAt: null,
    });
    expect(payload.system_information.sourceUpdatedAt).toBe("");
  });

  it("caps lists at the size the backend schema accepts", () => {
    const many = Array.from({ length: 90 }, (_, index) => ({
      id: `d${index}`,
      name: `Entity ${index}`,
      description: "",
    }));
    const payload = buildSystemUnderstandingPayload(
      source({ dataEntities: many }),
    );
    expect(payload.system_information.dataEntities).toHaveLength(60);
  });
});
