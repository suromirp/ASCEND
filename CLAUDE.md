# ASCEND

ASCEND is a mobile-first personal training and adventure application.

Guidance for Claude Code (and any other agent) working in this repository.

## Core identity

The experience combines:

- Stoic discipline
- physical progression
- mountain adventure
- premium performance software

Primary philosophy:

```
Mission → Training → Capability → Progression → Objective → Adventure → Ascend
```

Every screen exists to answer one question within two seconds of opening
the app: **what is my mission today?**

User-facing copy in the app and README is Dutch; keep new user-facing
strings consistent with that unless told otherwise.

## Design

- dark premium UI
- charcoal / stone backgrounds
- bronze and muted gold accents
- muted Alpine green allowed
- Roman/Stoic influence should remain subtle
- adventure/mountain/topographic influences
- never make the UI look like an RPG
- never make it look like a generic bodybuilding app
- mobile-first

### Design tokens in code

Theme tokens are defined once in `src/index.css` under `@theme` and
consumed via Tailwind (`bg-[var(--color-card)]`) or inline `style` objects
— never hardcode hex values in a component.

- Backgrounds: `--color-bg` `--color-charcoal` `--color-surface`
  `--color-card` (with `--color-card-border`)
- Text: `--color-ink` (primary), `--color-ink-dim` (secondary)
- Accents: `--color-bronze` `--color-gold` `--color-bronze-dark` (primary
  actions, emphasis), `--color-alpine` `--color-stone` `--color-sky`
  `--color-snow` (secondary/status)
- Status: `--color-success` `--color-warning` `--color-danger`
- Typography: `--font-display` (Marcellus, via `.font-display`) for
  headings/wordmarks, `--font-sans` (Inter) for everything else
- `html { color-scheme: dark }` — the app is dark-only, there is no light
  theme to preserve
- Shared primitives live in `src/components/ui.tsx` (`Card`,
  `PrimaryButton`, `SecondaryButton`, `StatusDot`, `Eyebrow`) — reuse these
  rather than re-implementing card/button chrome in a page or feature
  component
- Cards are `rounded-2xl` with a subtle border; the optional `topo-texture`
  class adds a very low-opacity topographic contour pattern — use it
  sparingly on specific cards, never as a global background
- Single-column, `max-w-md`, bottom tab navigation (`BottomNav` in
  `src/App.tsx`) with a safe-area-aware sticky bar.
  `@media (prefers-reduced-motion: reduce)` is respected globally

## Brand

Name: ASCEND

Brand line:

```
Train. Progress. Explore. Ascend.
```

## Engineering

- React 19
- TypeScript (strict)
- Vite
- Tailwind CSS v4 (theme via `@theme` tokens, not `tailwind.config.js`)
- IndexedDB (via the `idb` wrapper)
- react-router-dom with `HashRouter` — required so routing works with no
  server config on GitHub Pages
- vite-plugin-pwa — installability, offline caching, manifest
- oxlint for linting (`npm run lint`), not ESLint
- No backend, no account — everything is local to the user's device

Keep domain logic separate from React components. A component calls a
function in `engine/` or `storage/` and renders the result — this keeps
the scheduler, progression math, and readiness formulas fully testable in
isolation from the UI.

### Commands

```bash
npm ci             # install (CI/reproducible)
npm run dev        # vite dev server, http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # preview the production build locally
```

## Architecture

```
src/
  components/    Reusable UI components — no business logic
  pages/         The five screens: Today, Week, Ascend, History, Settings
  engine/        All business logic: scheduler, progression, readiness
  models/        TypeScript domain models — no React, no IndexedDB code
  storage/       IndexedDB layer, export/import, schema migrations
  integrations/  Adapter interface for future Garmin/Health Connect/MacroFactor
  data/          The default demo program (templates, GR5 ladder, seed history)
  state/         AppDataContext — wires storage + engine to the UI
  utils/         Date math, id generation
```

Training definitions, scheduled sessions, and completed session logs are
separate entities:

| Concept | Meaning | Rewrites history? |
|---|---|---|
| `SessionTemplate` | Reusable definition of a workout ("Upper Body A") | — |
| `PlannedSession` | A template scheduled onto a date | Yes — movable/skippable |
| `SessionLog` | What actually happened | **Never** — append-only |

**Never rewrite historical logs when schedules change.** Completion is
never stored as a flag — a session is "done" the moment a `SessionLog`
exists that references the `PlannedSession` (`engine/sessionStatus.ts`).
The same append-only pattern applies to `MilestoneProgress` (the record of
when an Ascent Ladder milestone was actually cleared, vs. the static
`Objective` / `MilestoneDefinition` ladder).

**Scheduling logic belongs in `/engine`.** The scheduler
(`engine/scheduler.ts`) is deterministic — no AI, no guessing. It enforces
one concrete rule: two "leg-heavy" sessions (Lower Body or a hike) must not
land within 48 hours of each other. Moving a session into conflict produces
a cascade proposal (shown via `RescheduleDialog`) rather than applying
silently.

Readiness percentages (`engine/readiness.ts` — strength, cardio,
climbing/D+, endurance, recovery, consistency, pack capability) are
intentionally simple, isolated formulas over the last 28 days of logs, each
in its own commented section so a formula can be swapped later without
touching the rest of the file.

Weeks are derived, not stored: a week is just seven days starting on a
Monday; which phase/week-number it belongs to is computed from
`Program.startDate` + `Phase.weekCount` (`utils/dates.ts`), never persisted
as its own entity.

**External providers must use generic adapters — do not tightly couple
domain fields to provider names.** Model `OutdoorMetric` / `RecoveryMetric`
/ etc. with a `source` field (`'manual' | 'garmin' | 'health-connect' |
'macrofactor' | 'import'`), never a vendor-specific field like
`garminElevation`. Future providers land behind the `DataSourceAdapter`
interface in `src/integrations/types.ts` and populate the exact same
shapes — no screen or engine file should need to change:

- Garmin
- Health Connect
- MacroFactor
- AI assistant (a future AI layer may translate free text into
  constraints, but the deterministic functions in `engine/` remain the
  only thing that actually schedules)

### Import / export

Settings → Export downloads readable JSON with `schemaVersion`,
`exportDate`, the program, templates, planned sessions, logs, objectives,
and milestone progress. `storage/migrations.ts` is a minimal pass-through
for `schemaVersion: 1` today; future schema changes get their own
`migrateV1toV2`-style step so an export made today still imports years from
now. When you change a persisted shape, add a migration step here — don't
just change the shape in place.

## Deployment

Repository name:

```
ascend
```

GitHub Pages base path:

```
/ascend/
```

The base path is not hardcoded in the workflow — `.github/workflows/deploy.yml`
uses `actions/configure-pages` to read the repo's actual Pages
configuration and passes it to the build as `ASCEND_BASE_PATH`
(`vite.config.ts`), so it resolves to `/ascend/` for this project page and
would resolve correctly for a root/custom domain too, without editing the
workflow.

Any change must preserve:

```bash
npm ci
npm run build
```

The build must remain deployable through GitHub Actions (GitHub Pages,
via `actions/upload-pages-artifact` + `actions/deploy-pages`).

## Do not

- Do not add a backend, account system, or remote data store — ASCEND is
  local-only by design.
- Do not switch off `HashRouter` or otherwise assume server-side routing.
- Do not store "completed" as a boolean flag on `PlannedSession` — status
  is derived from the presence of a `SessionLog`.
- Do not redesign the visual language (colors, type, layout) as a side
  effect of an unrelated change; extend the existing token set instead of
  introducing new hardcoded colors.
- Do not let the UI drift toward an RPG or generic-bodybuilding-app look —
  keep the Stoic/alpine/premium tone.
