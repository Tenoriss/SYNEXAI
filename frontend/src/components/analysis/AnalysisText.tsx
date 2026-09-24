import { cn } from "@/utils/cn";

interface Props {
  label: string;
  value: string;
  note?: string;
  emptyLabel: string;
}

/** A narrative field (summary, purpose, scope) with its provenance note. */
export function AnalysisText({ label, value, note, emptyLabel }: Props) {
  const filled = value.trim() !== "";
  return (
    <div className="min-w-0">
      <p className="text-caption uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      {note && <p className="mt-0.5 text-caption text-fg-muted">{note}</p>}
      <p
        className={cn(
          "mt-1.5 break-words text-small leading-relaxed",
          filled ? "text-fg" : "text-fg-muted italic",
        )}
      >
        {filled ? value : emptyLabel}
      </p>
    </div>
  );
}
