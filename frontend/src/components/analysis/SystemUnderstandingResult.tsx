import { useId, type ReactNode } from "react";
import { CircleAlert, Layers, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui";
import { AnalysisText } from "./AnalysisText";
import { UnderstandingField } from "./UnderstandingField";
import {
  EMPTY_LABEL,
  FIELD_META,
  PROVIDED_LIST_FIELDS,
  TEXT_FIELDS,
  sourceFieldsFor,
  understandingCounts,
} from "@/features/analysis/provenance";
import type { AnalysisRecord } from "@/types/analysis";
import type { SystemInformationContent } from "@/types/systemInformation";

interface Props {
  record: AnalysisRecord;
  /** The project's currently stored input, used to point at each item's source. */
  input: SystemInformationContent | null;
  /** Sections the analyst left empty — shown as fact, not as a model's opinion. */
  emptySections: string[];
  /** How many earlier runs exist, so "regenerate keeps the previous one" is visible. */
  previousCount: number;
}

/**
 * The analysis result (spec §Phase 4): every field of the understanding, grouped
 * by *where the content came from* — the analyst's own input, the model's
 * interpretation of it, and what is still missing. The grouping is explained in
 * words, because a colour or an icon alone must not carry that meaning.
 */
export function SystemUnderstandingResult({
  record,
  input,
  emptySections,
  previousCount,
}: Props) {
  const data = record.result;
  const counts = understandingCounts(data);
  const groupBase = useId();

  const source = input ?? record.input;

  return (
    <div className="space-y-6">
      <Group
        id={`${groupBase}-provided`}
        title="Provided Information"
        badge={{ tone: "success", label: "From your input" }}
        icon={<Layers size={16} aria-hidden />}
        description={`Restated from what you recorded. ${counts.provided} item${
          counts.provided === 1 ? "" : "s"
        } across ${PROVIDED_LIST_FIELDS.length} fields; nothing here was added by the model.`}
      >
        {counts.provided === 0 ? (
          <p className="rounded-md bg-surface-muted p-3 text-small text-fg-secondary">
            None of these were named in the recorded input, and the analysis did
            not infer any of them either. That is a statement about the input,
            not a finding about the system.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {PROVIDED_LIST_FIELDS.map((field) => (
              <UnderstandingField
                key={field}
                label={FIELD_META[field].label}
                note={FIELD_META[field].note}
                sources={sourceFieldsFor(field, source)}
                items={data[field]}
                empty={EMPTY_LABEL}
                tone="provided"
              />
            ))}
          </div>
        )}
      </Group>

      <Group
        id={`${groupBase}-interpreted`}
        title="AI Interpretation"
        badge={{ tone: "info", label: "Model output" }}
        icon={<NotebookPen size={16} aria-hidden />}
        description="How the model read your notes — including what it had to assume. Verify it before using it in a report."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <AnalysisText
              key={field}
              label={FIELD_META[field].label}
              value={data[field]}
              note={FIELD_META[field].note}
              emptyLabel="The model returned nothing for this field."
            />
          ))}
          <UnderstandingField
            label={FIELD_META.assumptions.label}
            note={FIELD_META.assumptions.note}
            items={data.assumptions}
            empty="No assumptions were needed: nothing in the interpretation goes beyond your input."
            tone="interpreted"
          />
        </div>
      </Group>

      <Group
        id={`${groupBase}-missing`}
        title="Missing Information"
        badge={{ tone: "warning", label: "To resolve" }}
        icon={<CircleAlert size={16} aria-hidden />}
        description={`What the recorded input does not answer${
          previousCount > 0
            ? `, plus the ${emptySections.length} section${emptySections.length === 1 ? "" : "s"} you have not filled in`
            : ""
        }.`}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <UnderstandingField
            label={FIELD_META.missingInformation.label}
            note={FIELD_META.missingInformation.note}
            items={data.missingInformation}
            empty="The analysis reported no gaps. Check that each section above really was answered before trusting that."
            tone="missing"
          />
          <div className="min-w-0">
            <h4 className="text-small font-semibold text-fg">
              Empty sections in System Information
            </h4>
            <p className="mt-1 text-caption text-fg-muted">
              Derived from your record, not from the model — these sections hold
              nothing yet.
            </p>
            {emptySections.length === 0 ? (
              <p className="mt-2 text-small text-fg-secondary">
                Every section holds something.
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {emptySections.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-caption text-fg-muted"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Group>
    </div>
  );
}

function Group({
  id,
  title,
  description,
  badge,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  badge: { tone: "success" | "info" | "warning"; label: string };
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-border bg-surface p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={id}
            className="flex items-center gap-2 text-body font-semibold text-fg"
          >
            <span className="text-fg-muted">{icon}</span>
            {title}
          </h3>
          <p className="mt-1 max-w-2xl text-caption text-fg-secondary">
            {description}
          </p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
