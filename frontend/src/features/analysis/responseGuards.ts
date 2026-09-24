import type {
  AnalysisMeta,
  SystemUnderstanding,
  SystemUnderstandingResponse,
} from "@/types/analysis";
import { normaliseUnderstanding } from "@/storage/validators";
import { isNonEmptyString, isRecord, isString } from "@/utils/guards";

/**
 * The frontend does not trust the AI response because the backend validated it;
 * it validates it again. Anything that is not the documented
 * `{ success: true, data, meta }` shape is an error, so raw model text can never
 * reach the screen — or storage — as if it were analysis.
 */
export function parseSystemUnderstandingResponse(
  value: unknown,
): SystemUnderstandingResponse | null {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data))
    return null;
  // The *shape* must be right — a number where prose belongs is a broken answer,
  // not something to repair. Only then is content normalised (trimmed, blank and
  // malformed list entries dropped).
  if (!hasExpectedShape(value.data)) return null;

  const data: SystemUnderstanding | null = normaliseUnderstanding(value.data);
  // A response with no summary and no purpose is not an understanding, even if
  // it is structurally sound: treat it as an invalid response, not as a result.
  if (!data || (!data.summary.trim() && !data.purpose.trim())) return null;

  const meta = isRecord(value.meta) ? value.meta : null;
  if (!meta || !isNonEmptyString(meta.provider) || !isIsoLike(meta.generatedAt))
    return null;

  return { success: true, data, meta: toMeta(meta) };
}

export function isSystemUnderstandingResponse(
  value: unknown,
): value is SystemUnderstandingResponse {
  return parseSystemUnderstandingResponse(value) !== null;
}

const TEXT_KEYS = ["summary", "purpose", "systemScope"] as const;
const LIST_KEYS = [
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
] as const;

function hasExpectedShape(data: Record<string, unknown>): boolean {
  if (!TEXT_KEYS.every((key) => key in data === false || isString(data[key])))
    return false;
  if (!isString(data.summary) || !isString(data.purpose)) return false;
  return LIST_KEYS.every((key) => !(key in data) || Array.isArray(data[key]));
}

function isIsoLike(value: unknown): boolean {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;

function toMeta(meta: Record<string, unknown>): AnalysisMeta {
  return {
    provider: String(meta.provider),
    model: isString(meta.model) ? meta.model : null,
    generatedAt: String(meta.generatedAt),
    durationMs: numberOr(meta.durationMs, 0),
    attempts: numberOr(meta.attempts, 1),
    promptChars: numberOr(meta.promptChars, 0),
    responseChars: numberOr(meta.responseChars, 0),
    schemaVersion: numberOr(meta.schemaVersion, 1),
  };
}
