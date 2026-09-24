import type { ReactNode } from "react";
import { Clock, Cpu, Server, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDateTime, formatRelativeTime } from "@/utils/format";
import { isStale, type AnalysisRecord } from "@/types/analysis";
import { cn } from "@/utils/cn";

interface Props {
  record: AnalysisRecord;
  /** `updatedAt` of the current system information, to flag a superseded result. */
  sourceUpdatedAt: string | null;
  versionCount: number;
}

const duration = (ms: number): string =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

/**
 * How this result was produced, using only measured values from the backend:
 * provider, model, wall-clock duration and attempt count. Plus the one thing an
 * analyst must know before quoting it — whether the input has changed since.
 */
export function AnalysisMetaBar({
  record,
  sourceUpdatedAt,
  versionCount,
}: Props) {
  const stale = isStale(record, sourceUpdatedAt);

  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Item
          icon={<Server size={14} aria-hidden />}
          label="Provider"
          value={record.meta.provider}
        />
        <Item
          icon={<Cpu size={14} aria-hidden />}
          label="Model"
          value={record.meta.model ?? "configured model"}
        />
        <Item
          icon={<Clock size={14} aria-hidden />}
          label="Took"
          value={duration(record.meta.durationMs)}
        />
        <Item
          label="Attempts"
          value={
            record.meta.attempts === 1
              ? "1"
              : `${record.meta.attempts} (retried)`
          }
        />
        <Item
          label="Runs stored"
          value={versionCount === 1 ? "1" : `${versionCount}`}
        />
        <Item
          label="Generated"
          value={formatDateTime(record.meta.generatedAt)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Badge tone={stale ? "warning" : "success"}>
          {stale ? "Input changed since" : "Matches saved input"}
        </Badge>
        <p
          className={cn(
            "text-caption",
            stale ? "text-fg" : "text-fg-secondary",
          )}
        >
          {record.sourceInformationUpdatedAt
            ? `Based on the system information saved ${formatRelativeTime(record.sourceInformationUpdatedAt)}.`
            : "Based on the system information as it was saved at the time of the run."}
          {stale && " Re-run the analysis to include your later edits."}
        </p>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-caption text-fg-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
        Validated against the backend schema before it was stored, and again in
        the browser. Raw model text is never shown.{" "}
        {record.meta.promptChars > 0 &&
          `Input sent: ${record.meta.promptChars} characters.`}
      </p>
    </div>
  );
}

function Item({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-caption text-fg-secondary">
      {icon && <span className="text-fg-muted">{icon}</span>}
      <span className="text-fg-muted">{label}:</span>
      <span className="font-medium text-fg tabular-nums">{value}</span>
    </span>
  );
}
