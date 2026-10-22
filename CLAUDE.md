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

### Knoppen, kopjes en tikdoelen

- Knoppen staan in zinsletters ("Opslaan", "Gedaan in MacroFactor"), met
  normale letterspatiëring (geen `uppercase`, geen `tracking-wide`).
  Hoofdletters zijn alleen voor de kleine bronzen kopjes (`Eyebrow`, die
  zelf hoofdletters toont); een kopje met de hand opmaken mag niet waar
  `Eyebrow` past.
- Tikdoelen zijn minstens 44 bij 44 px (`min-h-[44px]`; `PrimaryButton` en
  `SecondaryButton` doen dit zelf). Een klein pictogram krijgt een
  onzichtbare uitbreiding (zie `InfoButton` en `Toggle` in `ui.tsx`).
- Dezelfde keuze heet overal hetzelfde: "Liever niet" (een voorstel
  afwijzen), "Niet nu" (uitstellen), "Annuleren" (afbreken), "Begrepen"
  (kennisnemen), "Beter / Normaal / Slechter".
- De meldingsbalk (`ChangeNotice`) klapt na enkele seconden in tot een
  ronde knop van 44 px en verdwijnt na tien minuten; hij blijft niet over
  de inhoud hangen.

### Steen en contour

De vaste stijl, uitgewerkt in `docs/visie/Visuele upgrade en nieuwe ideeën.md`
(deel 2 en 4) en vastgelegd in `docs/beslissingen/2026-10-22-steen-en-contour.md`.
De app moet aanvoelen als een goede kaart en een goed horloge.

- Eén gouden accent per scherm: de enige gouden knop of de ene kaart met de
  gouden gloed. Al het andere is steen: charcoal, haarlijnen, gedempte inkt.
- Contourlijnen (`topo-texture`) zijn versiering met betekenis en komen
  alleen op de missiekaart, één per scherm.
- Marcellus (`font-display`) is alleen voor woorden: paginatitels, namen van
  trainingen, een oordeel als "Fris". Alle getallen staan in Inter met vaste
  cijferbreedte (`font-sans tabular-nums`); een getal midden in een zin in
  Marcellus gaat in `Num` (`ui.tsx`). Eén heel groot getal (40 px of meer) mag
  in Marcellus, maar liever niet.
- Niets kleiner dan 12 px (`text-xs` is het minimum, ook voor `Eyebrow` en voor
  tekst in grafieken). Geen `text-[10px]` of `text-[11px]`.
- Iconen komen uit één eigen set in `src/components/icons.tsx` (`Icon`): lijn
  van 1,6 px, ronde uiteinden, de kleur van de omringende tekst. Geen
  bibliotheek, geen losse tekens als ✓ of ↷ voor iets wat een icoon kan zijn.
- Tabbalk: Vandaag, Week, Stand, Ascend, Logboek (`BottomNav` in
  `src/App.tsx`), met de actieve tab in goud en een streepje erboven. Meer is
  geen tab maar het tandwiel rechtsboven (`SettingsGear`): 44 bij 44 px, op
  elke tab op precies dezelfde plek, schuift met de pagina mee. Het opent
  `/more` (instellingen, gegevens en back-up, koppelingen, gidsen en kennis);
  oude links naar `/more` blijven werken. Een pagina die zelf iets rechtsboven
  nodig heeft (pijltjes, knoppen) laat daar ruimte voor het tandwiel vrij.

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
  pages/         The five tabs: Today, Week, Stand, Ascend, History; Settings (Meer) sits behind the gear
  engine/        All business logic: scheduler, progression, readiness
  models/        TypeScript domain models — no React, no IndexedDB code
  storage/       IndexedDB layer, export/import, schema migrations
  integrations/  Adapter interface for future Garmin/Health Connect/MacroFactor
  data/          The default demo program (templates, GR5 ladder, seed history)
  state/         AppDataContext — wires storage + engine to the UI
  utils/         Date math, id generation
```

Everything that counts sets (volume, top weights, set totals) goes through
`engine/workSets.ts#isWorkSet`, so a warm-up set is stored but never counted
(`docs/beslissingen/2026-10-22-kracht-per-set.md`).

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
One deliberate exception, at the owner's explicit request: a log made by hand
takes over the measured numbers of the watch and keeps its own in
`SessionLog.manualMeasured`, so it can be put back
(`docs/beslissingen/2026-10-22-garmin-is-leidend.md`). A second, of the same
kind: an existing strength log takes over the duration, sets and reps in
reserve of a MacroFactor workout, in the same field (its `strength` part) and
put back with the same `restoreManual`
(`docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md`, which
refers to the first and leaves it as it was).
The same append-only pattern applies to `MilestoneProgress` (the record of
when an Ascent Ladder milestone was actually cleared, vs. the static
`Objective` / `MilestoneDefinition` ladder).

**Scheduling logic belongs in `/engine`.** The scheduler
(`engine/scheduler.ts`) is deterministic — no AI, no guessing. It enforces
one concrete rule: two "leg-heavy" sessions (Lower Body or a hike) must not
land within 48 hours of each other. Moving a session into conflict produces
a cascade proposal (shown via `RescheduleDialog`) rather than applying
silently.

**Who may touch a planned session** (`engine/weekValidator.ts#lockLevel`):
history (logged or past) never; yours (`PlannedSession.lock`, set by your
own move/skip and by every other accepted proposal item, or legacy status
`'moved'`) never by the automatic planning; a restored row and a putting back
(a tocht changed back or removed, `PlanChangeItem.restore`) get no lock and no
fixed length, because they return to how the system had them
(`docs/beslissingen/2026-10-22-terugzetten-zonder-slot.md`); a test or race only through a proposal;
everything else the system planned is free. Every planning run ends with
the same pass (`engine/planPass.ts`): the race block, then the week check,
which repairs only the system's own sessions and only when the week is
demonstrably better, and announces it ("Planning bijgewerkt", with undo).
A proposal's preview runs that same pass, so what it shows is what you get.
The sync (`storage/database.ts#syncProgramHorizon`) runs whenever the
stored plan changed (a fingerprint is part of its key), not once a day.
Background jobs at boot run one after the other, never at once. Design and
reasoning: `docs/onderzoek/Planning op een lijn.md`.

**Free days, holidays and treks** (`engine/leave.ts`, `AppSettings.leavePeriods`,
shown on Week as "Vrije dagen en vakanties"). Three kinds: `no_training` (no
training on those days; what was there moves to an empty day of that week or is
let go), `trek` (a mountain hike on every day, the day before and after light,
rule LEAVE-LIGHT) and `free_days` (an easy backpack walk, or the week's long
training when its own day is tight, only where the week check finds nothing
new). They work through the same planning run as everything else:
`engine/leaveBlock.ts` puts things in (between the race block and the week
check in `planPass`), the week check takes things out (rules LEAVE-OFF and
LEAVE-LIGHT in `weekValidator.ts`). Adding or removing a period is always a
proposal with Akkoord (`engine/leaveProposal.ts` diffs the planning run against
the stored plan; `ProposalSheet` previews it); the period is stored only on
Akkoord, and undo puts the setting back. A session a period moved, let go of or
placed carries `PlannedSession.leave` so removing the period can put it back.
Logged and past sessions, what you locked yourself and a test or race are never
moved by it; they come back as notes in the proposal. Backup schema 5 carries
the periods; older files import as before (`storage/migrations.ts#migrateLeavePeriods`).

**Tochten as goals of their own** (`LeavePeriod.trek`, `engine/trek.ts`, decision
`docs/beslissingen/2026-10-22-tochten-als-doel.md`): a tocht is a trek period with
its details on it, so it plans through the same run as any trek. Its importance
sets the light days before it (`engine/trekTaper.ts`), its terrain the walk on
each day (flat and hills an easy backpack walk, mountains and snow the mountain
hike; the pack weight of a tocht is information only, sessions have no weight of
their own). Changing a tocht keeps its id and passes `replaces` to
`planLeaveChange`: the old work is put back first, a session it let go comes back
on its own row (an `add` item that names the skipped row, mark gone), so a second
change or the removal never duplicates anything. `AppSettings.showNextTrek` puts
the next tocht on Vandaag. A heavy leg day right after a tocht keeps 72 hours
after a mountain hike: it first looks for a day outside that, short or full, and
with `AppSettings.trekLegRest` soft (the default) the short version may stand 48
hours after the tocht; only then it is let go, with the reason in plain words
(`docs/beslissingen/2026-10-22-zware-beendag-na-tocht.md`).

**The back button, scroll and resuming** (`utils/backLayers.ts`, decision
`docs/beslissingen/2026-10-22-terugknop-en-hervatten.md`): every sheet, dialog and
full-screen overlay goes through `useSheetClose` (or `useBackToClose` for a menu
or view that is not a sheet), which gives it one history step with the same URL
and a marker in the state. The back button closes the top layer first; closing it
yourself takes the step away again. A new overlay must use the hook, a sheet that
cannot close while busy passes `canClose`, and nothing may rewrite the address
(`navigate(..., { replace: true })`, `setSearchParams`) while a layer is open on
that page. The page scrolls in `<main id="app-scroll">`, not in the window:
`useScrollRestoration` gives every history step its own height (forward starts at
the top, back restores it), and state that must survive a visit to another page
(chosen week, search term, an open section) uses `usePageState` instead of
`useState`. The tab bar follows `AppSettings.tabBack` (`utils/tabNav.ts`) and the
app reopens where you were after `AppSettings.resumeMinutes` (`utils/launchRoute.ts`).

Readiness percentages (`engine/readiness.ts` — strength, cardio,
climbing/D+, endurance, recovery, consistency, pack capability) are
intentionally simple, isolated formulas over the last 28 days of logs, each
in its own commented section so a formula can be swapped later without
touching the rest of the file. Those are not shown as progress toward the
main goal any more.

**One progress language toward the GR5** (`engine/gr5Readiness.ts`, decision
`docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md`): "Klaar voor de
GR5" is a single percentage, the average of four meters (rugzak, langste dag,
stijging en daling, dagen achter elkaar), each capped at 100%, always shown
with the sentence it is made of (`Gr5ReadinessCard`, tap opens the four meters
in `Gr5ReadinessSheet`). Ascend and Je stand read the same function. The
milestones stay a ladder ("volgend kamp"), never a second progress number. The
coach (Ascend) and "Volgehouden" (Je stand) count with the same function,
`engine/onCourse.ts#recentAdherence`. Do not add another percentage or
"x van y" for goal progress next to these; extend the engine function instead.

Weeks are derived, not stored: a week is just seven days starting on a
Monday; which phase/week-number it belongs to is computed from
`Program.startDate` + `Phase.weekCount` (`utils/dates.ts`), never persisted
as its own entity. The phases themselves are counted back from the main
goal's date (`engine/programLayout.ts`, applied by
`storage/database.ts#syncProgramHorizon`): a taper right before the goal,
nothing planned on or after it, and no empty weeks before it.

The backpack of the rucksack walk, the mountain hike and the first hiking day
is a ladder over the whole program (`engine/packLadder.ts`, read through
`progressionTarget`): light in the winter, steps of 1 to 2 kg toward the main
goal's rucksack target, up to 1 kg above it in the heaviest weeks, and never
raised in a week the D+ is raised (the D+ and duration live in
`data/hikeLadder.ts`). The target is not hardcoded: `syncProgramHorizon` copies
it from the goal to `Program.packTargetKg`, the same way it lays out the phases,
and also keeps milestone 11 (the full rucksack hike) at that weight. A milestone
you reached under an earlier requirement stays reached
(`engine/gr5Profile.ts#keepClearedMilestones`).

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

## Werkafspraken voor agents

Vastgelegd in `docs/beslissingen/2026-10-21-werkwijze.md`. Dit zijn de
afspraken voor elke agent die in deze repo werkt.

- Branches: werk op `claude/<onderwerp>`, nooit rechtstreeks op main.
  Kleine en middelgrote wijzigingen mag je zelf naar main brengen, maar
  pas na groene controles. Er is geen verplichte PR of merge door de eigenaar.
- Controles: voor elke push naar main zijn `npx tsc -p tsconfig.app.json
  --noEmit`, `npm run lint`, `npx vitest run` en `npm run build` groen.
- Planning van de gebruiker: alles wat zijn planning inhoudelijk verandert
  gaat in de app via een voorstel met Akkoord, nooit stil.
- Instellingen: elke keuze die de app voor de gebruiker maakt is instelbaar,
  met het advies als standaard en één zin uitleg. Een nieuwe functie zonder
  instelling is niet af; de instelling komt ook in `src/data/settingsIndex.ts`
  (`docs/beslissingen/2026-10-22-alles-instelbaar.md`).
- Besluiten: leg ze vast in `docs/beslissingen/`, één bestand per besluit
  (`JJJJ-MM-DD-onderwerp.md`, sjabloon `_sjabloon.md`), nooit herschrijven.
- Geen identificerende persoonsgegevens: de repo is openbaar. Geen naam,
  woonplaats, wijk, adres, e-mail of werkplek. Trainingsgegevens mogen in
  onderzoek wel. Testdata in de repo is altijd nagemaakt.
- Lezen vooraf: eerst `docs/onderzoek/` en `docs/visie/` doorzoeken voordat
  je iets nieuws onderzoekt of ontwerpt.
- Taal: Nederlandse teksten, menselijk, zonder tabellen en zonder
  gedachtestreepjes (geen U+2013 en geen U+2014) in nieuwe tekst.
- Afronding: elke taak eindigt met de uitslag van de controles en wat niet
  gecontroleerd kon worden.
- Kosten zo laag mogelijk: Sonnet voor specialisten en routines, Opus alleen
  voor review en lastig onderzoek, effort gemiddeld als standaard.
- De rollen staan in `.claude/agents/`, de vaste werkinstructies in
  `.claude/skills/`.
