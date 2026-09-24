import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, TriangleAlert } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { AnalysisFailure } from "@/hooks/useAnalysis";
import { systemInformationPath } from "@/features/systemInformation/paths";
import { cn } from "@/utils/cn";

interface Props {
  failure: AnalysisFailure;
  projectId: string;
  onRetry: () => void;
  onDismiss: () => void;
}

const ICONS = {
  preflight: CircleAlert,
  network: TriangleAlert,
  timeout: TriangleAlert,
  "not-configured": TriangleAlert,
  "model-unavailable": TriangleAlert,
  "rate-limited": CircleAlert,
  "invalid-response": TriangleAlert,
  "not-implemented": CircleAlert,
  storage: TriangleAlert,
  cancelled: CircleAlert,
  failure: TriangleAlert,
} as const;

/**
 * Why a run did not produce a result, phrased as what to do next. Every message
 * comes from our own mapping or from a backend error `code` — never a raw
 * provider payload.
 */
export function AnalysisNotice({
  failure,
  projectId,
  onRetry,
  onDismiss,
}: Props) {
  const Icon = ICONS[failure.kind] ?? TriangleAlert;
  const blocking =
    failure.kind === "preflight" ||
    failure.kind === "not-configured" ||
    failure.kind === "network";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-5",
        blocking
          ? "border-warning/40 bg-warning-soft/60"
          : "border-error/30 bg-error-soft/60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 shrink-0",
            blocking ? "text-warning" : "text-error",
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-semibold text-fg">{failure.title}</h3>
            {failure.code && (
              <Badge className="font-mono text-caption" tone="neutral">
                {failure.code}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-small text-fg-secondary">{failure.message}</p>
          {failure.hint && (
            <p className="mt-2 text-small text-fg-secondary">{failure.hint}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {failure.kind === "preflight" ? (
              <Link to={systemInformationPath(projectId)}>
                <Button
                  size="sm"
                  leftIcon={<ArrowRight size={14} aria-hidden />}
                  tabIndex={-1}
                >
                  Complete System Information
                </Button>
              </Link>
            ) : (
              failure.kind !== "storage" && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  Try again
                </Button>
              )
            )}
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
