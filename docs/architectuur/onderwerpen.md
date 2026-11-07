# Onderwerpen en hun harde regels (uitgebreid)

Verhuisd uit CLAUDE.md, woordelijk. CLAUDE.md heeft een korte index; de korte versie per onderwerp staat in het werkbriefje in `docs/werkbriefjes/`.

- Planning, hoofddoel en rollen (`engine/mainGoal.ts`, `engine/templateRoles.ts`, `data/sports.ts`, `engine/workSets.ts#isWorkSet`, `engine/scheduler.ts`): `docs/architectuur/planning.md`. Een training wordt nooit uit een lijst van template-id's herkend maar via een rol; alles wat sets telt gaat door `isWorkSet`; `src/storage/planGolden.test.ts` mag alleen bewegen met de reden in de commit; twee beenzware sessies niet binnen 48 uur.
- Wie een geplande sessie mag aanraken (`engine/weekValidator.ts#lockLevel`, `engine/planPass.ts`): `docs/architectuur/planning.md`. Historie nooit; wat de gebruiker zelf vastzette nooit door de automatische planning; een test of race alleen via een voorstel.
- Labels van een doel, conflicten (`engine/goalLabels.ts`, `engine/goalConflicts.ts`, `engine/runGrowth.ts`): `docs/architectuur/planning.md`. Een nieuw label of een doel dat wijzigt is altijd een voorstel met Akkoord.
- Eerst vragen, dan plannen (`storage/databaseSeed.ts#seedIfEmpty`, `engine/firstPlan.ts`, `engine/weekShape.ts`, `engine/freshStart.ts`): `docs/architectuur/planning.md`. Niets maakt bij het starten een programma of planning zonder voorstel met Akkoord.
- Ziek melden (`engine/illness.ts`), vrije dagen en vakanties (`engine/leave.ts`, `engine/leaveBlock.ts`, `engine/leaveProposal.ts`) en tochten (`engine/trek.ts`, `engine/trekTaper.ts`): `docs/architectuur/planning.md`. Altijd een voorstel met Akkoord; de periode wordt pas bij Akkoord opgeslagen.
- Weken zijn afgeleid, nooit opgeslagen; de rugzakladder (`engine/packLadder.ts`, `engine/programLayout.ts`): `docs/architectuur/planning.md`.
- Ascend-tab als doelen (`pages/Ascend.tsx`, `engine/goalList.ts`, `engine/goalReadinessFor.ts`): `docs/architectuur/doelen.md`. Wijzigingen in volgorde, label of onderkomen zijn altijd een voorstel met Akkoord.
- Klaar voor je doel, GR5-voortgang, race met doeltijd (`engine/gr5Readiness.ts`, `engine/raceReadiness.ts`, `engine/goalReadinessFor.ts`, `engine/racePaces.ts`): `docs/architectuur/doelen.md`. Eén percentage; voeg geen tweede percentage of "x van y" toe, breid de engine-functie uit.
- Terugknop, scrollen en hervatten (`utils/backLayers.ts`, `useSheetClose`, `useBackToClose`, `usePageState`): `docs/architectuur/bediening-en-beweging.md`. Elk blad, dialoog of overlay gaat door `useSheetClose`; schrijf het adres niet om terwijl een laag open is.
- Week: waarschuwingen (`engine/weekConcerns.ts`, `engine/weekFixProposal.ts`), slepen (`engine/weekDrag.ts`, `components/useWeekDrag.ts`) en inhalen (`engine/catchUp.ts`): `docs/architectuur/week.md`. Een oplossing voor een probleem in de week is een voorstel met Akkoord; slepen loopt via `Week.tsx#moveTo` en `decideMove`; `planGolden.test.ts` beweegt niet.
- Lichaam en hoe voelt je lijf (`engine/bodyMap.ts`, `engine/bodyCheck.ts`, `data/bodySpots.ts`), zware beendag op vermoeide benen (`engine/legDayEase.ts`, `engine/legSoreness.ts`), korte nacht (`engine/shortNight.ts`) en wat speelde er (`models/influence.ts`, `engine/influence.ts`): `docs/architectuur/lichaam-en-herstel.md`. Een melding verandert de planning pas via een voorstel met Akkoord; zorgteksten zeggen "kan helpen", nooit "voorkomt"; `legFatigueOn` en de planner blijven zoals ze waren.
- Forge (`engine/forgeSession.ts`, `engine/forgeLog.ts`, `engine/forgeAdjust.ts`, `engine/forgeHistory.ts`, `engine/spotter.ts`, `engine/forgeLayout.ts`, `engine/prescriptionCheck.ts`): `docs/architectuur/forge.md`. Een bestaand log wordt nooit beschreven; sets tellen via `isWorkSet`; er is hoogstens één Forge-sessie.
- Je stand, volgorde en Forge-ingang (`engine/forgeEntry.ts`, `engine/cardOrder.ts`): `docs/architectuur/forge.md`.
- Plaatjes bij oefeningen (`data/exerciseArt.ts`, `engine/muscleMap.ts`, `components/ExerciseArtButton.tsx`): `docs/architectuur/forge.md`. De tekeningen staan nooit in `globPatterns` van `vite.config.ts`; een gewijzigde tekening houdt `LICENSE.md` en `ATTRIBUTION.md` in die map waar.
- Hartslag op het horloge (`engine/watchHeartRate.ts`), run in detail (`storage/activityDetail.ts`, `engine/runDetail.ts`) en de testloop met de tempo's (`engine/racePrediction.ts#countedTests`, `engine/bestEffort.ts`, `engine/testJudgment.ts`): `docs/architectuur/lopen-en-tests.md`. Tempo's, voorspelling en horloge lezen `pacesFromLogs`/`countedTests`, nooit `tests.at(-1)`; `bestEffort` en `runDetail` zijn afgeleid en append-only.
- Lessen van Garmin (`engine/intensityMinutes.ts`, `engine/sweat.ts`, `engine/bootBreakIn.ts`) en Strava-tekst (`engine/activityText.ts`): `docs/architectuur/koppelingen-en-data.md`. ASCEND schrijft nooit naar Strava.
- Zonder doel: richting, weekbudget en golven (`engine/direction.ts`, `engine/directionPlan.ts`, `engine/directionChange.ts`, `engine/waves.ts`, `engine/noGoalWaves.ts`, `engine/programLayout.ts#layoutWaves`, `data/directions.ts`): `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`. Een richting, weekbudget, golven of beginnersstart verandert het plan alleen via een voorstel met Akkoord; zonder doel geen bergtocht, wandeldag of rugzakladder; de golden scenario's met een doel (A en C) bewegen niet.
- Kansen met gegevens (`engine/sourceWatch.ts`, `engine/morningBackup.ts`, `engine/illnessSigns.ts`, `engine/heatPace.ts`, `engine/weekdayPattern.ts`, `engine/airQuality.ts`): `docs/beslissingen/2026-10-31-kansen-stap-0.md` en `docs/onderzoek/Kansen met gegevens.md`. Elk signaal is instelbaar en verandert de planning nooit zelf.
- Ochtendkaart (`engine/morningCard.ts`, `engine/morningRule.ts`, `engine/morningNotice.ts`, `components/MorningCard.tsx`): `docs/beslissingen/2026-10-31-ochtendkaart-vernieuwd.md`. `morningConsequence` is alleen tekst en plant niets.
- Tekstkaart (`npm run kaart`, `npm run kaart:vergelijk`, `docs/app-kaart/`, `scripts/app-kaart/invarianten.mjs`): `docs/beslissingen/2026-10-31-app-kaart.md`. Na elke wijziging draait de vergelijking met elk verschil verklaard; elke gevonden inconsistentie wordt een invariant.
- Wat er nog open staat: `docs/backlog.md`, bijgehouden door de coördinator. Wie welke helper op welk model krijgt: de skill `werkverdeling`.

## Architecture (de oorspronkelijke mappenlijst en tabel, woordelijk)

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
