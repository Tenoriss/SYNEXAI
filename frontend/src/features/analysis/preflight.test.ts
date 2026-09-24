import { describe, expect, it } from "vitest";
import { runPreflight } from "./preflight";
import { emptyContent } from "@/features/systemInformation/draft";

const filled = () =>
  ({
    ...emptyContent(),
    systemName: "City Library Lending System",
    systemType: "Library",
    systemPurpose: "Record loans, reservations and fines for four branches.",
  }) satisfies ReturnType<typeof emptyContent>;

describe("runPreflight", () => {
  it("blocks when there is no record at all", () => {
    const result = runPreflight(null);
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") return;
    expect(result.empty).toBe(true);
    expect(result.issues[0].label).toBe("System Overview");
  });

  it("names each missing required field and the section that fixes it", () => {
    const result = runPreflight({
      ...emptyContent(),
      systemName: "Wages System",
    });
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") return;
    expect(result.issues.map((issue) => issue.field).sort()).toEqual([
      "systemPurpose",
      "systemType",
    ]);
    expect(result.issues.every((issue) => issue.section === "overview")).toBe(
      true,
    );
  });

  it("warns instead of inventing a stricter gate for a record of single characters", () => {
    // Required fields are present, so the backend would accept this; the UI says
    // what such a run will look like rather than silently blocking it.
    const result = runPreflight({
      ...filled(),
      systemName: "a",
      systemType: "b",
      systemPurpose: "c",
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.warning).toMatch(/brief/i);
  });

  it("is ready once the required fields hold real content", () => {
    expect(runPreflight(filled())).toEqual({ status: "ready", warning: null });
  });

  it("warns without blocking when only labels were recorded", () => {
    const result = runPreflight({ ...filled(), systemPurpose: "Loans." });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.warning).toMatch(/brief/i);
  });
});
