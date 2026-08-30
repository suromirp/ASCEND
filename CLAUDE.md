# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

## What ASCEND is

ASCEND is a personal training-and-adventure command center, not a workout
logger. It ties daily strength training and cardio to a larger goal —
running, hiking, elevation gain, backpack capacity, and eventually
multi-day Alpine trips such as the GR5. The product's single throughline:

```
MISSION → TRAINING → CAPACITY → PROGRESSION → OBJECTIVE → ADVENTURE → ASCENT
```

Every screen exists to answer one question within two seconds of opening
the app: **what is my mission today?**

It's a fully client-side, offline-first, installable PWA. No backend, no
account, no server — everything lives in the user's browser via IndexedDB.
User-facing copy in the app and README is Dutch; keep new user-facing
strings consistent with that unless told otherwise.

## Stack

- **React 19 + TypeScript (strict) + Vite**
- **Tailwind CSS v4**, configured via `@theme` tokens in `src/index.css`
  (not a `tailwind.config.js`)
- **IndexedDB** via the `idb` wrapper (`src/storage/database.ts`) for local,
  offline-first persistence
- **react-router-dom** with `HashRouter` — required so client-side routing
  works with no server config on GitHub Pages
- **vite-plugin-pwa** for installability, offline caching, and the manifest
- **oxlint** for linting (`npm run lint`), not ESLint
- Package manager: npm (`package-lock.json` is committed)

## Commands

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

### The core rule

**React components never contain training logic.** A component calls a
function in `engine/` or `storage/` and renders the result. This keeps the
scheduler, progression math, and readiness formulas fully testable in
isolation from the UI. When adding a feature, put the decision-making in
`engine/`, not in a component or in `AppDataContext`.

### Data architecture

Domain models are never coupled to a specific external service. Model
`OutdoorMetric` / `RecoveryMetric` / etc. with a `source` field
(`'manual' | 'garmin' | 'health-connect' | 'macrofactor' | 'import'`), never
a vendor-specific field like `garminElevation`. When a Garmin or Health
Connect adapter lands, it writes the exact same shapes — no screen or
engine file should need to change. See `src/integrations/types.ts` for the
adapter interface every future integration builds against.

### Scheduling architecture

Three distinct concepts, never merged:

| Concept | Meaning | Rewrites history? |
|---|---|---|
| `SessionTemplate` | Reusable definition of a workout ("Upper Body A") | — |
| `PlannedSession` | A template scheduled onto a date | Yes — movable/skippable |
| `SessionLog` | What actually happened | **Never** — append-only |

Completion is never stored as a flag. A session is "done" the moment a
`SessionLog` exists that references the `PlannedSession`
(`engine/sessionStatus.ts`). This means editing the plan can never
overwrite history.

The scheduler (`engine/scheduler.ts`) is **deterministic** — no AI, no
guessing. It enforces one concrete rule: two "leg-heavy" sessions (Lower
Body or a hike) must not land within 48 hours of each other. Moving a
session into conflict produces a **cascade proposal**: the engine proposes
shifting the conflicting session to the next free, conflict-free day in the
same week, shown via `RescheduleDialog` — nothing is applied without
confirmation. Additional rules from the original brief (avoid stacking too
many heavy days, drop optional sessions first) are deliberately not yet
automated; the architecture already supports adding them as pure functions
in `engine/`.

### Progression / Ascent Ladder architecture

Objectives mirror the session pattern:

- `Objective` + `MilestoneDefinition[]` — the static ladder ("what it would take")
- `MilestoneProgress` — append-only records of *when* a milestone was cleared

`engine/progression.ts` resolves each milestone as satisfied either via an
explicit `MilestoneProgress` row, or automatically because a `SessionLog`
already meets the requirement (e.g. a hike with 750+ m D+). Milestones with
a manual requirement (`kind: 'manual'`) are cleared explicitly from the
Ascend screen.

Readiness percentages (`engine/readiness.ts` — strength, cardio,
climbing/D+, endurance, recovery, consistency, pack capability) are
intentionally simple, isolated formulas over the last 28 days of logs. Each
formula lives in its own commented section so it can be replaced later
(e.g. HRV-adjusted recovery via Garmin) without touching the rest of the
file.

### Import / export

Settings → Export downloads readable JSON with `schemaVersion`,
`exportDate`, the program, templates, planned sessions, logs, objectives,
and milestone progress. Import replaces current data with the contents of
such a file. `storage/migrations.ts` is a minimal pass-through for
`schemaVersion: 1` today; future schema changes get their own
`migrateV1toV2`-style step so an export made today still imports years from
now. When you change a persisted shape, add a migration step here — don't
just change the shape in place.

## Design language

Dark, "alpine expedition" aesthetic — bronze/gold accents on near-black,
serif display type for headings, sans body text.

- Theme tokens are defined once in `src/index.css` under `@theme` and
  consumed via Tailwind (`bg-[var(--color-card)]`) or inline `style`
  objects — **not** hardcoded hex values in components.
  - Backgrounds: `--color-bg` `--color-charcoal` `--color-surface`
    `--color-card` (with `--color-card-border`)
  - Text: `--color-ink` (primary), `--color-ink-dim` (secondary)
  - Accents: `--color-bronze` `--color-gold` `--color-bronze-dark`
    (primary actions, emphasis), `--color-alpine` `--color-stone`
    `--color-sky` `--color-snow` (secondary/status)
  - Status: `--color-success` `--color-warning` `--color-danger`
- Typography: `--font-display` (Marcellus, via `.font-display`) for
  headings/wordmarks, `--font-sans` (Inter) for everything else. Loaded via
  a Google Fonts `@import` in `src/index.css`.
- `html { color-scheme: dark }` — the app is dark-only, there is no light
  theme to preserve.
- Shared primitives live in `src/components/ui.tsx` (`Card`,
  `PrimaryButton`, `SecondaryButton`, `StatusDot`, `Eyebrow`) — reuse these
  rather than re-implementing card/button chrome in a page or feature
  component.
- Cards are `rounded-2xl` with a subtle border; the optional `topo-texture`
  class adds a very low-opacity topographic contour pattern — use it
  sparingly on specific cards, never as a global background.
- Mobile-first, single-column, `max-w-md`, bottom tab navigation
  (`BottomNav` in `src/App.tsx`) with a safe-area-aware sticky bar.
  `@media (prefers-reduced-motion: reduce)` is respected globally.

## Engineering rules

- **Business logic belongs in `engine/`**, never in a component or in
  `AppDataContext`. `AppDataContext` (`src/state/AppDataContext.tsx`) wires
  storage reads/writes to engine calls and exposes plain data + actions —
  it should stay thin.
- **`SessionLog` and `MilestoneProgress` rows are append-only.** Never
  mutate or delete one to "correct" history; add a new record instead.
  Anything representing history follows this pattern, not just these two
  types.
- **Domain models never reference a vendor.** Add a `source` field instead
  of a service-specific field or type. See `src/models/metrics.ts` and
  `src/models/training.ts` for the existing pattern.
- **The scheduler stays deterministic.** Don't introduce randomness or an
  LLM call into `engine/scheduler.ts`; a future AI layer may translate free
  text into constraints, but the deterministic functions in `engine/`
  remain the only thing that actually schedules.
- **Weeks are derived, not stored.** A week is just seven days starting on
  a Monday; which phase/week-number it belongs to is computed from
  `Program.startDate` + `Phase.weekCount` (`utils/dates.ts`), never
  persisted as its own entity.
- Routing must stay on `HashRouter` — GitHub Pages serves no server-side
  rewrites, so a browser-history router would 404 on refresh/deep links.
- The Vite `base` path is driven by the `ASCEND_BASE_PATH` env var
  (`vite.config.ts`), not hardcoded — it must resolve correctly both for a
  GitHub Pages project page (`/<repo>/`) and a root/custom domain (`/`).
- TypeScript is strict; new code should stay warning-free under both `tsc`
  and `oxlint` (`.oxlintrc.json`).
- Keep new integrations behind the `DataSourceAdapter` interface
  (`src/integrations/types.ts`) rather than calling a vendor SDK directly
  from engine/UI code.

## Do not

- Do not add a backend, account system, or remote data store — ASCEND is
  local-only by design.
- Do not switch off `HashRouter` or otherwise assume server-side routing.
- Do not store "completed" as a boolean flag on `PlannedSession` — status
  is derived from the presence of a `SessionLog`.
- Do not redesign the visual language (colors, type, layout) as a side
  effect of an unrelated change; extend the existing token set instead of
  introducing new hardcoded colors.
