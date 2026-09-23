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
`EmptyState` · `Skeleton` · `PageHeader` · `Dialog` (focus trap, Escape, focus restore). Reuse and extend
these before creating new components.

## Motion

Framer Motion, sparingly: 120ms (hover) · 200ms (page/modal) · 300ms (large). Easing `cubic-bezier(0.2,0,0,1)`.
`MotionConfig reducedMotion="user"` plus a CSS `prefers-reduced-motion` override.
No infinite decorative animation, no bouncing, no glowing.

## Accessibility

Semantic landmarks, skip link, visible `:focus-visible` ring everywhere, labelled icon buttons,
`aria-current` in nav/breadcrumb, accessible dialogs, and meaning never conveyed by colour alone.

## States

- **Empty:** what's missing + what to do next + primary action.
- **Loading:** skeletons; AI work uses named analysis stages (✓ / ● / ○), never fake percentages.
- **Error:** what happened + what the user can do + reassurance that local data is safe.

## Writing

Short, clear, professional English. "Start Analysis", not "Execute AI Analysis Process".
