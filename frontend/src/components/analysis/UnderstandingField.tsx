import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface Props {
  label: string;
  note?: string;
  /** Where this came from, e.g. "Users (2)" — shown so provenance is visible, not implied. */
  sources?: string[];
  items: readonly string[];
  /** Rendered when the list is empty; never a dash that could be read as data. */
  empty: ReactNode;
  tone?: "provided" | "interpreted" | "missing";
}

const TONE_MARK: Record<NonNullable<Props["tone"]>, string> = {
  provided: "bg-success",
  interpreted: "bg-info",
  missing: "bg-warning",
};

/**
 * One field of a system understanding. An empty field is stated as empty: no
 * placeholder text that could later be mistaken for something the analyst said.
 */
export function UnderstandingField({
  label,
  note,
  sources = [],
  items,
  empty,
  tone = "provided",
}: Props) {
  return (
    <section aria-label={label} className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", TONE_MARK[tone])}
          aria-hidden
        />
        <h4 className="text-small font-semibold text-fg">{label}</h4>
        <span
          className="text-caption tabular-nums text-fg-muted"
          aria-hidden={items.length === 0}
        >
          {items.length > 0
            ? `${items.length} item${items.length === 1 ? "" : "s"}`
            : "none"}
        </span>
      </div>

      {note && <p className="mt-1 text-caption text-fg-muted">{note}</p>}

      {sources.length > 0 && (
        <p className="mt-1 text-caption text-fg-muted">
          From: <span className="text-fg-secondary">{sources.join(", ")}</span>
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-2 text-small text-fg-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${index}-${item.slice(0, 24)}`}
              className="flex gap-2 text-small text-fg"
            >
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-muted"
                aria-hidden
              />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
