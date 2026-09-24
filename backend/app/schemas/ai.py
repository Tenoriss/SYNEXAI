"""Structured AI request/response schemas.

Field limits mirror the frontend's Phase 3 model (``SI_LIMITS``) so the backend
never trusts the client to have validated itself, and so a prompt cannot be made
arbitrarily large by a caller. JSON uses camelCase (the shape the frontend
already speaks); the Python attributes stay snake_case.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

# ---------------------------------------------------------------- input model

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]


class _Camel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="ignore",
    )


class StakeholderInput(_Camel):
    name: ShortText = ""
    role: ShortText = ""
    description: LongText = ""


class SystemUserInput(_Camel):
    name: ShortText = ""
    role: ShortText = ""
    responsibilities: LongText = ""


class ProblemInput(_Camel):
    title: ShortText = ""
    description: LongText = ""
    impact: LongText = ""


class TechnologyInput(_Camel):
    name: ShortText = ""
    purpose: LongText = ""


class DataEntityInput(_Camel):
    name: ShortText = ""
    description: LongText = ""


class BusinessRuleInput(_Camel):
    rule: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ""
    description: LongText = ""


class SystemInformationInput(_Camel):
    """The System Information record from Phase 3, exactly as the analyst stored it."""

    project_id: str = Field(default="", max_length=80, description="Only used for logging, never for the prompt.")
    system_name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] = ""
    system_type: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] = ""
    system_purpose: LongText = ""
    system_description: LongText = ""
    organization: Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] = ""

    stakeholders: list[StakeholderInput] = Field(default_factory=list, max_length=60)
    users: list[SystemUserInput] = Field(default_factory=list, max_length=60)

    current_workflow: Annotated[str, StringConstraints(strip_whitespace=True, max_length=6000)] = ""
    process_trigger: LongText = ""
    process_input: LongText = ""
    process_main_processing: LongText = ""
    process_output: LongText = ""
    process_decision_points: LongText = ""

    problems: list[ProblemInput] = Field(default_factory=list, max_length=60)
    technologies: list[TechnologyInput] = Field(default_factory=list, max_length=60)
    data_entities: list[DataEntityInput] = Field(default_factory=list, max_length=60)
    business_rules: list[BusinessRuleInput] = Field(default_factory=list, max_length=60)

    objectives: list[Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]] = Field(
        default_factory=list, max_length=60
    )
    constraints: LongText = ""
    additional_notes: LongText = ""

    # Phase 3 also stores when the record was saved; the frontend echoes it so the
    # analysis result can say which input version it describes.
    source_updated_at: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] = ""

    @property
    def is_minimal(self) -> bool:
        """True when there is nothing an analysis could honestly be based on."""
        return not any(
            [
                self.system_name,
                self.system_purpose,
                self.system_description,
                self.current_workflow,
                self.stakeholders,
                self.users,
                self.problems,
                self.technologies,
                self.data_entities,
                self.business_rules,
                self.objectives,
                self.constraints,
                self.additional_notes,
            ]
        )

    def to_prompt_dict(self) -> dict[str, Any]:
        """camelCase payload for the prompt — ids and timestamps are not model input."""
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("projectId", None)
        data.pop("sourceUpdatedAt", None)
        return data


# --------------------------------------------------------------- output model

class SystemUnderstanding(_Camel):
    """Validated system-understanding output.

    Every field describes *the analyst's own input*. Nothing here may be invented:
    unknowns belong in ``missingInformation``, inference in ``assumptions``.
    """

    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1500)] = Field(
        description="Two to four sentences restating what this system is, in the analyst's terms."
    )
    purpose: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1500)] = Field(
        description="What the system is intended to accomplish, as stated by the analyst."
    )
    system_scope: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1500)] = Field(
        default="",
        description="What is inside the system and what is outside it, only as far as the input supports.",
    )

    actors: list[ShortText] = Field(
        default_factory=list, max_length=60, description="Roles that interact with the system."
    )
    stakeholders: list[ShortText] = Field(default_factory=list, max_length=60)
    processes: list[ShortText] = Field(default_factory=list, max_length=60, description="Steps described by the analyst.")
    inputs: list[ShortText] = Field(default_factory=list, max_length=60)
    outputs: list[ShortText] = Field(default_factory=list, max_length=60)
    data_entities: list[ShortText] = Field(default_factory=list, max_length=60)
    technologies: list[ShortText] = Field(default_factory=list, max_length=60)
    business_rules: list[ShortText] = Field(default_factory=list, max_length=60)
    assumptions: list[ShortText] = Field(
        default_factory=list,
        max_length=40,
        description="Only inferences that go beyond the input; each one must say what it rests on.",
    )
    missing_information: list[ShortText] = Field(
        default_factory=list,
        max_length=40,
        description="What the input does not say, phrased as a question the analyst can answer.",
    )


# ------------------------------------------------------------------ envelopes

class SystemUnderstandingRequest(_Camel):
    system_information: SystemInformationInput = Field(
        description="The saved System Information record for one project."
    )


class AnalysisMeta(_Camel):
    """How the answer was produced. All values are measured, not estimated."""

    provider: str
    model: str | None = None
    generated_at: str
    duration_ms: int = Field(ge=0)
    attempts: int = Field(ge=1, le=3, description="1 = succeeded first time; up to 3 with the retry budget.")
    prompt_chars: int = Field(ge=0, description="Size of the prompt actually sent.")
    response_chars: int = Field(ge=0)
    schema_version: Literal[1] = 1


class SuccessEnvelope(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=False)
    success: Literal[True] = True


class SystemUnderstandingResponse(SuccessEnvelope):
    data: SystemUnderstanding
    meta: AnalysisMeta


class AnalysisTaskInfo(_Camel):
    """One analysis task the API knows about, and whether it can run yet."""

    type: str
    label: str
    status: Literal["available", "not-implemented"]
    note: str


class AnalyzeAvailabilityResponse(SuccessEnvelope):
    data: list[AnalysisTaskInfo]
