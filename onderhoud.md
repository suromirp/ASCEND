# Onderhoud en audit, 15 november 2026 (Warden)

Alleen gelezen, niets gewijzigd. Gemeten op main `49eca57`, in een eigen werkmap in de scratchpad.

## Uitslag in het kort

- Blokkerend: niets gevonden.
- Moet: één punt (punt 1), in de code bevestigd, niet met een test nagespeeld.
- Mag: negen punten, waarvan twee een vermoeden met naspeelplan.
- Controles op main: `npx tsc -p tsconfig.app.json --noEmit` groen, `npm run lint` groen, `npx vitest run` groen (729 bestanden, 10827 tests), `npm run build` groen, `npm run kennisindex:vergelijk` zegt "Geen verschil met docs/kennisindex/."
- Niet gecontroleerd: zie onderaan.

## Wat er deze week naar main ging

Sinds 9 november: 145 commits, 1501 bestanden geraakt, ruim 120 duizend regels erbij. Dat is meer dan één audit kan lezen. Deze ronde heeft voorrang gegeven aan opslag, historie en planner, zoals gevraagd, en wijkt daarmee af van de beurtrol in de skill (week 1 engine, week 2 opslag, enzovoort).

Echt gelezen (heel of het deel dat deze week veranderde): `src/state/logSave.ts`, `src/state/logSession.ts`, `src/storage/migrationsLogs.ts`, `src/storage/migrationsLogDetail.ts`, `src/storage/migrationsPlanning.ts`, `src/storage/migrations.ts`, `src/storage/bootMigrations.ts`, `src/storage/backupNormalize.ts`, `src/storage/zone2Pieces.ts`, `src/storage/places.ts` (wachtrij en Vast punt naar Thuis), `src/engine/sportOfLog.ts`, `src/engine/adviceShared.ts`, `src/engine/adviceWeek.ts`, `src/engine/forgeSession.ts` (dag van afronden), `src/engine/fullWeek.ts`, `src/components/forge/FinishSheet.tsx`, `src/components/forge/forgeFinishLog.ts`, en de lezers van `completedAt` in `src/engine/strengthHistory.ts`, `forgeCalibration.ts`, `adviceLoad.ts` en `legDayEase.ts`.

Niet gelezen: alles rond routes en kaart, het horloge, de instellingenpagina's, weer en lawine, calisthenics, en `databaseHorizon.ts`, `weeklyPrescriptionStep.ts`, `watchWorkouts.ts` en `backupClean.ts` op de nieuwe instellingen na. Daar zegt dit rapport dus niets over.

## Bevindingen, de ernstigste eerst

1. Moet. Een training die je in Forge op een eerdere dag afrondt krijgt de dag van je laatste set, maar het tijdstip van nu.
   Plek: `src/components/forge/forgeFinishLog.ts:28` geeft alleen `completedDate: extra.doneOn` mee, en `src/state/logSession.ts:105` vult `completedAt` dan met `new Date().toISOString()`.
   Pad: beendag maandagavond, concept blijft open, woensdagochtend afronden. Sinds I-4 (`49eca57`) stelt Afronden ook bij een geplande training maandag voor. Het log zegt dan maandag als dag en woensdag als tijdstip. Gevolgen in de code: `src/engine/strengthHistory.ts:135` sorteert de trainingen van een oefening op `completedAt`, dus een training van dinsdag komt vóór die van maandag en "de laatste keer" is de verkeerde. `src/engine/strengthHistory.ts:92` en `:152` geven dat tijdstip door als "het moment van de training": een zware loop van maandagavond na je training telt dan als vermoeide benen ervoor. `src/engine/forgeCalibration.ts:210` en `src/engine/adviceLoad.ts:24` en `:72` sorteren op hetzelfde veld.
   Voorstel: bij het nieuwe log `completedAt` meegeven: het tijdstip van de laatst afgevinkte set als de gekozen dag daarbij hoort, anders een vast tijdstip op de gekozen dag (zoals `engine/macrofactorDuration.ts#completedAtOn`). Alleen voor nieuwe logs, bestaande logs blijven zoals ze zijn. Hetzelfde patroon zit al langer in het oude formulier (`src/components/logForm/manualLog.ts:133`), dat kan in dezelfde ronde mee.
   Voorgestelde valkuil voor `docs/werkbriefjes/historie-en-logs.md`: "Wie `completedDate` kiest, geeft ook `completedAt` mee; de twee mogen nooit een dag of meer uit elkaar lopen."

2. Mag, vermoeden. Dezelfde geplande training afronden in twee tabbladen kan twee logs geven.
   Plek: `src/state/logSession.ts:92` tot `:127`. Kijken (`getAll`) en schrijven (`put`) zijn niet één transactie, en de sloten (`loggingInFlight`, `externalInFlight`, `pending`) leven in het geheugen van één tabblad. Dat een tweede tabblad voorkomt staat in de code zelf (`engine/forgeSession.ts#choiceSheetSeesGone`).
   Naspeelplan: twee tabbladen op dezelfde geplande training, in beide Afronden binnen dezelfde seconde, met vertraagde processor. Twee logs met dezelfde `plannedSessionId` bevestigt het. Oplossing zou het bestaan en het schrijven in één `readwrite` transactie op `sessionLogs` zijn.

3. Mag, vermoeden. Een opslag die niet antwoordt bij Vast punt naar Thuis houdt de rij van plekken vast tot de app opnieuw start.
   Plek: `src/storage/places.ts:47` tot `:53` (de keten `serial`) en `src/storage/bootMigrations.ts:147`. Het opstarten laat na de grens los, maar de belofte blijft vooraan in de keten staan. Elke latere `savePlace` of `removePlace` wacht daarachter. De pagina Plekken heeft een eigen grens (`src/pages/settings/PlacesPage.tsx:65`), dus je ziet wel dat het niet lukt, alleen lukt het daarna ook niet meer tot een herstart.
   Naspeelplan: een `PlacesMeta` waarvan `get` nooit antwoordt aan `migrateStartPointToHome` geven en daarna `savePlace` met een gewone meta aanroepen; blijft die hangen, dan klopt het. Oplossing: een eigen grens per schakel in de keten.

4. Mag. `src/engine/settingsSummary.ts` is 1345 regels en zat deze week in 10 commits op main, het vaakst van alle bestanden. De verklaringen zijn al per groep gesplitst (`src/engine/settingsDefs/`), de samenvatting nog niet. Voorstel: opsplitsen per groep naast de verklaringen, één ronde, geen gedrag anders.

5. Mag. Twee nieuwe bestanden zijn in hun eerste week al boven de duizend regels: `src/engine/settingsDefs/forge.ts` (1127) en `src/engine/settingsDefs/vandaag.ts` (1036). Geen actie nu; noemen zodat ze niet verder groeien zonder dat iemand het ziet.

6. Mag. Elf exports die nergens gebruikt worden, ook niet in tests (grove telling op naam, niet met een gereedschap): `resetWatchLinkCache` (`src/components/useWatchLink.ts`), `LeaveKindDisc` (`src/components/LeaveWeekBand.tsx`), `loggedMinutesOf` (`src/components/logForm/manualLog.ts`), `MEANINGFUL_CHANGE_SEC` (`src/engine/aerobicTrend.ts`), `eventTitle` (`src/engine/forgeLog.ts`), `LOAD_SPORTS` (`src/engine/standing.ts`), `machineSummary` (`src/engine/machineWeights.ts`), `derivePlacement` (`src/engine/settingsDefs/derive.ts`), `clearNearbyTerrain` (`src/storage/nearbyTerrain.ts`), `GR5_OSM_RELATION` en `GR5_OSM_TAKEN_ON` (`src/data/gr5StageEnds.ts`). Sommige worden mogelijk alleen binnen hun eigen bestand gebruikt; dan kan het woord `export` weg. Veilig op te ruimen in een kleine ronde, per stuk nakijken.

7. Mag. 113 exports worden alleen door tests gebruikt, bijvoorbeeld `predictRace` (`src/engine/racePrediction.ts`), `computeReadinessTrend` (`src/engine/readiness.ts`), `detectContestedSlots` (`src/engine/goalArbiter.ts`), `muscleVolumeForWeek` (`src/engine/muscleVolume.ts`) en `sunTimes` (`src/engine/sun.ts`). Een deel is bewust (hulpjes voor tests), een deel is code die de app niet meer aanroept maar wel getest blijft. Voorstel: één ronde Scout om de lijst te splitsen in bewust en dood; daarna pas weghalen.

8. Mag. Tekstregel: `src/data/modalities.ts:375` heeft `durationHint: '–'` (een gedachtestreepje als waarde), en de placeholders in `.claude/skills/werkkaart/index.html` gebruiken er ook een. Beide ouder of buiten de app; in de broncode van deze week is geen nieuw gedachtestreepje bijgekomen buiten tests.

9. Mag. Eén open notitie: `src/engine/mainGoal.ts:31` (het marathondoel wordt op naam herkend). Staat er al langer; hoort als punt in de backlog of weg.

10. Mag. `@capacitor/android` wordt nergens in `src/` geïmporteerd. Dat hoort zo (alleen de Android-bouw gebruikt het); geen pakket is overbodig.

## Inventaris

- Oude kleurnamen buiten `src/index.css`: geen. (`--color-sky-top` is een geldig token, geen oude naam.)
- Hardcoded hex of rgba in `src/`: geen. De ene treffer is een titel van een bron met een hekje erin.
- `uppercase`: alleen in het primitive in `src/components/ui.tsx:173` (het kopje boven een blok), niet op knoppen.
- Tekst kleiner dan 12 px: geen treffer op vaste maten.
- E-mailadressen of andere persoonsgegevens: geen treffer.
- Notities: 1 keer TODO of FIXME; het woord legacy of tijdelijk 57 keer, vrijwel alles in uitleg bij migraties.
- De tien grootste bronbestanden: `data/researchSources.ts` 1894, `data/exerciseGuides.ts` 1679, `engine/settingsSummary.ts` 1345, `engine/forgeWorkout.ts` 1186, `engine/settingsDefs/forge.ts` 1127, `engine/strengthModel.ts` 1111, `engine/settingsDefs/vandaag.ts` 1036, `engine/runDetailView.ts` 1035, `integrations/intervalsIcu.ts` 914, `data/exercises.ts` 912.
- CLAUDE.md: 14698 bytes, ruim onder de grens van 25 KB.
- Nieuwe migratiestappen van deze week (`migrateLogSetAsked`, `migrateLogSetRow`, `migrateLogSetSkill`, `migrateLogZone2Pieces`, `migrateStartChoices`, `migrateSkillGoals`, `migratePlaces`, `migrateSavedRoutes`) zijn alle acht aangesloten op de import (`src/storage/backupNormalize.ts`, `src/storage/backupClean.ts`). Van de 42 nieuwe instellingen komt alleen `shelterAsked` niet in `backupClean.ts` voor; die wordt bij het lezen zelf verdedigd (`engine/trekShelter.ts#readShelterAsked`), dus dat is in orde.
- Historie: in wat gelezen is wordt geen bestaand log herschreven. `zone2Pieces` en `zone2PiecesTried` worden in één transactie toegevoegd op het log zoals het bewaard is; `sportOfLog` leidt de sport af bij het lezen en schrijft niets.

Vergeleken met het vorige rapport (`docs/onderhoud/2026-10-31.md`): de oude kleurnaam en de dubbele hulpfuncties van toen zijn weg gebleven. Nieuw is vooral de groei: twee bestanden boven de duizend regels erbij, en een samenvatting van instellingen die elke ronde geraakt wordt.

## Drie getallen

Dit is de eerste meting; volgende week is er pas een vergelijking.

1. Herstelrondes: 53 regels in `.claude/kosten/logboek.md` van 9 tot en met 15 november noemen een herstelronde, op 299 regels in die week. Niet per bouwer uitgesplitst: het logboek noemt de bouwer niet in een vaste vorm.
2. Vaakst geraakt in `src/` (zonder tests): `engine/settingsSummary.ts` 10, `engine/briefing.ts` 9, `data/settingsIndex.ts` 9, `data/settingsHelp.ts` 9, `components/TrainingBriefing.tsx` 8.
3. Tests die broncode lezen (`readFileSync`): 5.

## Wat niet gecontroleerd kon worden

- `npm run kaart:vergelijk`: de eerste poging stopte na ruim zes minuten met een foutmelding, de tweede kwam in ruim acht minuten niet voorbij "Bouwen...". Geen uitslag dus. Kan aan deze container liggen; het hoort op een gewone machine opnieuw te draaien.
- Ongebruikte code is geteld met een eigen grove telling op naam. Een echt gereedschap (knip) mocht hier niet draaien.
- Punt 1 is in de code gelezen en niet met een test nagespeeld. Punten 2 en 3 zijn vermoedens.
- Geen doorloop in de browser; dit was een leesronde.
- Geen back-up van de eigenaar gelezen.

Eindoordeel over de week op main: geen blokkerend punt gevonden in wat gelezen is. Punt 1 hoort in de Inbox nadat de coördinator het zelf in de code heeft bevestigd.
