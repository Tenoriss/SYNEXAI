# SYNEX AI — Design System

Personality: **intelligent · analytical · professional · modern · calm · precise.**
SYNEX AI should feel intelligent because of the quality of its analysis, not because everything glows.

Source of truth for tokens: `frontend/src/styles/index.css`. Do not introduce colours outside these tokens.

## Colour tokens

| Token            | Light     | Dark      | Tailwind utility        |
| ---------------- | --------- | --------- | ----------------------- |
| background       | `#F7F8FC` | `#0D0F14` | `bg-background`         |
| surface          | `#FFFFFF` | `#151821` | `bg-surface`            |
| surface-muted    | `#F1F3F9` | `#1C202B` | `bg-surface-muted`      |
| primary          | `#5B5CE2` | `#7778F2` | `bg-primary`, `text-primary` |
| primary-hover    | `#4D4ED0` | `#8B8CF5` | `bg-primary-hover`      |
| primary-soft     | `#EEF0FF` | `#25274A` | `bg-primary-soft`       |
| secondary        | `#7C3AED` | `#A78BFA` | `text-secondary`        |
| text-primary     | `#171923` | `#F5F7FA` | `text-fg`               |
| text-secondary   | `#5F6472` | `#AEB4C2` | `text-fg-secondary`     |
| text-muted       | `#8B91A1` | `#777E8E` | `text-fg-muted`         |
| border           | `#E4E7EF` | `#292E3A` | `border-border`         |
| border-strong    | `#D4D8E3` | `#363C4A` | `border-border-strong`  |
| success / -soft  | `#16A34A` / `#EAF8EF` | `#4ADE80` / `#13291C` | `text-success`, `bg-success-soft` |
| warning / -soft  | `#D97706` / `#FFF4E5` | `#FBBF24` / `#2E2310` | `text-warning`, `bg-warning-soft` |
| error / -soft    | `#DC2626` / `#FDECEC` | `#F87171` / `#321717` | `text-error`, `bg-error-soft`     |
| info / -soft     | `#2563EB` / `#EAF2FF` | `#60A5FA` / `#14233D` | `text-info`, `bg-info-soft`       |

Dark mode uses layered surfaces (background → surface → surface-muted), never pure black. Semantic colours
are lightened in dark mode to keep contrast.

### PIECES identities

Always paired with **icon + label + text** — never colour alone.

| Dimension   | Colour | Utility                        |
| ----------- | ------ | ------------------------------ |
| Performance | Blue   | `text-pieces-performance`      |
| Information | Indigo | `text-pieces-information`      |
| Economy     | Green  | `text-pieces-economy`          |
| Control     | Orange | `text-pieces-control`          |
| Efficiency  | Purple | `text-pieces-efficiency`       |
| Service     | Teal   | `text-pieces-service`          |

## Typography

Inter (self-hosted via `@fontsource-variable/inter`), fallback `ui-sans-serif, system-ui, …`.

| Style      | Size / line / weight | Utility          |
| ---------- | -------------------- | ---------------- |
| Display    | 56 / 64 / 700        | `text-display`   |
| H1         | 40 / 48 / 700        | `text-h1`        |
| H2         | 32 / 40 / 700        | `text-h2`        |
| H3         | 24 / 32 / 600        | `text-h3`        |
| H4         | 20 / 28 / 600        | `text-h4`        |
| Body large | 18 / 28 / 400        | `text-body-lg`   |
| Body       | 16 / 24 / 400        | `text-body`      |
| Small      | 14 / 20 / 400        | `text-small`     |
| Caption    | 12 / 16 / 500        | `text-caption`   |

## Spacing, radius, elevation

- 8px system: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96.
- Card padding 24 · section gap 32 · page padding 32 desktop / 24 tablet / 16 mobile.
- Radius: `rounded-sm` 8 · `rounded-control` 10 (inputs, buttons) · `rounded-md` 12 · `rounded-lg` 16 (cards) ·
  `rounded-xl` 20 (modals) · `rounded-full` (badges).
- Shadows: `shadow-xs`, `shadow-sm`, `shadow-md` only. Prefer borders over shadows.

## Layout

Sidebar 240px (collapsed 72px, drawer below 1024px) · header 64px · content max-width 1440px.

## Components (frontend/src/components/ui)

`Button` (primary / secondary / ghost / destructive; 44px default) · `Card`, `CardHeader` · `Badge` ·
`EmptyState` · `Skeleton` · `PageHeader` · `Dialog` (focus trap, Escape, focus restore; `size="lg"` for forms,
`variant="danger"` for destructive confirmations) · `Field` + `TextInput` / `TextArea` / `SelectInput`
(visible label, counter, inline error as icon + text) · `ToastViewport` (polite live region, `useToast()`).
Reuse and extend these before creating new components.

### List and form patterns (Phase 2)

- **Status colour is never alone:** `ProjectStatusBadge` pairs a tone with a Lucide icon and the status word.
- **Table → cards:** a real `<table>` with caption, `scope` headers and row headers from `md` upward; the same
  data renders as cards below `md`. Never squeeze a six-column table into a phone.
- **Row actions** are icon buttons with unique accessible names ("Edit Warehouse Inventory System"), and they stop
  propagation so they never trigger the row link behind them.
- **Destructive actions** (delete, reset data) always open a `Dialog` confirm step; the first click never deletes.
- **Search/filter chips** carry live counts and are announced through `aria-live`; the visible count line states
  how many of how many are shown.
- **Relative dates** ("3 hours ago", "just now") in lists, with the absolute date/time in `title`; `formatDateTime`
  for detail pages.
- **Empty vs. no-match are different states:** "No projects yet" offers the create action; "No projects found"
  offers *Clear search and filters* and says stored data is unchanged.
- **Placeholders stay honest:** unimplemented modules are non-interactive list items labelled
  "Phase N", never disabled buttons that pretend to work.

### Analysis-input patterns (Phase 3)

- **Nine cards, never one giant form:** `SystemInformationForm` maps the documented sections onto `SectionCard`s and
  each section owns its own component under `components/systemInformation/sections/`. The page composes; it does not
  contain fields.
- **Numbering and anchors:** every section is a `<section id="si-section-<id>" aria-labelledby>` with a visible
  `N.` prefix, so `SectionNavigation` can jump to it and `useActiveSection` can show where the analyst is.
- **Sticky rail, scrollable row:** the section list sits beside the form on `lg` (`position: sticky`) and becomes a
  horizontally scrollable chip row below it. Each item states its own state in words — "information provided" /
  "not filled in yet" — never colour alone.
- **Dynamic entry lists:** `DynamicEntryList` adds, edits and removes rows with unique accessible names
  ("Remove stakeholder 1 “Head librarian”"). A blank row that is still being typed is kept, but it never counts as
  information anywhere.
- **Auto-save you can see:** debounced 1.2s with a `role="status"` line that reads *Unsaved changes → Saving… → Saved
  just now*, a failure state that names the reason, and a flush on in-app navigation so the unsaved-changes dialog
  only appears when a save genuinely could not happen.
- **Completeness is not analysis progress:** `CompletenessIndicator` and the overview card count sections holding real
  content ("4 of 9 sections completed"). No percentage, no AI status, no implied progress.
- **Nothing invented:** the only value the app ever fills in is a copy of the analyst's own project field
  (system type, organization). Everything else starts empty, and example text lives in placeholders and hints only.
- **Mobile stays single column:** both grid children carry `min-w-0`, so the scrollable chip row can never widen the
  document — the reason the class is there, kept so it is not removed by mistake.

## Motion

Framer Motion, sparingly: 120ms (hover) · 200ms (page/modal/toast) · 300ms (large). Easing `cubic-bezier(0.2,0,0,1)`.
`MotionConfig reducedMotion="user"` plus a CSS `prefers-reduced-motion` override; toasts and dialogs drop their
translate/scale when the user reduces motion. No infinite decorative animation, no bouncing, no glowing.

## Accessibility

Semantic landmarks, skip link, visible `:focus-visible` ring everywhere, labelled icon buttons,
`aria-current` in nav/breadcrumb, accessible dialogs, and meaning never conveyed by colour alone.

## States

- **Empty:** what's missing + what to do next + primary action.
- **Loading:** skeletons; AI work uses named analysis stages (✓ / ● / ○), never fake percentages.
- **Error:** what happened + what the user can do + reassurance that local data is safe.

## Writing

Short, clear, professional English. "Start Analysis", not "Execute AI Analysis Process".
