import { describe, expect, it } from "vitest";
import { parseSystemUnderstandingResponse } from "./responseGuards";

const data = {
  summary: "A lending system for four branches.",
  purpose: "Replace the paper cards.",
  systemScope: "Desk check-out only.",
  actors: ["Desk clerk"],
  stakeholders: ["Head librarian"],
  processes: [],
  inputs: [],
  outputs: [],
  dataEntities: ["Loan"],
  technologies: [],
  businessRules: [],
  assumptions: [],
  missingInformation: ["Who approves a lost card?"],
};

const meta = {
  provider: "gemini",
  model: "gemini-test",
  generatedAt: "2026-09-24T02:00:00Z",
  durationMs: 1500,
  attempts: 1,
  promptChars: 1200,
  responseChars: 700,
  schemaVersion: 1,
};

describe("parseSystemUnderstandingResponse", () => {
  it("accepts the documented success envelope", () => {
    const parsed = parseSystemUnderstandingResponse({
      success: true,
      data,
      meta,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.data.missingInformation).toEqual([
      "Who approves a lost card?",
    ]);
    expect(parsed?.meta).toEqual(meta);
  });

  it("fills in optional lists instead of trusting the response to be complete", () => {
    const parsed = parseSystemUnderstandingResponse({
      success: true,
      data: { summary: "x", purpose: "y" },
      meta: { provider: "gemini", generatedAt: "2026-09-24T02:00:00Z" },
    });

    expect(parsed?.data.actors).toEqual([]);
    expect(parsed?.data.systemScope).toBe("");
    expect(parsed?.meta.model).toBeNull();
    expect(parsed?.meta.attempts).toBe(1);
    expect(parsed?.meta.durationMs).toBe(0);
  });

  it("rejects anything that is not a success envelope", () => {
    const cases: unknown[] = [
      null,
      undefined,
      "The library system looks straightforward.",
      { summary: "x", purpose: "y" },
      { success: false, error: { code: "AI_TIMEOUT", message: "too slow" } },
      { success: true, data },
      { success: true, meta },
      { success: true, data: { ...data, summary: "", purpose: "" }, meta },
      { success: true, data: { ...data, summary: 42 }, meta },
      { success: true, data: { ...data, actors: "Desk clerk" }, meta },
      { success: true, data, meta: { ...meta, provider: "" } },
      { success: true, data, meta: { ...meta, generatedAt: "not a date" } },
    ];
    for (const value of cases)
      expect(parseSystemUnderstandingResponse(value)).toBeNull();
  });

  it("drops malformed list items rather than rendering them", () => {
    const parsed = parseSystemUnderstandingResponse({
      success: true,
      data: { ...data, actors: ["Clerk", 7, null, "", "Librarian"] },
      meta,
    });
    expect(parsed?.data.actors).toEqual(["Clerk", "Librarian"]);
  });
});
