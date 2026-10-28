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
- deep navy backgrounds (`#0b1733`), with a light sky band and green
  mountains at the top of every tab (no light theme)
- mint as the one action colour, ice blue for status, a colour per tab;
  no bronze or gold accents
- muted Alpine green allowed (the mountains)
- Roman/Stoic influence should remain subtle
- adventure/mountain/topographic influences
- never make the UI look like an RPG
- never make it look like a generic bodybuilding app
- mobile-first

### Knoppen, kopjes en tikdoelen

- Knoppen staan in zinsletters ("Opslaan", "Gedaan in MacroFactor"), met
  normale letterspatiëring (geen `uppercase`, geen `tracking-wide`).
  Hoofdletters zijn alleen voor de kleine kopjes in de tabkleur (`Eyebrow`,
  die zelf hoofdletters toont); een kopje met de hand opmaken mag niet waar
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

### Zee en berg (was: steen en contour)

De vaste stijl, vastgelegd in `docs/beslissingen/2026-10-22-steen-en-contour.md`
(tabbalk, letters, iconen) en voor de kleuren in
`docs/beslissingen/2026-10-24-thema-zee-en-berg.md`, dat het kleurdeel van het
eerste vervangt. De app moet aanvoelen als een goede kaart en een goed horloge,
fris en sportief op donker marine.

- Eén mint accent per scherm: de enige gevulde mint knop (`PrimaryButton`) of
  de ene kaart met de mint gloed. Gewone knoppen zijn mint omlijnd
  (`SecondaryButton`), een gekozen keuze en voortgang (ring, vinkjes, meters)
  zijn ook mint. IJsblauw (`--color-status`) is alleen status: waar je bent,
  vandaag in de week. Amber (`--color-warning`) is let op en beendagen. Al het
  andere is marine: kaarten, haarlijnen, gedempte inkt. Geen brons of goud.
- De lichte lucht (`SkyBand`, `src/components/SkyBand.tsx`) staat bovenaan
  elke tab: van `--color-sky-top` naar `--color-sky-bottom`, met twee rijen
  bergen (saliegroen achter, groenblauw voor) die overgaan in het marine. Op de
  lucht staan de kop (`AppMark` links, `SettingsGear` rechts, allebei in
  `--color-on-light`), het kopje, de titel en de eerste kaart. Alles op de lucht
  is donker op licht via de klasse `.on-light`, die de gewone tokens omzet;
  een `Card` erop wordt vanzelf de lichte kaart. `variant="low"` is de lagere
  band van Week. De lucht is een vlak, geen licht thema.
- Elke tab heeft een eigen kleur (`--color-tab-*`): Vandaag mint, Week ijs,
  Stand lila, Ascend alpengloed, Logboek lichtgroen. `App.tsx` zet `data-tab`
  op de pagina; `Eyebrow` en de tabbalk lezen `--color-page`, op de lucht de
  donkere variant. Buiten de tabs is het mint.
- Contourlijnen (`topo-texture`) zijn versiering met betekenis, in mint met
  heel lage dekking, en komen alleen op de missiekaart, één per scherm.
- Marcellus (`font-display`) is alleen voor woorden: paginatitels, namen van
  trainingen, een oordeel als "Fris". Alle getallen staan in Inter met vaste
  cijferbreedte (`font-sans tabular-nums`); een getal midden in een zin in
  Marcellus gaat in `Num` (`ui.tsx`). Eén heel groot getal (40 px of meer) mag
  in Marcellus, maar liever niet.
- Niets kleiner dan 12 px (`text-xs` is het minimum, ook voor `Eyebrow` en voor
  tekst in grafieken). Geen `text-[10px]` of `text-[11px]`.
- Iconen komen uit twee eigen sets, zonder bibliotheek. De bediening (tandwiel,
  pijltjes, info, vinkje, terug, tabbalk) is de lijnset in
  `src/components/icons.tsx` (`Icon`): lijn van 1,6 px, ronde uiteinden, de kleur
  van de omringende tekst. Sporten, rust en lichaam zijn kleine illustraties in
  stijl C in `src/components/pictograms.tsx` (`Pictogram`): drie tinten van de
  sportkleur, waarvan de volle vorm het silhouet draagt, met kleur uit de tokens
  (`docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`). Geen losse tekens
  als ✓ of ↷ voor iets wat een icoon kan zijn.
- Logo: "Ring en pad" (`docs/beslissingen/2026-10-25-logo-ring-en-pad.md`): een lichte
  ring, een lichte kam met drie toppen die op de ring eindigt, een groenblauwe berg die
  overloopt in marine, een S-pad en een stip in mint. Het app-icoon staat in `public/`
  (`icon.svg`, `icon-maskable.svg`, `favicon.svg` en de PNG's), het kleine teken is
  `AppMark` (alleen ring en kam, in `--color-on-light`), het openingsscherm is
  `AscendSplashLogo` en `AscendAnimatedLogo` met alleen de tokens `--color-logo-*`. Het
  openingsscherm bouwt zich op zoals het oude (gloed, ring, kam, berg, pad, vonk, woord)
  en heeft daarna een rustige omgevingsbeweging die alleen draait zolang het scherm in
  beeld is (`docs/beslissingen/2026-10-25-openingsscherm-terug.md`); in Rustig alleen kort
  tekenen, in Uit en bij beperkte beweging meteen de eindstand.
- Tabbalk: Vandaag, Week, Stand, Ascend, Logboek (`BottomNav` in
  `src/App.tsx`), volledig dekkend marine, labels in zinsletters, met de
  actieve tab en het streepje erboven in de kleur van die tab. Meer is geen
  tab maar het tandwiel rechtsboven (`SettingsGear`): alleen het pictogram,
  zonder cirkel of rand, in `--color-on-light` op de lucht van `SkyBand`, een
  tikdoel van 44 bij 44 px, op elke tab op precies dezelfde plek, schuift met
  de pagina mee. Het opent
  `/more` (instellingen, gegevens en back-up, koppelingen, gidsen en kennis);
  oude links naar `/more` blijven werken. Wat een pagina zelf rechtsboven nodig
  heeft (pijltjes van Week en Logboek, het lichaamknopje van Vandaag) gaat in
  `SkyBand` `actions`: pictogrammen zonder cirkel, direct links van het
  tandwiel, dezelfde hoogte en maat, dezelfde kleur
  (`docs/beslissingen/2026-10-24-ontwerpadvies-kop-en-weekstrook.md`). Eén
  uitzondering op de kleur, op verzoek van de eigenaar: het lichaamknopje is het
  pictogram in mint, omdat de kleur van het tandwiel bij de instellingen hoort
  (`docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`).
- Lange donkere pagina's krijgen hoogstens één vlak lucht halverwege (`SkyPanel`
  in `SkyBand.tsx`: verloop van de lucht, smalle bergrand, `.on-light`, volgt de
  nachtlucht), op een kaart die iets samenvat of aanwijst, nooit de eerste kaart
  (`docs/beslissingen/2026-10-24-lucht-halverwege.md`).
- Instellingen (`/more`, `docs/beslissingen/2026-10-22-instellingen-in-groepen.md`):
  een overzicht met de stand en acht groepen (`/more/:groep`: Planning, Doel en
  tochten, Forge, Lichaam, Vandaag en meldingen, Koppelingen, Gegevens en
  back-up, Gidsen en kennis). Elke instelling is één `SettingsRow`
  (`src/components/settings/SettingsList.tsx`): links de titel, rechts de waarde,
  hoogstens één regel eronder (een feit of een bron, nooit uitleg), 52 of 68 px
  hoog, de hele rij is het tikdoel. Uitleg staat achter de InfoButton
  (`src/data/settingsHelp.ts`: één zin en korte punten), een keuze opent een
  onderblad (`Sheet`, `ChoiceSheet`), aan of uit is een schakelaar in de rij, acties
  staan in het blad en nooit op de pagina. Wat ASCEND zelf bijhoudt krijgt het label
  "auto". Een schakelaar die aan staat is mint gedempt, niet gevuld mint: de
  gevulde mint knop blijft het ene accent van het scherm. De waarde en de regel van een rij komen uit
  `engine/settingsSummary.ts` (pure functies met tests), zodat de rij, het
  zoekresultaat en het overzicht hetzelfde zeggen.

### Stem

De teksten klinken als een trainer die je kent: je/jij, kort en direct, met warmte in de toon en
nooit in uitroepen. Waar duidelijkheid voorgaat (een getal of datum, een waarschuwing, wat een label
of voorstel met je planning doet) komt het droge feit eerst en blijft het onaangetast, met liefst een
zin in dezelfde toon eromheen. Humor is licht en zeldzaam, en de vaste woorden blijven overal gelijk.
Eerst de Ascend-tab, daarna de hele app
(`docs/beslissingen/2026-10-27-stem-van-ascend.md`).

### Beweging

Subtiel en kort: 150 tot 400 ms, ease-out, nooit stuiterend, met CSS (`mx-*` onderaan
`src/index.css`) en kleine hooks (`components/motion.ts`), zonder bibliotheek
(`docs/beslissingen/2026-10-24-beweging.md`). Een animatie speelt alleen als een element
verschijnt, nooit bij elke render, en er blijft geen lus draaien behalve de zachte adem van
de missiekaart. De instelling Beweging (Normaal, Rustig, Uit; `engine/motionSettings.ts`)
staat als `data-motion` op `<html>`; `prefers-reduced-motion: reduce` telt altijd als Uit.
Een nieuwe animatie moet in Rustig en Uit dus ook netjes op de eindstand staan.

De lucht bovenaan heeft een donkere variant (`data-sky="day|night"` op `<html>`, instelling
"Lucht bovenaan", `engine/skySettings.ts`; `docs/beslissingen/2026-10-24-nachtlucht.md`).
Een component gebruikt alleen de tokens en `.on-light`; wat licht lijkt wordt 's avonds vanzelf donker.

### Design tokens in code

Theme tokens are defined once in `src/index.css` under `@theme` and
consumed via Tailwind (`bg-[var(--color-card)]`) or inline `style` objects.
Never hardcode hex or rgba values in a component.

- Backgrounds (navy): `--color-bg` `--color-charcoal` `--color-surface`
  `--color-card` `--color-raised` (with `--color-card-border`), and
  `--color-control-border` for buttons, fields and switches
- Text: `--color-ink` (primary), `--color-ink-dim` (secondary)
- Action: `--color-action` (mint, line and text), `--color-action-fill` (the
  fill of the main button, mint everywhere), `--color-on-action` (dark text on
  mint), `--color-action-muted` (a switch that is on, a chosen chip)
- Status and progress: `--color-status` (ice, where you are),
  `--color-on-status`, `--color-progress` (mint), `--color-track` (the empty
  track of a ring or bar)
- Signal: `--color-success` `--color-success-text` `--color-warning` (amber,
  let op) `--color-danger` (fill) `--color-danger-text`
- Effort zones: `--color-effort-1` to `--color-effort-5`; sports:
  `--color-sport-run` `--color-sport-strength` `--color-sport-walk`
  `--color-sport-stretch` `--color-sport-mountain` (bergtocht, bergzon-geel; on
  the sky an olive ochre; also the `--color-chart-*` order). A bergtocht is told
  apart from a walk by `isMountainTrip` in `components/sportKind.ts`
- The light sky: `--color-sky-top` `--color-sky-bottom` `--color-light-card`
  `--color-light-border` `--color-on-light` `--color-on-light-dim`
  `--color-action-on-light` `--color-status-on-light`; the mountains
  `--color-mountain-back` `--color-mountain-front`
- Tabs: `--color-tab-vandaag` `-week` `-stand` `-ascend` `-logboek`, each with a
  `-light` variant for the sky; `--color-page` is the colour of the tab you are on
- Old names (`--color-gold` `--color-bronze` `--color-bronze-dark`
  `--color-on-gold` `--color-alpine` `--color-stone` `--color-sky`
  `--color-snow`) still work and point at the new palette (gold and bronze are
  mint); new work uses the new names. Components read the new names:
  action, action-muted, on-action, status, ink, ink-dim, and `--color-sage` for
  alpine (a calm tint next to mint and ice, for "fris" and for a phase or kind;
  not a status and not an action). A rank that used to be gold against bronze now
  has its own meaning (effort scale, mint, ice, amber), see
  `docs/beslissingen/2026-10-24-stijlresten.md`
- Typography: `--font-display` (Marcellus, via `.font-display`) for
  headings/wordmarks, `--font-sans` (Inter) for everything else. Scale: 12
  (labels, eyebrows, tab bar), 14 (second line), 16 (body), 20 (card title),
  28 (page title in Marcellus); numbers in Inter semibold tabular at 20, 28,
  40 or 56 with the unit in 14 dimmed (`Stat`)
- Spacing on a 4 px grid: page edge 16, between cards 12, inside a card 16,
  cards rounded 16, buttons 12, pills round; the main button is 52 high,
  other buttons 44
- `html { color-scheme: dark }`: the app is dark-only, there is no light
  theme to preserve; the sky band is one light surface, not a theme
- Shared primitives live in `src/components/ui.tsx` (`Card`, `LightCard`,
  `PrimaryButton`, `SecondaryButton`, `StatusDot`, `StatusPill`, `Eyebrow`,
  `Stat`, `Ring`, `Meter`, `ZoneBar`, `Toggle`, `InfoButton`), `TextButton` and
  `TextLink` in `TextButton.tsx` (a small action in mint or dimmed, no underline,
  44 px; only a source link outside the app stays underlined), and the sky in
  `SkyBand.tsx`. Reuse these rather than re-implementing card/button chrome in
  a page or feature component
- Cards are `rounded-2xl` with a subtle border; the optional `topo-texture`
  class adds a very low-opacity topographic contour pattern in mint. Use it
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
  pages/         The five tabs: Today, Week, Stand, Ascend, History; Settings (the overview and the eight groups, `pages/settings/`) sits behind the gear
  engine/        All business logic: scheduler, progression, readiness
  models/        TypeScript domain models — no React, no IndexedDB code
  storage/       IndexedDB layer, export/import, schema migrations
  integrations/  Adapter interface for future Garmin/Health Connect/MacroFactor
  data/          The default demo program (templates, GR5 ladder, seed history)
  state/         AppDataContext — wires storage + engine to the UI
  utils/         Date math, id generation
```

The main goal is found in one place, `engine/mainGoal.ts#mainGoal` (scopes `active`, `live`,
`activeFirst`); a rule that needs a kind of session asks for a role on the template
(`SessionTemplate.roles`, `engine/templateRoles.ts#hasRole`, the built-in table in
`data/templateRoles.ts`) instead of a list of template ids. Sports are data in
`data/sports.ts` (label, colour, pictogram, five traits, intervals.icu types); lists of
sports are derived from it. `src/storage/planGolden.test.ts` freezes a year of planning for
three cases: a change to the planning only updates its snapshot with the reason in the commit
(`docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`).

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
refers to the first and leaves it as it was). A third: a log from the watch
can be cut at the beginning and the end (a drive home with the watch still on),
which replaces its duration, distance, climb and heart rate and keeps the old
ones in `SessionLog.trim`, put back by `engine/trimLog.ts#undoTrim`
(`docs/beslissingen/2026-10-24-activiteit-inkorten.md`).
A fourth: a log tied to an intervals.icu activity follows that activity when it is
corrected there. Its measured numbers (duration, distance, climb and descent, heart
rate, cadence) are replaced only when they differ from the fingerprint of the source
kept at linking (`SessionLog.sourceSync.seen`, bound to the activity by `externalId`),
so a change at the source is told apart from something ASCEND did itself. The numbers
from before stay in `sourceSync.updated` and are put back by
`engine/sourceCorrection.ts#restoreSourceUpdate`; a hand-made log keeps (and extends)
its `manualMeasured`; a log cut here (`trim`) is never written over, the new numbers are
only offered; a deleted activity changes nothing. Switch "Correcties uit intervals.icu
overnemen" (`docs/beslissingen/2026-10-25-correcties-uit-intervals.md`).
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
Background jobs at boot run one after the other, never at once. Opening never
waits for the sync: the app shows the stored data first and syncs in the
background; whatever changes the plan waits for the queued syncs and then reads
the stored plan (`docs/beslissingen/2026-10-22-openen-wacht-niet-op-de-planning.md`). Design and
reasoning: `docs/onderzoek/Planning op een lijn.md`.

**The planning reads the label of a goal** (Top, Voortop, Verkenning; `engine/goalLabels.ts`,
`engine/goalConflicts.ts`, `engine/runGrowth.ts`, decision
`docs/beslissingen/2026-10-26-planning-met-labels.md`). The label sets the taper of a race in the race
block: Top the race week, Voortop the short taper of its kind (`taperDaysFor`), Verkenning none, but the
race stands on its day as an anchor. The recovery after a race follows the kind and the distance
(`recoveryDaysFor`), never the label: rule AFTER-GOAL in the week check moves or lightens only the system's
own sessions and announces it. Goals that come too close (`goalConflicts`) are said in plain words in the
proposal when a goal is added or moved, in a fixed order (shorten the taper, one label lower, say it
honestly); "Toch allebei" is kept as `TrainingGoal.conflictAccepted` (the date of the other goal) and the
safety limits between heavy leg days stay. With a running goal as Top or Voortop and no tocht as main goal,
the long run grows every two weeks toward the race (`Program.runBuild`), under the 110% cap on your own
logs, and the first week after a race it is at most half the race.

**First ask, then plan** (`storage/database.ts#seedIfEmpty`, `engine/firstPlan.ts`,
`engine/weekShape.ts`, decision `docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`):
a new install plans nothing. The app starts with `seedIfEmpty({ withProgram: false })`: only
the templates, no program, goal or planning; "Alles verwijderen" ends the same way. Vandaag
shows `StartWelcome` while there is no program and no planning
(`engine/freshStart.ts#needsFirstPlan`, derived from the data, never a flag): "Nieuw beginnen"
or "Back-up terugzetten". The questions (goal, date, days per week, which days, strength) become
what the planning already reads (goal, rest day, `availability.allowedDays`, strength block) plus
`AppSettings.weekShape` (which fixed sessions stay in the weekly pattern and on which day, read
defensively through `engine/sports.ts#parseWeekShape` by `weeklyPatternTemplates` and
`arrangeWeekForRestDay`). The plan is always a proposal with Akkoord through
`computeHorizonPlan`/`applyHorizonPlanNow` with `firstPlan`; Liever niet leaves the app empty.
Restoring a backup on an empty device counts only your own data as disappearing, never templates
the backup lacks. `seedIfEmpty()` without options and `runBootMigrations({ seedProgram: true })`
still fill the full default program, for the tests only. Nothing may create a program or planning
at start without a proposal. Changing the week shape later is not built yet.

**The Ascend tab is your goals** (`pages/Ascend.tsx`, `components/ascend/`, `engine/goalList.ts`, decision
`docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md`): goals in the order you choose (`TrainingGoal.order`; one
sort key, `goalLabels.ts#sortedForList`, read by the list and by `goalConflicts.ts`; every move writes the order of
the whole visible list), the first one open, a goal sheet per goal, and a season strip on the sky (switch "Seizoensstrook
tonen"). A new label, a goal added or changed, "In hutten" or "Met tent", and an order that shifts a conflict
(`goalList.ts#moveOutcome`) are always a proposal with Akkoord, never silent. "Klaar voor je doel" of the main goal is
`gr5Readiness.ts#computeMainGoalReadiness`, the same as on Je stand. `/ascend/doelen` redirects to the tab. Krachtprogressie
and Trainingsverdeling live on Je stand.

**Ziek melden and "weer beter"** (`engine/illness.ts#planIllnessChange`, `components/IllnessCard.tsx`, decision
`docs/beslissingen/2026-10-27-ziek-als-voorstel.md`) are a proposal with Akkoord when the planning changes: the
period is stored only on Akkoord, with Liever niet nothing is stored and nothing changes; when the planning does
not change the period is stored at once. Undo puts the periods back with the planning.

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

**A race with a goal time** (`engine/raceReadiness.ts`, decision `docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md`):
"Klaar voor je doel" of a running race with a goal time and a distance up to the half marathon makes speed the main meter (goal time
divided by the expected time from the test that counts, `countedTests`/`racePaces`, the same source as TARGET-TIME, capped at 100%) and
weighs it most (`RACE_SPEED_WEIGHTS`: speed 60%, longest run 20%, weekly volume 20%; setting "Klaar voor je doel bij een doeltijd",
speed or equal). It is still one percentage. Without a test, or while the fastest 5 km waits for Akkoord, speed does not count and one
line says so; without a goal time nothing changes. The card never judges the goal time ("het doel blijft het doel"): it shows the
distance to the goal as work and one dry line whether the goal time fits average growth by race day (the decision's `-aanvulling.md`); you judge for yourself. The change "+x in 4 weeks" shows only when the goal already had a value
four weeks ago (`ReadinessOptions.since`). TARGET-TIME carries the goal time in its id, so one Liever niet holds for every later test
until the goal time changes; setting "Doeltijd aanpassen voorstellen" (`proposeTargetTime`) switches it off.

**Lichaam** (`/lichaam`, `/lichaam/:plek`, decision
`docs/beslissingen/2026-10-24-lichaam-als-figuur.md`) is the one place for
stretching and complaints; `/stretches` and `/blessures` only redirect. Spots,
stretches, care and the injury name are data (`data/bodySpots.ts`,
`data/bodyCare.ts`) read through pure functions in `engine/bodyMap.ts`, which also
lays out the tap boxes (44 by 44 px, never overlapping, tested). A complaint is
stored under the name from `data/bodyAreas.ts` with the side after it, so
INJURY-LEGS recognises it; a new leg spot belongs in `LEG_BODY_PARTS`. Reporting
does not change the planning; once it does, it goes through a proposal with
Akkoord. Care texts say "kan helpen", never "voorkomt", with the strength of the
evidence from `docs/onderzoek/`.

**Hoe voelt je lijf?** (`engine/bodyCheck.ts`, decision
`docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md`) replaces the weekly complaints question: a
card on Vandaag only when there is a reason (setting `bodyCheck`), "Voel me fris" or tap a spot,
then spierpijn, stijf or pijn and the side (nek, bovenrug and onderrug also `midden`). It writes
to the same `InjuryNote` list as Lichaam (`kind`, `side`); spierpijn and stijf never count as an
injury and close after 7 days when read (`engine/injuryKind.ts`). "Wat terugkomt" on Lichaam is
derived, never stored (`engine/bodyRecurrence.ts`).

**Warnings in Week** (`engine/weekConcerns.ts`, `engine/weekFixProposal.ts`, `components/WeekNotice.tsx`, decision
`docs/beslissingen/2026-10-28-waarschuwingen-in-week.md`, design `docs/visie/Waarschuwingen in Week.md`): amber in Week means
only "something is wrong here"; a heavy leg day is the muted text "zware benen" in the row, no icon (the `LegMark` is gone, the
ridge legend is muted). The week check reads the shown week with `CheckInput.reportYours` (REST-DAY then also reports a
training with your lock, level 1; off by default so the planning and `planGolden.test.ts` do not move) and gives the card
"Let op" under the sky (`weekConcerns`: headline, fact, row text for REST-DAY, LEG-SPACING, TWO-HARD-RUNS, AFTER-TEST,
ONE-LONG, TEST-FRESH). What the check may not repair itself because it is yours becomes a proposal with Akkoord
(`planWeekFix`: `repairWeeks` with `CheckInput.mayMove` on exactly that session, or in a full week the lightest training goes,
never a long run, hard run, leg day, test, race or tocht), as `Advice` `WEEK-CHECK` through `ProposalSheet`, only when the week
is demonstrably better, with the id `weekfix:<rule>:<ids>:<dates>`. It is not in `advice` and not on Vandaag. Liever niet keeps the
card, quieter, with "Toch een voorstel"; the problem is never hidden. Setting "Voorstel bij een probleem in de week"
(`weekFixProposal`, absent = on): off keeps the card and the row texts and drops only the button. Not built yet: the sentence in
the action sheet of a training, the link with TEST-MAKE-ROOM (no second proposal for one training), the other rules.

**A heavy leg day on tired legs** (`engine/legDayEase.ts`, `engine/legSoreness.ts`, decision
`docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md`, design `docs/visie/Spierpijn en een zware beendag.md`):
a heavy leg day of today with a reason (soreness you reported, in the morning check or as a "spierpijn" note on a leg spot
of today or yesterday, the last answer wins; a hard run earlier today, a test run too, through `earlierTodayPoints` with 6
hours between when the time is unknown, said as "je loopt vandaag ook" when it is only planned; or a leg index above 12) gets
one card on Vandaag (`LegEaseCard`) and the same question in Forge. A hard run of today (not a test or race) gets the same
card too, only with "a day later" and no Lichter. MORNING-CHECK makes the same choice as the card
(`legDayEase.ts#legEaseCardSession`, the training `easeTarget` picks) and skips that one training, so one soreness gives one
card; without a card (setting not on voorstel, open pain on a leg spot) it speaks itself. The choices: "Lichter" (`easeSlots`: at least 3 reps in reserve, the last set off, extras gone, only exercises that
load the legs) or a day later (`adviceEngine.ts#legEaseMoveAdvice`, rule LEG-EASE, a proposal with Akkoord), always with
"Liever niet". The choice is kept per date and training in `AppSettings.legEaseDays` (last 60, `migrateLegEaseDays`) and
never touches a template, the planning or a log. `legFatigueOn` and the planner stay as they were, so `planGolden.test.ts`
does not move; the week rule LEG-FRESH is not built. A log of a training you eased is left out of "raak" per row, only for exercises that load the legs and
tied by the planned session with a day of room for the date (`strengthHistory.ts#comparisonRows`, `eased`). A soreness note of the
same day does not make a logged training "tired" (it has no time), the morning check does (`legsTiredAt`). Moving a heavy leg day or hard run shows a quiet line with the leg index of
the new day (`moveLegNote`). Settings "Lichter bij vermoeide benen" (`legEase`: voorstel, regel, uit; uit also silences the
quiet line) and "Hoe licht" (`legEaseHow`).

**Forge** compares each exercise now against 4 and 8 weeks back and the best ever
(`engine/forgeHistory.ts`, decision
`docs/beslissingen/2026-10-24-forge-vergelijken-en-zoeken.md`). A moment only counts
when a training falls in its window; otherwise the row says so or compares with the
previous training, with its date. Exercises on reps (bodyweight) show reps as the
main number. Exercises not done since the furthest moment sit under "Eerder gedaan".
ASCEND is tested quietly against MacroFactor with one measure, **raak**
(`engine/prescriptionCheck.ts`, decision
`docs/beslissingen/2026-10-24-kracht-stil-toetsen.md`): the same function and slack for
both sides, on the same set of the same day, never agreement between the two. For
ASCEND it is an estimate afterwards, except in Forge when the proposed weight was used.
On cables and weight stacks ASCEND learns the weights you really used
(`engine/strengthWeights.ts`, "Gewichten van toestellen": learned, only what you used, or the
profile steps). The model's own rules (decision `docs/beslissingen/2026-10-25-kracht-eigen-regels.md`):
KR-2 takes the best set of a training (the same measure as raak), KR-5 brakes the estimated
strength and not the weight so a weekly wave in the rep range converts freely, after more than
28 days without any strength training it starts 5% lighter, and dumbbells can be read as the
total of two (`dumbbellLog`). In a training Forge proposes a lighter weight after a set below the
range (`engine/forgeAdjust.ts`, "Lichter" or "Liever niet", never a weight that gives reps far
above the range), and the RIR of a set starts empty with the target as a hint; a set ticked
without touching it stores the target with `SetLog.rirAssumed`
(`docs/beslissingen/2026-10-25-bijsturen-in-forge.md`). The drop in strength per working set is
learned per exercise from your own sets, starting at 3% and never from a set with an assumed RIR
(`strengthModel.ts#learnFatigue`, setting "Vermoeidheid per set"); with a coarse step the first set
takes the weight with the smallest expected miss (decision
`docs/beslissingen/2026-10-26-kracht-vermoeidheid-en-grove-stap.md`). "Wijzigingen doorvoeren"
(`engine/forgeInput.ts#carryChange`, `carryMode`: equal sets, the same difference, or off) and raak
for proposals within 5% of what was done (`docs/beslissingen/2026-10-26-doorvoeren-en-raak-dichtbij.md`).
The weights of a machine can be typed in per gym (`GymProfile.exerciseWeightsKg`,
`engine/machineWeights.ts`); a strength log knows its gym (`SessionLog.gymProfileId`, only on new
logs) so the weights learned from use stay per gym, and Forge asks to fill them in when no weight
fits (`docs/beslissingen/2026-10-26-gewichten-per-toestel.md`).

**A doubtful short night** (watch off the wrist: under 4 hours, or under half your own
average once there are 7 days) becomes a question in the morning check instead of a
warning (`engine/shortNight.ts`, decision `docs/beslissingen/2026-10-25-korte-nacht-vragen.md`).
Your verdict per date lives in `AppSettings.nightJudgments`, tied to the measured minutes
(a later full night makes it lapse), read through `storage/migrations.ts#migrateNightJudgments`
and merged per date on restore. "Niet goed gemeten" keeps sleep, sleep score and HRV of
that night out of your own averages and the suggestion; resting heart rate still counts;
the numbers at Garmin and intervals.icu are never changed. Switch "Vragen bij een korte
nacht" (`AppSettings.askShortNight`).

**Wat speelde er** (`models/influence.ts`, `AppSettings.influences`, decision
`docs/beslissingen/2026-10-25-wat-speelde-er.md`): your own note about a training or a day
(alcohol with its amount, wiet, ziek, kort geslapen, stress, an own word). Noted only in the
Logboek: the sheet of a training and a tapped day in the calendar, never on the morning card.
A note on a training touches the morning of that day, one on a calendar day the morning after
(`engine/influence.ts#affectedMorning`, the one rule). It is a list next to the history, so a
log is never changed; it travels in the backup (`storage/migrations.ts#migrateInfluences`,
merged per id). An easy run with a heart rate outside 1.5 times the noise of the loopinzicht
gets a sign in Logboek and Week; "Niet meetellen voor hartslag" keeps a run out of Tempo bij
zone 2 and later comparisons, "Deze nacht niet meetellen" keeps a morning out of the resting
heart rate and HRV averages; load, leg index and the GR5 meters always count. What ASCEND knows
itself (a heavy leg day from the logbook, warmth from the weather, a short night from the watch,
an illness) is shown as a plain line, never asked to confirm, and counts in the overview by
itself (`engine/influence.ts#derivedFactEntries`, never stored; warmth only for heart rate at pace
and effort; only your own notes leave the bands; decision
`docs/beslissingen/2026-10-25-feiten-tellen-vanzelf.md`). ASCEND never names alcohol or wiet
itself; "lijkt op" (`engine/influenceEffects.ts#looksLike`) only for your own notes, with 4 times
on each side and bands that do not touch. Je stand shows "Wat doet dit met je?" from 3 times per reason against
your own band; a test the same day after 3 or more glasses (or wiet that day) gets a proposal
with Akkoord (`engine/influenceProposal.ts`). Morning numbers from intervals.icu are kept 400
days for this (`engine/wellnessRange.ts`). A reason is never in a list, a notification or the
Strava text. Setting "Voorbeelden bij naam noemen" (`AppSettings.influenceNames`, on by default) only
decides whether the explanation and help name alcohol and wiet or say "wat je dronk of gebruikte";
the chips stay (`data/settingsHelp.ts#settingsHelp`, decision `docs/beslissingen/2026-10-27-redenen-bij-naam.md`).

**Heart rate on the watch** (`engine/watchHeartRate.ts`, `engine/heartRateZones.ts`, decision
`docs/beslissingen/2026-10-25-hartslag-op-het-horloge.md`): ASCEND's zones follow Garmin's
"Standaard" split on the threshold (66-81, 81-89, 89-96, 96-101%). With "Zones van ASCEND" (the
advice) a workout sent to intervals.icu carries ASCEND's own beats as a percentage of the
threshold intervals.icu uses (read from its sport settings), so the watch shows the same range
the app judges by; a zone name is only the fallback. An easy step runs from the start of zone 1 to
the end of its own zone ("Rustige loop: ruime grens"), intensity 4 up to the maximum.

**Lessons from Garmin** (decisions `2026-10-25-intensiteit-gemeten.md`,
`2026-10-25-zweet-en-water.md`, `2026-10-25-bergschoenen-inlopen.md`). The intensity card on Je
stand counts real minutes per zone from the heart rate profile on a log
(`engine/intensityMinutes.ts`, read by `engine/standing.ts#intensityMix`), and falls back to what a
training was meant to be when there is no heart rate; switch "Intensiteit tellen". Sweat loss is
your own weighing before and after a log (or the watch estimate you type in), kept in
`AppSettings.sweatEntries` next to the logs (`storage/migrations.ts#migrateSweatEntries`); it
gives your own sweat rate by temperature (`engine/sweat.ts`) and the water per GR5 stage
(`engine/stageWater.ts`, "ongeveer", never medical advice). New mountain boots are counted from
the date you started wearing them, walks and treks only (`engine/bootBreakIn.ts`,
`JourneyState.boots`); the Reisplanner tasks for boots and sweat are done by the data
(`engine/journey.ts#withDerivedDone`, `withBootsDone`), never a stored flag. Running shoe
kilometres stay with Garmin.

**Run in detail, the data** (`storage/activityDetail.ts`, `engine/streamPack.ts`, `engine/runDetail.ts`,
`engine/runDetailRules.ts`, decision `docs/beslissingen/2026-10-27-run-in-detail-gegevens.md`): the full series of a
run or tocht live in a store of their own, `activityStreams` (key `logId`, database version 9), packed as typed
arrays at the moments the watch wrote them; the track is never kept, only the wind against you per kilometre worked
out from it. The series DO go in the backup file by default (base64, setting "Reeksen in back-up", size in the row)
because the source may stop handing Garmin data out and then a restore could not fetch them again; the copies taken
before an import (`backupSnapshots`) never hold them. "Volledige reeks bewaren" decides whether they are kept at all.
`SessionLog.runDetail` (kilometres, laps, a line of about 150 points, the place of the best 5 km) is derived and
append-only like `detail` and `bestEffort`: added once, tied to the totals it was read for (`wholeKm`, `wholeMinutes`),
`runDetailTried` the fingerprint of totals that gave nothing, never a change to a measured number, and a damaged one
is dropped by `migrateLogRunDetail` without losing the log. Kilometres, laps and the verdicts (RD-1 to RD-8) are pure
functions with tests; a test, tempo run or interval training gets one line about the spread of its pace
(`RunInsight.pacing`), the two-line rule after a run stays.

**Strava text** (`engine/activityText.ts`): ASCEND never writes to Strava (that would
need a server); it prepares a short text to copy. Planned numbers appear only when
the log belongs to a planned session, and no minutes without a measured duration.

**The test run and the paces** (`engine/racePrediction.ts#countedTests`, `engine/bestEffort.ts`,
`engine/testJudgment.ts`, decisions `docs/beslissingen/2026-10-27-testloop-lezen.md` and
`2026-10-27-testloop-lezen-aanvulling.md`): a test counts with the fastest unbroken 5 km of the watch's series
(`SessionLog.bestEffort`) and with the whole log when there is none; the app says which. `bestEffort` is derived and
append-only, like `detail`, not a new exception to "never rewrite logs": it is added once, tied to the totals it was
read for (`wholeKm`, `wholeMinutes`; a source correction makes it stale and it is read again, `bestEffortTried` stops
a series that gave nothing from being fetched again), and it counts only once `accepted` is set: at once for a test
that has just come in or when counting it changes no pace, otherwise after Akkoord on the old and new paces in the log
sheet, so paces never depend on whether a log was opened. Paces, prediction, target-time check and the watch all read
`pacesFromLogs`/`countedTests` and never `tests.at(-1)` by themselves. A test clearly slower than the last one that
counts waits for your answer ("Telt mee" or "Telt niet mee", `AppSettings.testJudgments`, per log, next to the logs,
"Telt niet mee" never dropped by the cap of 60) and until then the old paces hold; a quiet line on Vandaag
(`TestPendingLine`) says so, and an older waiting test keeps its question while a newer one waits too. Tests on
different bases are compared on the whole run. "Telt niet mee" works on any test afterwards. Setting "Twijfeltest
eerst vragen" (`askDoubtTest`); off means the latest test counts, as before. A test of the last 60 days that still has no best 5 km is read in the background at the opening (`activityDetail.ts#ensureRecentTestEfforts`); one that waits for Akkoord gets a quiet line on Vandaag after the doubt line, never two (`testJudgment.ts#effortOfferLine`), and TARGET-TIME names its basis and waits for that Akkoord (`docs/beslissingen/2026-10-27-snelste-5km-achteraf.md`). The fastest 5 km counts moving time and moving distance: a stop (a pause gap with almost no distance, or a creep under 1 m/s for 3 seconds or more) is not a hole and costs and gives nothing, stops less than 10 s or 20 m of movement apart are one stop, and a catch-up jump right after a stop (more than 1.5 times the median pace over 10 s) makes that stretch a hole; stops are counted in `BestEffort.stops` and `stoppedSec` and said ("Je stond 3 keer stil, samen 1:40; die tijd telt niet mee.", with one dry sentence above 60 seconds or 3 stops); a gap where the distance jumps stays a hole; `BestEffort.v` makes a waiting best effort without it be read once more, and an accepted one of the last 60 days is read once more into `SessionLog.bestEffortReread` (the old one keeps counting; it takes over at once only when no pace changes, else after Akkoord); `bestEffortTried` carries `|v2`; a new test with stops faster than the whole run that changes a pace asks Akkoord; setting "Stilstaan bij een testloop" (`testStops`, skip or count; `docs/beslissingen/2026-10-27-stilstaan-bij-de-testloop.md` and `-aanvulling.md`). A last test with more standing still than "iets te gunstig" (or one waiting as a doubt), with no other test within 14 days, gets a proposal with Akkoord (TEST-RETRY, `adviceEngine.ts`, setting "Nieuwe test voorstellen bij stilstand", `newTestOnStops`): the first hard run (role `hard_run`) at least 3 days after it, within 10 days, becomes a 5 km test on the same day (a `move` with `templateId`), and what the usual spacing finds in the way moves in the same proposal: leg strength to after the test (as TEST-MAKE-ROOM), a long run or hard run of the day after to the next day where it fits (short when that week has a long run of its own, a recovery walk there may give way), the smallest change first with up to three `options`; a session you locked is never moved by itself, only with its name in the proposal, and a hard run you locked never becomes the test; the end state is judged by the leg index on the test day against the same line as TEST-FRESH and TEST-MAKE-ROOM (`FATIGUE_THRESHOLDS.test.fresh`), and a heavy leg day that makes the legs tired moves first, processed last after the runs, to 0 to 3 days after the test with the same building blocks as TEST-MAKE-ROOM; one you locked is offered that move with its name ("die je zelf vastzette, gaat naar ...") and a `remove` as the second option, and only a day that fits nowhere is a `remove` (named: "laat je deze week gaan"), weighing more when it was yours and more than a move, so accepting it leaves nothing for the week check or TEST-MAKE-ROOM to say; the quiet leg-index line in the proposal sheet is worked out on the end state of the proposal; holiday, trek and light days, ids already used by another proposal, the leg day the Benen card speaks for and a day without room (day budget, with the short length of a moved long run) are no candidates, and TEST-RETRY is silent while TEST-MAKE-ROOM speaks; no workable day, no advice; a move never takes the last rest day of a week (a day without training, a recovery walk counts as rest): it first looks for a target day that keeps one, otherwise the same proposal lets the lightest training of that week go (not a long run, hard run, test, race, leg day, your own lock or a logged one) and says so, and with none to let go the long run itself goes this time; Liever niet is kept per test date (`docs/beslissingen/2026-10-28-nieuwe-testpoging.md`, `-ruimte.md`, `-herstel.md`, `-verschuiven.md` and `-rustdag.md`).

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
  Daarna nog drie poorten: review door Warden, een doorloop in Chromium op
  360 en 390 px met vertraagde processor door Lookout, en een screenshot van
  elk veranderd scherm dat de coördinator zelf bekijkt. Elke knop die wacht
  heeft een grens in tijd en een zichtbare uitkomst; de app start nooit op een
  leeg scherm (`docs/beslissingen/2026-10-22-kwaliteitspoort.md`).
- Planning van de gebruiker: alles wat zijn planning inhoudelijk verandert
  gaat in de app via een voorstel met Akkoord, nooit stil.
- Instellingen: elke keuze die de app voor de gebruiker maakt is instelbaar,
  met het advies als standaard en één zin uitleg. Een nieuwe functie zonder
  instelling is niet af; de instelling komt ook in `src/data/settingsIndex.ts`
  (zoeken), `src/data/settingsLayout.ts` (pagina en rij) en
  `engine/settingsSummary.ts` (de waarde in de rij), en een groepspagina in
  `src/components/settings/groups/` (`docs/beslissingen/2026-10-22-alles-instelbaar.md`,
  `docs/beslissingen/2026-10-22-instellingen-in-groepen.md`).
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
- Helpers hebben in berichten aan de eigenaar een vaste naam in de stijl van
  ASCEND: Scout (onderzoek), Sherpa (bouwen), Warden (review), Lookout
  (UI-controle en testen) en Cartographer (ontwerp), met het onderwerp erbij,
  bijvoorbeeld "Sherpa Forge".
