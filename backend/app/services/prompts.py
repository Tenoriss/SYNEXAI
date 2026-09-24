"""Prompt construction for SYNEX AI's analysis tasks.

Prompts live here — never inside route functions — so the wording of an analysis
can be reviewed, tested and versioned in one place.
"""

from __future__ import annotations

from typing import Any

from app.schemas.ai import SystemInformationInput

#: The analyst's input is the only source of truth. This block is sent as the
#: system instruction so it survives regardless of what the record contains.
SYSTEM_UNDERSTANDING_INSTRUCTIONS = """You are the analysis engine inside SYNEX AI, a workspace for professional information-systems analysts.

You are given the analyst's own notes about one information system. Your only job in
this task is to restate that input as a structured system understanding.

Ground rules — these are absolute:
1. Everything you return must be traceable to the analyst's notes. Treat the notes as
   USER-PROVIDED INFORMATION; you add no facts of your own.
2. Never invent or "complete" anything. Do not create users, stakeholders, processes,
   technologies, databases, data entities, business rules, organisational structures or
   security controls that the notes do not mention. Do not guess an industry's typical
   system.
3. If something is not stated, do not fill it in: name the gap in `missingInformation`
   as a concrete question the analyst can answer (for example "Are branch managers
   separate users from desk clerks?").
4. If — and only if — you must read something into the notes to answer a schema field,
   put that inference in `assumptions` and say what in the notes it rests on. Keep the
   inferred item out of the descriptive fields.
5. Distinguish clearly: FACT and USER-PROVIDED INFORMATION go into the descriptive
   fields; ASSUMPTION goes into `assumptions`; anything absent goes into
   `missingInformation`. Do not produce RECOMMENDATIONs, severity ratings, PIECES
   categories, requirements or diagrams in this task — later phases own those, and
   premature conclusions are treated as errors here.
6. Prefer the analyst's own wording and spelling. Keep each list item under 25 words.
   Do not pad lists to look complete: an empty list is the right answer when the notes
   say nothing.
7. Return only the JSON object required by the schema. No prose, no code fences, no
   commentary.
"""


def _block(label: str, value: str) -> str:
    text = (value or "").strip()
    return f"{label}: {text}" if text else f"{label}: (not provided)"


def _entries(label: str, items: list[dict[str, Any]]) -> str:
    """Render stored entries verbatim, joining only the parts the analyst filled in."""
    rows = [item for item in items if any(str(v or "").strip() for v in item.values())]
    if not rows:
        return f"{label}: (not provided)"
    lines: list[str] = []
    for item in rows:
        name = str(item.get("name") or item.get("title") or item.get("rule") or "").strip()
        rest = [
            f"{key}: {str(value).strip()}"
            for key, value in item.items()
            if key not in {"name", "title", "rule"} and str(value or "").strip()
        ]
        head = name or "(unnamed entry)"
        rule = str(item.get("rule") or "").strip()
        if rule and not name:
            head = rule
        lines.append(f"- {head}" + (f" | {'; '.join(rest)}" if rest else ""))
    return f"{label}:\n" + "\n".join(lines)


def _plain(label: str, values: list[str]) -> str:
    kept = [value.strip() for value in values if value.strip()]
    if not kept:
        return f"{label}: (not provided)"
    return f"{label}:\n" + "\n".join(f"- {value}" for value in kept)


def build_system_understanding_prompt(record: SystemInformationInput) -> str:
    """The analyst's record, section by section, plus what to produce."""
    data = record.to_prompt_dict()

    note_labels = (
        ("Trigger", "processTrigger"),
        ("Input", "processInput"),
        ("Main processing", "processMainProcessing"),
        ("Output", "processOutput"),
        ("Decision points", "processDecisionPoints"),
    )
    notes = [f"{label}: {data[key].strip()}" for label, key in note_labels if data[key].strip()]
    process_notes = "\n".join(notes) if notes else "Structured process notes: (not provided)"

    parts = [
        "Here is the System Information the analyst recorded for the system under analysis.",
        "Everything below is the analyst's own input; nothing has been checked against a real site.",
        "",
        _block("System name", data["systemName"]),
        _block("System type", data["systemType"]),
        _block("Organization", data["organization"]),
        _block("System purpose", data["systemPurpose"]),
        _block("System description", data["systemDescription"]),
        "",
        _entries("Stakeholders", data["stakeholders"]),
        _entries("Users", data["users"]),
        "",
        _block("Current workflow", data["currentWorkflow"]),
        process_notes,
        "",
        _entries("Problems and pain points", data["problems"]),
        _entries("Technology in use", data["technologies"]),
        _entries("Data entities", data["dataEntities"]),
        _entries("Business rules", data["businessRules"]),
        "",
        _plain("Objectives", data["objectives"]),
        _block("Constraints", data["constraints"]),
        _block("Additional notes", data["additionalNotes"]),
        "",
        "Produce the system understanding JSON object for this record.",
        "Rules of thumb: list only what the notes support; put every gap you noticed in",
        "`missingInformation`; put every inference you had to make in `assumptions`.",
        "Do not recommend, score, or classify anything.",
    ]
    return "\n".join(part for part in parts if part is not None)
