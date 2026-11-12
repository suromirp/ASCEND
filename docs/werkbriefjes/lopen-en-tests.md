# Lopen en tests

Hartslag op het horloge, run in detail en de testloop met de tempo's, de beste 5 km, de rust voor een test en de RPE bij een test.

## Bestanden
- `src/engine/racePrediction.ts#countedTests` welke tests meetellen; tempo's, voorspelling en horloge lezen dit
- `src/engine/testJudgment.ts#pacesFromLogs` tempo's uit de logs, met "Telt mee" of "Telt niet mee"
- `src/engine/bestEffort.ts#bestEffortFromStream` de snelste 5 km aaneen uit de reeks van het horloge
- `src/storage/activityDetail.ts#ensureRecentTestEfforts` leest recente tests op de achtergrond bij het openen
- `src/engine/runDetail.ts#buildRunDetail` kilometers, rondes en lijn van een run; oordelen in `runDetailRules.ts`
- `src/engine/watchHeartRate.ts#resolveWatchHr` hartslagbereik op het horloge, naar de drempel van intervals.icu
- `src/engine/aerobicTrend.ts#aerobicTrend` tempo bij zone 2 (vlak tempo `gapSecKm`, eigen stijging bij afwijkend horloge); `recentRunPace.ts` echt tempo voor de afstand op Vandaag (`missionFacts.ts#distanceLine`: "je laatste loop" bij één loop, "lopen" bij meer; zonder testloop komt de afstandszin uit het tempo van de laatste rustige of lange lopen (met lopen gaat dat voor de test); geef het aantal lopen mee); grafiek en uitleg achter de i in `src/engine/zone2Chart.ts#zone2Chart` en `zone2Explanation`, zelfde venster en uitspraak als de kaart
- `src/engine/heartRateZones.ts#zoneBpm` de zones van ASCEND; `src/engine/zone2Pieces.ts#stablePieces` stabiele, vlakke stukken uit de reeks (`kmPieces` grof uit de kilometers), zonder zones, drempels alleen in `zone2Rules.ts`, op het log via `src/storage/zone2Pieces.ts#ensureZone2Pieces`
- `src/engine/zoneUpdate.ts#zoneOffer` nieuwe drempel na de laatste test, voorstel met Akkoord
- `src/engine/testRest.ts#resolveTestRest` 72 of 48 uur rust voor een test; regel in `scheduler.ts` (`testPairConflict`, niet geëxporteerd, en `tooCloseBeforeTest`) en in de weekcontrole (`TEST-REST`, alleen voor Week)
- `src/engine/testEffortSplit.ts` een test met warming-up en cooling-down telt in twee delen
- `src/engine/legFatigue.ts#PLANNED_MAX_EFFORT_RPE` (privé) een test of race is gepland op RPE 10; het tempo en de testloopzin: `src/engine/missionFacts.ts#trainingPace`, in de Briefing alleen bij een manier die hardlopen is (besluit `2026-11-12-briefing-per-manier.md`)

## Nooit
- `tests.at(-1)` of een eigen "laatste test" lezen; alles gaat door `pacesFromLogs` en `countedTests`.
- `bestEffort`, `runDetail` of `detail` omschrijven: ze zijn afgeleid en append-only, één keer toegevoegd.
- Een nieuw tempo of een nieuwe drempel zonder Akkoord toepassen; een test of race verplaatsen zonder voorstel.
- Tempo's laten afhangen van of een log is geopend: `accepted` regelt wanneer de beste 5 km telt.
- Het spoor van een run bewaren; alleen de wind per kilometer wordt bewaard.
- `src/storage/planGolden.test.ts` laten bewegen.

## Valkuilen
- Het merk `counter` (hoogtemeters, besluit `2026-11-12-hoogtemeters-teller-op-log.md`) staat per afgeleid veld: `detail` en `runDetail` van één log kunnen een verschillende telling hebben (na een correctie bij de bron, of na inkorten en ongedaan maken). Een regel met een grens op eigen stijging leest het merk van het veld waaruit hij telt, nooit dat van het andere (Warden, 12 november).
- Een beste 5 km kan verouderen: een bronwijziging verandert de totalen, dan wordt `bestEffort` opnieuw gelezen; `bestEffortTried` voorkomt eindeloos ophalen van een reeks die niets gaf.
- Een test die duidelijk trager is dan de vorige wacht op "Telt mee" of "Telt niet mee"; tot dan gelden de oude tempo's. Er is hoogstens één stille regel op Vandaag, nooit twee.
- Tests op verschillende basis (beste 5 km tegen het hele log) vergelijk je op het hele log. Elke wijziging in `buildWorkoutPlan` verandert de vingerafdruk van de workout en stuurt hem stil opnieuw naar het horloge: vergelijk oud en nieuw over alle trainingen, ook met Rustig en Minder, en zet de getallen in het besluit.
- Een tweede testvoorstel toetste andere voorstellen niet en ging rood bij de review (2 november); laat een nieuw testvoorstel dezelfde toets doorlopen.
- Het wedstrijdblok geeft zijn eigen melding bij rust voor een test; voeg geen tweede melding toe.
- De reeksen staan standaard in de back-up (grote bestanden); de kopieën vóór een import (`backupSnapshots`) bevatten ze nooit.
- `sessionLoad` kent de splitsing (`split`), maar geen aanroeper geeft hem nog mee (de enige, `SportFeltBlock`, rekent zonder); de weeklast en beenindex lezen `LoadItem.split`.
- De weekbalk sprak zichzelf tegen bij de RPE van een test (review 2 november): laat getal en tekst uit dezelfde berekening komen. `aerobicTrend` leest `runDetail` alleen als het past bij het log; grens 15 m per km, met vlak tempo 30 m (alleen het oude pad, lopen zonder stukken). Tempo bij zone 2: zones pas bij het lezen, één meting per loop; tekst, cijfers en `progressMoment` lezen alleen `zone2Statement` (onder 8 lopen of 4 weken een eerste schatting). De hoogte na de dode band laat een glooiing te laat zien: de helling per 30 s komt uit de hoogte zonder dode band. Een achtergrondstap bij het openen die uit bewaarde reeksen rekent, beperkt zich tot het venster dat gelezen wordt, gaat nieuwste eerst, heeft een budget per opening en staat na de syncs. De grafiek achter de i tekent één stip per loop, niet per stuk (stukken uit één loop zijn samen één meting), en een lijn alleen bij een uitspraak die iets zegt; bij een eerste schatting of te veel verschil alleen stippen. De kaart zelf (`zone2Chart.ts#zone2WeekChart`, `stand/Zone2WeekChart.tsx`) volgt dezelfde regel met een stip per week; boven de drempel is de lijn die van de uitspraak en eindigt hij op de kop; het eindlabel staat bij zijn stip en `zone2CardCaption` zegt wat de kop is, zonder een getal te herhalen; wat meetelt staat achter de i; de drempel in woorden komt uit `firstRulePhrase`. Hoogtemeters telt alleen `engine/elevation.ts` (besluit `2026-11-12-hoogtemeters-stap-1.md`). Logs van voor 12 november 2026 houden hun oude, lagere eigen telling; een grens op eigen stijging per km (`runComparison`, `runDetailRules`, `runMetrics#formOf`, `kmPieces`) vergelijkt oude en nieuwe logs ongelijk. Vergelijk tussen logs op de stijging van het horloge, of speel de grens na. Een nieuw log draagt `counter: 2` op `detail` en `runDetail`; `kmPieces` kiest daarmee de grens voor vlak (10 of 5 m per km, besluit `2026-11-12-hoogtemeters-teller-op-log.md`).

## Testen
- Tijdens het werk: `npx vitest run src/engine/racePrediction src/engine/testJudgment src/engine/bestEffort src/engine/runDetail src/engine/zone2Pieces src/engine/aerobicTrend src/engine/zone2Chart src/engine/zone2WeekChart src/components/stand/zone2WeekChart src/engine/runTrends src/storage/zone2Pieces src/engine/watchHeartRate src/engine/testRest src/storage/activityDetail src/storage/testloop`
- Tekstkaart (`npm run kaart:vergelijk`) als de testkaart, het logblad of Vandaag verandert.

## Lees verder
- `docs/architectuur/lopen-en-tests.md`
- `docs/beslissingen/2026-10-27-testloop-lezen.md`, `docs/beslissingen/2026-10-27-run-in-detail-gegevens.md`
- `docs/beslissingen/2026-11-02-rust-voor-een-test.md`, `docs/beslissingen/2026-11-02-rpe-bij-een-testloop.md`, `docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md`, `docs/beslissingen/2026-11-09-tempo-grafiek.md`, `docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`
