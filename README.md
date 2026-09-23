# SYNEX AI

**AI-powered general system analysis platform.** SYNEX AI helps analysts understand, document, evaluate
and improve *any* information system (academic, inventory, hospital, e-commerce, banking, …) using
structured methodology (PIECES, requirements, process analysis, diagrams) with AI as the analysis engine.

> **Status:** Phase 1 — Foundation. Project structure, backend API with health check, frontend shell,
> design system and the LocalStorage persistence layer are in place. AI analysis arrives in Phase 4.

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
cd backend && ./venv/bin/python -m pytest      # API tests
cd frontend && npm test                         # storage layer tests
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
    components/        ui/ primitives, layout/ (Sidebar, Header)
    pages/             Dashboard, Settings, placeholders for later phases
    hooks/             useStorageQuery, useBackendHealth, useTheme, …
    services/          ApiService
    storage/           StorageService, driver, versioned collections, repositories
    types/ utils/ data/ styles/
Design.md              Design system reference
```

## Local data

Keys: `synex_projects`, `synex_analysis_versions`, `synex_settings`. Each value is wrapped in a versioned
envelope `{ schemaVersion, updatedAt, data }`. Invalid records are skipped, unreadable values are moved to
`synex_corrupt_*` (never silently deleted), and data from a newer schema is never overwritten.
**Settings → Local data → Reset data** removes every `synex_*` key.

## Roadmap

1. ✅ Foundation · 2. Project management · 3. System input · 4. Gemini AI · 5. System understanding ·
6. PIECES / findings / recommendations · 7. Requirements · 8. Process analysis · 9. Diagrams ·
10. Report & PDF · 11. Polish
