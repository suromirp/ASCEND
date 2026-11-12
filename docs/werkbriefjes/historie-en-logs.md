# Historie en logs

De regel dat historie nooit herschreven wordt, de vijf uitzonderingen op verzoek van de eigenaar en het append-only patroon voor afgeleide toevoegingen.

## Bestanden
- `src/engine/sessionStatus.ts#deriveSessionStatus` "gedaan" komt uit de aanwezigheid van een `SessionLog`, nooit uit een vlag
- `src/storage/databaseRepos.ts#SessionLogsRepo` waar logs staan; alles wat schrijft komt hier langs
- `src/engine/watchAlign.ts#restoreManual` handgemaakt log over horlogecijfers (`manualMeasured`), ook voor MacroFactor-kracht
- `src/engine/trimLog.ts#undoTrim` horlogelog bij begin en einde ingekort (`trim`) en weer terug
- `src/engine/sourceCorrection.ts#restoreSourceUpdate` log volgt correcties uit intervals.icu (`sourceSync`)
- `src/engine/missedTraining.ts#linkLog` los log achteraf aan een geplande training na Akkoord (`linkedLater`), `unlinkLog` haalt alleen dat weg
- `src/storage/missedTraining.ts#linkLogNow` schrijft die koppeling
- `src/engine/logDay.ts#logDay` op welke dag een log wordt getoond; alleen weergave
- `src/engine/macrofactorDuration.ts#withChosenDuration` duur van een nieuw MacroFactor-log dat te lang is, bij het maken
- `src/components/logForm/manualLog.ts#buildManualLog` het log van zelf invullen, voor het blad Hoe ging het? en het oude trainingsscherm samen; toestand en concept in `useLogForm.ts`, vergelijking in `manualLog.test.ts`
- `src/state/logSession.ts#runLogSession` een nieuw log schrijven na Gedaan; tests in `logSession.test.ts`
- `src/storage/milestoneClearing.ts#recordClearedMilestones` `MilestoneProgress` wordt alleen toegevoegd

## Nooit
- Een bestaand `SessionLog` of `MilestoneProgress` omschrijven omdat de planning verandert, of om iets recht te zetten.
- "Voltooid" opslaan als vlag, ook niet op `PlannedSession`.
- Een zesde uitzondering maken zonder verzoek van de eigenaar, besluit in `docs/beslissingen/` en een eigen terugzetfunctie.
- Een meetgetal, datum of bestaande verwijzing wijzigen bij een koppeling achteraf; alleen een lege `plannedSessionId` vullen.
- Een ingekort log overschrijven met nieuwe bronnummers: die worden alleen aangeboden.
- Load, beenindex of planning de getoonde dag van `logDay` laten lezen; die blijven `completedDate` gebruiken.

## Valkuilen
- Nee van `logSession` is niet hetzelfde als "staat er al": het kan ook een mislukt schrijven zijn. Gooi bij nee nooit een concept weg zonder te kijken of het log er staat (Warden Dubbel log).
- `logSession` (`src/state/logSession.ts#runLogSession`) zegt ja zodra het log geschreven is, ook als een stap erna faalt; die fout gaat apart naar de melding bovenin. Nee betekent dat er niets geschreven is. Zet nooit een stap die kan falen tussen het schrijven en dat ja, anders laat een scherm opnieuw opslaan en krijgt een losse training een tweede log (besluit `2026-11-12-dubbel-log.md`).
- Afgeleide velden (`detail`, `bestEffort`, `runDetail`, `zone2Pieces`, `forgeLog`) worden één keer toegevoegd en horen bij de totalen waarvoor ze gelezen zijn; ze veranderen nooit een gemeten getal. Een beschadigd veld laat je vallen zonder het log te verliezen.
- Elke uitzondering heeft haar eigen terugzetfunctie; een nieuwe schrijfroute zonder die terugweg breekt de afspraak.
- Een MacroFactor-log kan na middernacht eindigen: de dag in Week en Logboek is die van de geplande training, het log zelf blijft staan.
- Een vorm die je bewaart verandert alleen met een migratiestap in `src/storage/migrations.ts`; oude back-ups blijven importeerbaar.
- Een gewiste activiteit bij de bron verandert niets aan het log.
- Testdata is nagemaakt; een back-up van de eigenaar komt nooit in de repo.

## Testen
- Tijdens het werk: `npx vitest run src/engine/watchAlign src/engine/trimLog src/engine/sourceCorrection src/engine/missedTraining src/state/logSession src/storage/trim src/storage/sourceCorrection src/storage/missedTraining src/storage/backup`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) alleen als een scherm verandert.

## Lees verder
- `docs/architectuur/historie-en-logs.md`
- `docs/beslissingen/2026-10-22-garmin-is-leidend.md`, `docs/beslissingen/2026-10-25-correcties-uit-intervals.md`
- `docs/beslissingen/2026-11-01-niet-doorgegaan.md`, `docs/beslissingen/2026-10-29-dag-van-een-training.md`
