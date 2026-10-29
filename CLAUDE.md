# ASCEND

ASCEND is a mobile-first personal training and adventure application.

Guidance for Claude Code (and any other agent) working in this repository.

Werk je aan een onderwerp, lees dan eerst het bijbehorende bestand in `docs/architectuur/`.

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
- Logo "Ring en pad" (`docs/beslissingen/2026-10-25-logo-ring-en-pad.md`): app-icoon in `public/`, `AppMark`, `AscendSplashLogo`, `AscendAnimatedLogo`, alleen de tokens `--color-logo-*`. Details in `docs/architectuur/bediening-en-beweging.md`.
- Tabbalk: Vandaag, Week, Stand, Ascend, Logboek (`BottomNav` in `src/App.tsx`), dekkend marine, labels in zinsletters, actieve tab in de tabkleur. Meer is het tandwiel rechtsboven (`SettingsGear`, 44 bij 44 px, op elke tab op dezelfde plek, opent `/more`); wat een pagina zelf rechtsboven nodig heeft gaat in `SkyBand` `actions`. Details in `docs/architectuur/bediening-en-beweging.md`.
- Lange donkere pagina's krijgen hoogstens één `SkyPanel`, nooit als eerste kaart (zie `docs/architectuur/bediening-en-beweging.md`).
- Instellingen (`/more`, acht groepen): elke instelling is één `SettingsRow`, uitleg achter de InfoButton (`src/data/settingsHelp.ts`), waarde uit `engine/settingsSummary.ts`. Details in `docs/architectuur/bediening-en-beweging.md`.

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

Vloeiende overgangen en uitgroei (`utils/haptics.ts`, instelling Trillen, `useSheetClose` met `sheetRef` op elk blad, `sheetDrag.scan.test.ts`, `armFlip()`/`useFlipList`, de donkere lucht `data-sky`): lees eerst `docs/architectuur/bediening-en-beweging.md`. Een blad met `animate-sheet-in` zonder `ref={sheetRef}` laat `sheetDrag.scan.test.ts` falen. Een nieuwe rij die een blad opent krijgt `data-sheet-from`. Een component gebruikt alleen de tokens en `.on-light`.

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

Training definitions, scheduled sessions, and completed session logs are
separate entities:

| Concept | Meaning | Rewrites history? |
|---|---|---|
| `SessionTemplate` | Reusable definition of a workout ("Upper Body A") | — |
| `PlannedSession` | A template scheduled onto a date | Yes — movable/skippable |
| `SessionLog` | What actually happened | **Never** — append-only |

### Logs en historie

**Never rewrite historical logs when schedules change.** Completion is never stored as a flag: a session is "done" when a `SessionLog` references the `PlannedSession` (`engine/sessionStatus.ts`). `MilestoneProgress` and derived additions (`detail`, `bestEffort`, `runDetail`, `forgeLog`) are append-only too. Four exceptions, each at the owner's request and each put back by its own function: hand-made log over watch numbers (`manualMeasured`, `restoreManual`), MacroFactor numbers into a strength log (same field), a watch log cut at both ends (`trim`, `undoTrim`), and a log that follows corrections in intervals.icu (`sourceSync`, `restoreSourceUpdate`). Full text: `docs/architectuur/historie-en-logs.md`.

### Onderwerpen

Een regel per onderwerp: waar het zit, en wat je niet mag missen.

- Planning, hoofddoel en rollen (`engine/mainGoal.ts`, `engine/templateRoles.ts`, `data/sports.ts`, `engine/workSets.ts#isWorkSet`, `engine/scheduler.ts`): `docs/architectuur/planning.md`. Een training wordt nooit uit een lijst van template-id's herkend maar via een rol; alles wat sets telt gaat door `isWorkSet`; `src/storage/planGolden.test.ts` mag alleen bewegen met de reden in de commit; twee beenzware sessies niet binnen 48 uur.
- Wie een geplande sessie mag aanraken (`engine/weekValidator.ts#lockLevel`, `engine/planPass.ts`): `docs/architectuur/planning.md`. Historie nooit; wat de gebruiker zelf vastzette nooit door de automatische planning; een test of race alleen via een voorstel.
- Labels van een doel, conflicten (`engine/goalLabels.ts`, `engine/goalConflicts.ts`, `engine/runGrowth.ts`): `docs/architectuur/planning.md`. Een nieuw label of een doel dat wijzigt is altijd een voorstel met Akkoord.
- Eerst vragen, dan plannen (`storage/database.ts#seedIfEmpty`, `engine/firstPlan.ts`, `engine/weekShape.ts`, `engine/freshStart.ts`): `docs/architectuur/planning.md`. Niets maakt bij het starten een programma of planning zonder voorstel met Akkoord.
- Ziek melden (`engine/illness.ts`), vrije dagen en vakanties (`engine/leave.ts`, `engine/leaveBlock.ts`, `engine/leaveProposal.ts`) en tochten (`engine/trek.ts`, `engine/trekTaper.ts`): `docs/architectuur/planning.md`. Altijd een voorstel met Akkoord; de periode wordt pas bij Akkoord opgeslagen.
- Weken zijn afgeleid, nooit opgeslagen; de rugzakladder (`engine/packLadder.ts`, `engine/programLayout.ts`): `docs/architectuur/planning.md`.
- Ascend-tab als doelen (`pages/Ascend.tsx`, `engine/goalList.ts`, `engine/goalReadinessFor.ts`): `docs/architectuur/doelen.md`. Wijzigingen in volgorde, label of onderkomen zijn altijd een voorstel met Akkoord.
- Klaar voor je doel, GR5-voortgang, race met doeltijd (`engine/gr5Readiness.ts`, `engine/raceReadiness.ts`, `engine/goalReadinessFor.ts`, `engine/racePaces.ts`): `docs/architectuur/doelen.md`. Eén percentage; voeg geen tweede percentage of "x van y" toe, breid de engine-functie uit.
- Terugknop, scrollen en hervatten (`utils/backLayers.ts`, `useSheetClose`, `useBackToClose`, `usePageState`): `docs/architectuur/bediening-en-beweging.md`. Elk blad, dialoog of overlay gaat door `useSheetClose`; schrijf het adres niet om terwijl een laag open is.
- Week: waarschuwingen (`engine/weekConcerns.ts`, `engine/weekFixProposal.ts`), slepen (`engine/weekDrag.ts`, `components/useWeekDrag.ts`) en inhalen (`engine/catchUp.ts`): `docs/architectuur/week.md`. Een oplossing voor een probleem in de week is een voorstel met Akkoord; slepen loopt via `Week.tsx#moveTo` en `decideMove`; `planGolden.test.ts` beweegt niet.
- Lichaam en hoe voelt je lijf (`engine/bodyMap.ts`, `engine/bodyCheck.ts`, `data/bodySpots.ts`), zware beendag op vermoeide benen (`engine/legDayEase.ts`, `engine/legSoreness.ts`), korte nacht (`engine/shortNight.ts`) en wat speelde er (`models/influence.ts`, `engine/influence.ts`): `docs/architectuur/lichaam-en-herstel.md`. Een melding verandert de planning pas via een voorstel met Akkoord; zorgteksten zeggen "kan helpen", nooit "voorkomt"; `legFatigueOn` en de planner blijven zoals ze waren.
- Forge (`engine/forgeSession.ts`, `engine/forgeLog.ts`, `engine/forgeAdjust.ts`, `engine/forgeHistory.ts`, `engine/spotter.ts`, `engine/forgeLayout.ts`, `engine/forgeQuickActions.ts`, `engine/prescriptionCheck.ts`): `docs/architectuur/forge.md`. Een bestaand log wordt nooit beschreven; sets tellen via `isWorkSet`; er is hoogstens één Forge-sessie.
- Je stand, volgorde en Forge-ingang (`engine/forgeEntry.ts`, `engine/cardOrder.ts`): `docs/architectuur/forge.md`.
- Plaatjes bij oefeningen (`data/exerciseArt.ts`, `engine/muscleMap.ts`, `components/ExerciseArtButton.tsx`): `docs/architectuur/forge.md`. De tekeningen staan nooit in `globPatterns` van `vite.config.ts`; een gewijzigde tekening houdt `LICENSE.md` en `ATTRIBUTION.md` in die map waar.
- Hartslag op het horloge (`engine/watchHeartRate.ts`), run in detail (`storage/activityDetail.ts`, `engine/runDetail.ts`) en de testloop met de tempo's (`engine/racePrediction.ts#countedTests`, `engine/bestEffort.ts`, `engine/testJudgment.ts`): `docs/architectuur/lopen-en-tests.md`. Tempo's, voorspelling en horloge lezen `pacesFromLogs`/`countedTests`, nooit `tests.at(-1)`; `bestEffort` en `runDetail` zijn afgeleid en append-only.
- Lessen van Garmin (`engine/intensityMinutes.ts`, `engine/sweat.ts`, `engine/bootBreakIn.ts`) en Strava-tekst (`engine/activityText.ts`): `docs/architectuur/koppelingen-en-data.md`. ASCEND schrijft nooit naar Strava.

**Scheduling logic belongs in `/engine`.** Domeinlogica staat in `engine/`, niet in componenten, en de scheduler is deterministisch, zonder AI. Alles wat de planning van de gebruiker inhoudelijk verandert is een voorstel met Akkoord, nooit stil.

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
- Kosten zo laag mogelijk: de coördinator kiest rol, model en denkwerk met de tabel in de skill
  `werkverdeling` en start een helper altijd als zijn rol, nooit als `general-purpose` (die draait op het
  model van de coördinator). Na elke helper een regel in `.claude/kosten/logboek.md`; elke maandag
  wordt de tabel daarop bijgesteld. Lookout gebruikt de vaste kit van de skill `lookout`.
- De rollen staan in `.claude/agents/`, de vaste werkinstructies in
  `.claude/skills/`.
- Helpers hebben in berichten aan de eigenaar een vaste naam in de stijl van
  ASCEND: Scout (onderzoek), Sherpa (bouwen), Warden (review), Lookout
  (UI-controle en testen) en Cartographer (ontwerp), met het onderwerp erbij,
  bijvoorbeeld "Sherpa Forge".
