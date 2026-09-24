import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, ApiService } from "@/services/ApiService";
import { useToast } from "@/app/ToastProvider";
import { storageService } from "@/storage";
import { parseSystemUnderstandingResponse } from "@/features/analysis/responseGuards";
import { runPreflight, type Preflight } from "@/features/analysis/preflight";
import type { AnalysisRecord } from "@/types/analysis";
import type { SystemInformationContent } from "@/types/systemInformation";
import { useStorageQuery } from "./useStorage";

/**
 * The analysis run, exactly as the UI presents it (spec §Phase 4):
 *
 *   idle → preparing → analyzing → success
 *                              ↘ error
 *
 * `preparing` covers persisting the analyst's input so the run describes what is
 * stored; `analyzing` is the single backend call. There is no progress
 * percentage anywhere, because none is measurable — only elapsed time is shown.
 */
export type AnalysisPhase =
  "idle" | "preparing" | "analyzing" | "success" | "error";

export interface AnalysisFailure {
  /** Stable key the UI switches on; mirrors the backend error code where there is one. */
  kind:
    | "preflight"
    | "cancelled"
    | "network"
    | "timeout"
    | "not-configured"
    | "model-unavailable"
    | "rate-limited"
    | "invalid-response"
    | "not-implemented"
    | "storage"
    | "failure";
  title: string;
  message: string;
  /** What the analyst can do next. Only shown when there is something to do. */
  hint?: string;
  code?: string;
}

class DraftNotSavedError extends Error {
  constructor() {
    super("draft-not-saved");
    this.name = "DraftNotSavedError";
  }
}

interface RunOptions {
  /** Persist unsaved input first (the System Information page passes its own save). */
  saveDraft?: () => Promise<boolean>;
  dirty?: boolean;
}

const FAILURE_BY_CODE: Record<
  string,
  Omit<AnalysisFailure, "message" | "kind"> & { kind: AnalysisFailure["kind"] }
> = {
  AI_NOT_CONFIGURED: {
    kind: "not-configured",
    title: "AI analysis is not configured",
    hint: "Add GEMINI_API_KEY to backend/.env, then restart the backend server.",
    code: "AI_NOT_CONFIGURED",
  },
  AI_INPUT_REQUIRED: {
    kind: "preflight",
    title: "Not enough information to analyze",
    hint: "Record the system purpose or the current process first.",
    code: "AI_INPUT_REQUIRED",
  },
  AI_TIMEOUT: {
    kind: "timeout",
    title: "The model took too long",
    hint: "Try again, or shorten a very long description. The limit is set by AI_TIMEOUT_SECONDS.",
    code: "AI_TIMEOUT",
  },
  AI_RATE_LIMITED: {
    kind: "rate-limited",
    title: "The provider is rate limiting requests",
    hint: "Wait a moment and run it again.",
    code: "AI_RATE_LIMITED",
  },
  AI_MODEL_UNAVAILABLE: {
    kind: "model-unavailable",
    title: "The configured model is unavailable",
    hint: "Set GEMINI_MODEL in backend/.env to a model this account can use.",
    code: "AI_MODEL_UNAVAILABLE",
  },
  AI_INVALID_RESPONSE: {
    kind: "invalid-response",
    title: "The answer could not be validated",
    hint: "Nothing was stored. Run it again, or add more detail to the input.",
    code: "AI_INVALID_RESPONSE",
  },
  AI_TASK_NOT_IMPLEMENTED: {
    kind: "not-implemented",
    title: "That analysis is not part of this version",
    code: "AI_TASK_NOT_IMPLEMENTED",
  },
};

function describeError(err: unknown): AnalysisFailure {
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      kind: "cancelled",
      title: "Analysis cancelled",
      message: "The request was cancelled.",
    };
  }
  if (err instanceof ApiError) {
    const mapped = FAILURE_BY_CODE[err.code];
    if (mapped) return { ...mapped, message: err.message };
    if (err.kind === "network") {
      return {
        kind: "network",
        title: "The analysis server is unreachable",
        message: err.message,
        hint: "Start the backend: uvicorn app.main:app --port 8000 (from the backend folder).",
        code: err.code,
      };
    }
    if (err.kind === "timeout") {
      return {
        kind: "timeout",
        title: "The request timed out",
        message: err.message,
        code: err.code,
      };
    }
    return {
      kind: "failure",
      title: "The analysis could not be completed",
      message: err.message,
      code: err.code,
    };
  }
  return {
    kind: "failure",
    title: "The analysis could not be completed",
    message:
      err instanceof Error ? err.message : "An unexpected error occurred.",
  };
}

export function useAnalysis(
  projectId: string | undefined,
  content: SystemInformationContent | null,
  options: { sourceUpdatedAt?: string | null } = {},
) {
  const toast = useToast();
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [failure, setFailure] = useState<AnalysisFailure | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [newRecordId, setNewRecordId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);

  const {
    data: history,
    loading: historyLoading,
    reload,
  } = useStorageQuery<AnalysisRecord[]>(
    useCallback(
      () =>
        projectId
          ? storageService.getAnalysisHistory(projectId)
          : Promise.resolve([]),
      [projectId],
    ),
    ["analyses"],
  );

  const records = useMemo(() => history ?? [], [history]);
  const record = useMemo(() => {
    if (newRecordId) {
      const fresh = records.find((item) => item.id === newRecordId);
      if (fresh) return fresh;
    }
    return records[0] ?? null;
  }, [records, newRecordId]);

  // Elapsed wall-clock time while a run is in flight. Honest, unlike a percentage.
  useEffect(() => {
    if (phase !== "analyzing" && phase !== "preparing") return;
    const timer = window.setInterval(
      () => setElapsedMs(Date.now() - startedAtRef.current),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "idle" || phase === "error") setElapsedMs(0);
  }, [phase]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const analyze = useCallback(
    async ({
      saveDraft,
      dirty,
    }: RunOptions = {}): Promise<AnalysisRecord | null> => {
      if (!projectId || !content) return null;
      const check = runPreflight(content);
      setPreflight(check);
      if (check.status === "blocked") {
        setPhase("error");
        setFailure({
          kind: "preflight",
          title: check.empty
            ? "Nothing recorded yet"
            : "Required information is missing",
          message: check.issues.map((issue) => issue.message).join(" "),
          hint: `Complete “${check.issues[0]?.label ?? "System Overview"}” in System Information first.`,
        });
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      startedAtRef.current = Date.now();
      setFailure(null);
      setPhase("preparing");

      try {
        // Persist first so the result provably describes what is stored, and so the
        // stored record can be linked to the exact version of the input it used.
        if (dirty && saveDraft) {
          const saved = await saveDraft();
          if (!saved) throw new DraftNotSavedError();
        }

        setPhase("analyzing");
        setElapsedMs(0);
        const response = await ApiService.analyzeSystemUnderstanding(
          {
            projectId,
            sourceUpdatedAt: options.sourceUpdatedAt ?? null,
            content,
          },
          controller.signal,
        );
        const validated = parseSystemUnderstandingResponse(response);
        if (!validated) throw new Error("invalid-response");

        const saved = await storageService.saveAnalysis({
          projectId,
          type: "system-understanding",
          sourceInformationUpdatedAt: options.sourceUpdatedAt ?? null,
          input: content,
          result: validated.data,
          meta: validated.meta,
        });
        setNewRecordId(saved.id);
        setPhase("success");
        toast.success(
          "Analysis complete",
          "The result is saved with this project.",
        );
        return saved;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          setPhase("idle");
          setElapsedMs(0);
          return null;
        }
        const described =
          err instanceof DraftNotSavedError
            ? {
                kind: "storage" as const,
                title: "Your input could not be saved",
                message:
                  "The analysis was not started because the system information could not be stored.",
                hint: "Check the browser storage status in Settings, then try again.",
              }
            : describeError(err);
        setPhase("error");
        setFailure(described);
        if (described.kind !== "preflight")
          toast.error(described.title, described.message);
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [content, options.sourceUpdatedAt, projectId, toast],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase(records.length > 0 ? "success" : "idle");
    toast.info("Analysis cancelled", "No result was stored for this run.");
  }, [records.length, toast]);

  const dismissFailure = useCallback(() => {
    setFailure(null);
    setPhase(records.length > 0 ? "success" : "idle");
  }, [records.length]);

  return {
    phase,
    running: phase === "preparing" || phase === "analyzing",
    elapsedMs,
    record,
    records,
    historyCount: records.length,
    loading: historyLoading && !records.length,
    preflight,
    failure,
    analyze,
    /** Re-running appends a new record; the previous one is kept (spec §Phase 4). */
    regenerate: (runOptions: RunOptions = {}) => analyze(runOptions),
    cancel,
    dismissFailure,
    reload,
  };
}

/**
 * The newest stored analysis for one project, read from local storage only.
 * Used by overviews so a project can say what was analyzed without re-running
 * anything (and without spending a request just to render a page).
 */
export function useLatestAnalysis(projectId: string | undefined) {
  const { data, loading } = useStorageQuery<AnalysisRecord[]>(
    useCallback(
      () =>
        projectId
          ? storageService.getAnalysisHistory(projectId)
          : Promise.resolve([]),
      [projectId],
    ),
    ["analyses"],
  );
  const records = useMemo(() => data ?? [], [data]);
  return {
    record: records[0] ?? null,
    count: records.length,
    loading: loading && !records.length,
  };
}
