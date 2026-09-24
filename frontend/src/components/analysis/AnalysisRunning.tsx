import { Hourglass, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui";
import type { AnalysisPhase } from "@/hooks/useAnalysis";

interface Props {
  phase: AnalysisPhase;
  elapsedMs: number;
  onCancel: () => void;
  reducedMotion: boolean;
}

const PREPARING = "Preparing your input…";
const ANALYZING = "Understanding your system…";

/**
 * Shown while a run is in flight. There is deliberately no progress bar and no
 * percentage: a single model call has no measurable progress, so the only honest
 * figure is the time that has actually elapsed.
 */
export function AnalysisRunning({
  phase,
  elapsedMs,
  onCancel,
  reducedMotion,
}: Props) {
  const seconds = Math.floor(elapsedMs / 1000);
  const text = phase === "preparing" ? PREPARING : ANALYZING;
  const Spinner = reducedMotion ? Hourglass : LoaderCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-border bg-surface p-6 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Spinner
            size={18}
            className={reducedMotion ? undefined : "animate-spin"}
            aria-hidden
          />
        </span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-fg">{text}</p>
          <p className="mt-1 text-small text-fg-secondary">
            {phase === "preparing"
              ? "Saving your input first, so the result describes exactly what is stored."
              : "One request is being sent to the configured provider, and its answer is validated before it is shown."}
          </p>
          <p className="mt-3 text-caption text-fg-muted tabular-nums">
            Elapsed {seconds}s · no progress percentage is shown because a
            single request has none
          </p>
        </div>
      </div>

      {phase === "analyzing" && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
