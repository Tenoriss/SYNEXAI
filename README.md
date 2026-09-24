# SYNEX AI

**AI-powered general system analysis platform.** SYNEX AI helps analysts understand, document, evaluate
and improve *any* information system (academic, inventory, hospital, e-commerce, banking, …) using
structured methodology (PIECES, requirements, process analysis, diagrams) with AI as the analysis engine.

> **Status:** Phase 3 — System information input. Projects can be created, searched, filtered, edited, archived and
> deleted, and each project can now hold the structured system information an analysis needs: nine sections, saved
> locally as you type, with completeness derived from what is really recorded. The backend still serves health only;
> Gemini analysis arrives in Phase 4 and PIECES/requirements/diagrams in later phases.

## Architecture

```text
React (Vite, TS, Tailwind)  ──►  LocalStorage (synex_* keys, via StorageService)
        │  relative /api/*  (Vite dev proxy)
        ▼
FastAPI backend  ──►  AIProvider (Gemini, Phase 4)
```

- The browser **never** calls Gemini and never sees the API key. It only calls relative `/api/*` URLs.
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
cd backend && ./venv/bin/python -m pytest      # API tests (9)
cd frontend && npm test                         # storage, project + system-information tests (106)
cd frontend && npm run build                    # type-check + production build
```

## Configuration (`backend/.env`)

| Variable         | Default                                         | Purpose                                   |
| ---------------- | ----------------------------------------------- | ----------------------------------------- |
| `AI_PROVIDER`    | `gemini`                                        | Active AI provider                        |
| `GEMINI_API_KEY` | —                                               | Gemini key (backend only, never committed) |
| `GEMINI_MODEL`   | `gemini-2.5-flash`                              | Model used for analysis (Phase 4)         |
| `CORS_ORIGINS`   | `http://localhost:5173,http://127.0.0.1:5173`   | Allowed browser origins                   |
| `APP_ENV`        | `development`                                   | `production` disables `/api/docs`         |

`backend/.env` is git-ignored. Only `backend/.env.example` is committed.

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

## Project structure

```text
backend/
  app/
    main.py            FastAPI app factory, CORS, error handlers
    config.py          Settings from env (key never serialised)
    api/               Routers (/api/health)
    schemas/           Pydantic models (health, error envelope)
    utils/errors.py    Safe, uniform error responses
    ai/ analysis/ diagrams/ reports/ services/   (Phase 4+)
  tests/
frontend/
  src/
    app/               App, router, theme provider, error boundary
    layouts/           AppLayout (sidebar + header + content)
    components/        ui/ primitives, layout/ (Sidebar, Header), projects/ (form, table, cards, dialogs),
                       systemInformation/ (form, section cards, dynamic lists, save status, sections/)
    pages/             Dashboard, Settings, projects/ (list, new, overview, system), placeholders for later phases
    features/          projects/ — validation, search/filter/sort; systemInformation/ — sections, completeness,
                       validation, draft list operations (all pure and unit-tested)
    hooks/             useStorageQuery, useProjects, useProject, useSystemInformation, useActiveSection,
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

Current schema version: **2**. Phase 1 stored projects with a free-text `domain`; reading a v1 envelope migrates
`domain → systemType` and adds the empty `organization` / `analyst` fields, then writes the upgraded value back
once. Migration tests live in `frontend/src/storage/StorageService.test.ts`, so existing local data is carried
forward instead of being discarded.

## Roadmap

1. ✅ Foundation · 2. ✅ Project management · 3. ✅ System information input · 4. Gemini AI · 5. System understanding ·
6. PIECES / findings / recommendations · 7. Requirements · 8. Process analysis · 9. Diagrams ·
10. Report & PDF · 11. Polish
