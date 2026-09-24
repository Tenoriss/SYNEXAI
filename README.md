# SYNEX AI

**AI-powered general system analysis platform.** SYNEX AI helps analysts understand, document, evaluate
and improve *any* information system (academic, inventory, hospital, e-commerce, banking, …) using
structured methodology (PIECES, requirements, process analysis, diagrams) with AI as the analysis engine.

> **Status:** Phase 4 — Gemini AI integration. Projects hold the structured system information an analysis needs, and
> that record can now be sent to the backend, which asks the configured AI provider, validates the answer against a
> Pydantic schema and returns it as `{ "success": true, "data": … }` for the System Understanding screen. This phase is
> *infrastructure*: PIECES, requirements, findings, diagrams and PDF reports are still later phases and are not faked.

## Architecture

```text
React (Vite, TS, Tailwind)
   ├──► LocalStorage (synex_* keys, via StorageService)      projects · system information · analysis results
   └──► relative /api/*  (Vite dev proxy)
             ▼
        FastAPI backend  ──►  AIProvider interface  ──►  GeminiProvider (google-genai)
             ▲                        │
             │  validated JSON        └──► Gemini API, with the key from backend/.env
        { success, data, meta }
```

- The browser **never** calls Gemini and never sees the API key. It only calls relative `/api/*` URLs.
- AI output is validated twice: by Pydantic on the way out of the backend, and again before it is stored in the
  browser. Raw model text never becomes an "analysis".
- The frontend owns persistence. All storage goes through `StorageService` → repository interfaces →
  LocalStorage implementations, so a PostgreSQL-backed implementation can replace it later.

## Requirements

- Node.js ≥ 20.19 (22 LTS recommended)
- Python ≥ 3.11 (target 3.14+)

## Getting started

### 1. Backend (http://localhost:8000)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then set GEMINI_API_KEY (needed from Phase 4)
uvicorn app.main:app --reload --port 8000
```

- Health: http://localhost:8000/api/health
- API docs (development only): http://localhost:8000/api/docs

### 2. Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. Override with `API_PROXY_TARGET=http://host:port npm run dev`.

## Tests

```bash
cd backend && ./venv/bin/python -m pytest      # API, provider, prompt, validation + transport tests (63)
cd frontend && npm test                         # storage, projects, system information + analysis logic (126)
cd frontend && npm run build                    # type-check + production build
```

## Configuration (`backend/.env`)

| Variable             | Default                                                  | Purpose                                                        |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `AI_PROVIDER`        | `gemini`                                                  | Active provider; anything else is reported, never guessed      |
| `GEMINI_API_KEY`     | —                                                         | Gemini key (backend only, never committed, never in the UI)    |
| `GEMINI_MODEL`       | `gemini-2.5-flash`                                        | The model for every AI request — the only place it is set       |
| `AI_TIMEOUT_SECONDS` | `120`                                                     | Deadline per provider call → `AI_TIMEOUT`                      |
| `AI_MAX_RETRIES`     | `2`                                                       | Extra attempts for transient failures, clamped to 0–2          |
| `AI_TEMPERATURE`     | `0.2`                                                     | Low by design: the analysis restates input, it does not create |
| `GEMINI_BASE_URL`    | —                                                         | Optional endpoint override (proxy, gateway, local test stub)   |
| `CORS_ORIGINS`       | `http://localhost:5173,http://127.0.0.1:5173`             | Allowed browser origins (explicit list, no `*`)                |
| `APP_ENV`            | `development`                                             | `production` disables `/api/docs`                              |

`backend/.env` is git-ignored. Only `backend/.env.example` is committed, and it holds empty values. The frontend has
**no** `VITE_*` variable for keys — the only optional one, `VITE_API_BASE_URL`, is an origin override.

## Project management (Phase 2)

| Route                 | Screen                                                              |
| --------------------- | ------------------------------------------------------------------- |
| `/`                   | Dashboard — counts and recent projects read from real stored data  |
| `/projects`           | Project list: search, status filter, sort, row actions              |
| `/projects/new`       | Create Project form                                                 |
| `/projects/:projectId` | Project overview: metadata, status, archive/duplicate/delete, module placeholders, system-information status |
| `/projects/:projectId/system` | System Information workspace (Phase 3, documented below)   |

Layering (no component touches `localStorage` directly):

```text
UI (pages, components/projects)
  → hooks/useProjects.ts            list, single project, all mutations + notifications
    → features/projects/*           pure validation, search/filter/sort/counts
      → StorageService              cross-entity rules, change events, quota/corruption handling
        → LocalStorageProjectRepository   CRUD + archive/restore/duplicate, schema migration
          → LocalStorageDriver            synex_projects
```

- `Project`: `id`, `name`, `description`, `systemType`, `organization`, `analyst`, `status`, `createdAt`, `updatedAt`.
  Statuses: `Draft · Analyzing · Completed · Needs Review · Archived`. Only the user sets a status — nothing is
  ever auto-marked Completed.
- Required fields (`name`, `description`, `systemType`) are validated inline in the form **and** re-checked in the
  repository. `createdAt` and `id` survive edits; `updatedAt` moves.
- Delete always asks first, and cascades to that project's analysis versions. Archive is a status change only —
  the record and its history stay stored and remain reachable through the *Archived* filter.
- Empty, loading, error, corrupted-data and "Project not found" states are all real UI states; no demo projects,
  scores or progress percentages exist anywhere.

## System information (Phase 3)

The analysis input: for every project the analyst records what the system *is* — purpose, people, current process,
problems, technology, data, rules, objectives, constraints — and SYNEX AI stores exactly that. No AI runs in this
phase; nothing is generated, suggested or completed on the analyst's behalf.

```text
UI (pages/projects/SystemInformationPage, components/systemInformation/*)
  → hooks/useSystemInformation.ts                     draft, dirty tracking, debounced auto-save, save & continue
    → features/systemInformation/*                     sections, completeness rules, validation, list operations
      → StorageService                                 get / save / update / delete + delete cascade
        → LocalStorageSystemInformationRepository      one record per project, normalised on read and on write
          → LocalStorageDriver                         synex_system_information
```

- `SystemInformation`: `systemName`, `systemType`, `systemPurpose`, `systemDescription`, `organization`,
  `stakeholders[]`, `users[]`, `currentWorkflow` (+ optional trigger / input / main processing / output / decision
  points), `problems[]`, `technologies[]`, `dataEntities[]`, `businessRules[]`, `objectives[]`, `constraints`,
  `additionalNotes`, `createdAt`, `updatedAt`. Each list entry carries its own `id`. The shape is plain JSON so the
  same record can be posted to the backend unchanged in Phase 4/5.
- Nine sections in separate components (overview · stakeholders & users · current process · problems · technology ·
  data · business rules · objectives & constraints · notes), reachable from a sticky section rail that turns into a
  scrollable row on small screens.
- **Save Draft** keeps the analyst on the page and answers "Changes saved"; **Save & Continue** validates first and
  returns to the Project Overview. Auto-save is debounced and silent; a failed save says so instead of pretending.
- Only `System Name`, `System Type` and `System Purpose` are required, validated inline with `aria-invalid` +
  `role="alert"` and a focus move to the first cause. A half-documented system still saves as a draft.
- Completeness is derived from stored content — "N of 9 sections completed", and *Not started / In progress /
  Complete* on the overview card and the dashboard, all from real counts (`0 stakeholders`, `Not provided`, …).
- Problems are recorded as observations: no severity and no PIECES category, because those are analysis outputs.
- Leaving with unsaved typing warns (Stay / Leave) after trying to flush; closing the tab uses the browser's own
  guard. Corrupted or malformed stored values are skipped or moved to `synex_corrupt_*` — one bad record never
  crashes the workspace, and deleting a project deletes its system information with it.

## AI integration (Phase 4)

One task runs today: **system understanding** — the analyst's own System Information, restated as a structured
understanding. It is deliberately *not* an opinion about the client.

```text
SystemInformationPage → Analyze System (saves the draft first)
  → pages/projects/SystemUnderstandingPage            states: idle · preparing · analyzing · success · error
    → hooks/useAnalysis.ts                            pre-flight, one request, abort, persist, never overwrite
      → services/ApiService.ts                        POST /api/analyze/system-understanding (150 s budget)
        → app/api/analyze.py                          thin route
          → app/services/ai_service.py                 prompt build · retry · parse · validate · safe logging
            → app/ai/factory.py → app/ai/gemini.py     google-genai Client.aio.models.generate_content
        ← { success: true, data: SystemUnderstanding, meta }   re-validated in the browser, then stored
```

### Endpoints

| Method & path                          | Result                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/analyze/system-understanding` | `200 { success, data, meta }` · `400` nothing to analyze · `422` malformed body |
| `POST /api/analyze`                    | dispatches `system-understanding`; other task types answer `501 AI_TASK_NOT_IMPLEMENTED` |
| `GET /api/analyze/tasks`               | which tasks this server can run (`available` / `not-implemented`)              |
| `GET /api/health`                      | `ai: { provider, supported, configured, model, timeoutSeconds }` — never the key |

Error codes: `AI_NOT_CONFIGURED` (503), `AI_INPUT_REQUIRED` (400), `AI_TIMEOUT` (504), `AI_RATE_LIMITED` (429),
`AI_MODEL_UNAVAILABLE` (503), `AI_INVALID_RESPONSE` (502), `AI_PROVIDER_FAILURE` (502), `AI_PROVIDER_UNSUPPORTED` (503),
`AI_TASK_NOT_IMPLEMENTED` (501). Every message says what to do next and none contains a key, a header or the provider's
raw payload.

### What the model may and may not produce

`SystemUnderstanding` has thirteen validated fields — `summary`, `purpose`, `systemScope`, `actors`, `stakeholders`,
`processes`, `inputs`, `outputs`, `dataEntities`, `technologies`, `businessRules`, `assumptions`,
`missingInformation`. The system instruction pins the contract: user-provided facts are restated, anything the input
does not say becomes a question in `missingInformation`, and any inference the model makes must appear in
`assumptions` — never as a fact. Inventing users, stakeholders, processes, technologies, databases, business rules,
organisational structures or security controls is an error, and the prompt carries "(not provided)" for every gap so
the model has nothing to dress up. Structured output is requested through `response_mime_type="application/json"` plus
`response_schema`; the answer is parsed, validated and only then returned. Extra keys the model adds are dropped.

### Progress, persistence and versions

- States are `Idle → Preparing → Analyzing → Success | Error`. While running the UI says "Understanding your system…"
  with elapsed seconds — there is no progress percentage anywhere, because a single provider call has none to show.
- Results are stored per project in `synex_analysis_versions` as
  `{ id, projectId, type, createdAt, updatedAt, sourceInformationUpdatedAt, input, result, meta }`. Re-running
  **appends**: the previous result stays, and the analyst's System Information is never written back.
- `meta` carries measured values only: provider, model, duration, attempts, prompt/response size.
- A result is flagged "Input changed since" when `sourceInformationUpdatedAt` no longer matches the stored record.

### Provider architecture

`app/ai/base.py` defines the interface (`AIProvider.generate`, `AIErrorCategory`), `app/ai/gemini.py` is the only file
that imports the SDK, and `app/ai/factory.py` maps `AI_PROVIDER` to an implementation with a cached client. Adding
OpenAI, Ollama or Groq means one provider module plus one factory branch: no route, schema, prompt or UI change.
Transient failures (`AI_TIMEOUT`, `AI_RATE_LIMITED`, provider 5xx) are retried at most twice; an invalid or blocked
answer is never retried, because sending the same prompt again does not fix it.

## Project structure

```text
backend/
  app/
    main.py            FastAPI app factory, CORS, error handlers
    config.py          Settings from env (key never serialised)
    api/               Routers: /api/health, /api/analyze/*
    schemas/           Pydantic models (health, error envelope, ai: request + SystemUnderstanding + envelopes)
    services/          prompts.py (prompt building), ai_service.py (retry, validation, safe logging)
    utils/errors.py    Safe, uniform error responses ({ success: false, error })
    ai/                base.py (provider contract), gemini.py (google-genai), factory.py (AI_PROVIDER → client)
    analysis/ diagrams/ reports/   (later phases; empty on purpose)
  tests/               API + provider + prompt + validation + SDK-transport tests
frontend/
  src/
    app/               App, router, theme provider, error boundary
    layouts/           AppLayout (sidebar + header + content)
    components/        ui/ primitives, layout/ (Sidebar, Header), projects/ (form, table, cards, dialogs),
                       systemInformation/ (form, section cards, dynamic lists, save status, sections/),
                       analysis/ (result groups, meta bar, running state, failure notice)
    pages/             Dashboard, Settings, projects/ (list, new, overview, system, analysis), placeholders
    features/          projects/ — validation, search/filter/sort; systemInformation/ — sections, completeness,
                       validation, draft list operations; analysis/ — request payload, response guards, pre-flight,
                       provenance (all pure and unit-tested)
    hooks/             useStorageQuery, useProjects, useProject, useSystemInformation, useAnalysis, useActiveSection,
                       useNavigationGuard, useBreadcrumb, useBackendHealth, useTheme, …
    services/          ApiService
    storage/           StorageService, driver, versioned collections, repositories
    types/ utils/ data/ styles/
Design.md              Design system reference
```

## Local data

Keys: `synex_projects`, `synex_system_information`, `synex_analysis_versions`, `synex_settings`. Each value is wrapped in a versioned
envelope `{ schemaVersion, updatedAt, data }`. Invalid records are skipped, unreadable values are moved to
`synex_corrupt_*` (never silently deleted), and data from a newer schema is never overwritten.
**Settings → Local data → Reset data** removes every `synex_*` key.

Current schema version: **3**.

- v1 → v2: projects stored a free-text `domain`; it migrates to `systemType` and the empty `organization` /
  `analyst` fields are added.
- v2 → v3: an analysis entry becomes a versioned result — `type`, `updatedAt`, `sourceInformationUpdatedAt`, a
  validated `result`, measured `meta` and the Phase 3 `input` snapshot replace the Phase 1 `inputSnapshot`. Legacy
  entries whose result cannot be validated are kept as an empty understanding rather than trusted as analysis.

Both upgrades run on read and are written back once. Migration tests live in
`frontend/src/storage/StorageService.test.ts`, so existing local data is carried forward instead of discarded.

## Roadmap

1. ✅ Foundation · 2. ✅ Project management · 3. ✅ System information input · 4. ✅ Gemini AI + provider architecture ·
5. System understanding (curated views over the generated result) ·
6. PIECES / findings / recommendations · 7. Requirements · 8. Process analysis · 9. Diagrams ·
10. Report & PDF · 11. Polish
