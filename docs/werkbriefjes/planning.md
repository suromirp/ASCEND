# Planning

Hoe het plan ontstaat en wie een geplande sessie mag aanraken: hoofddoel, rollen, scheduler, de planningsronde, vrije dagen, tochten en zonder doel.

## Bestanden
- `src/engine/planPass.ts#planPass` de ronde die elke planning afsluit: vaste sporten en hoeveel per soort, dan tot 4 keer raceblok, vrije-dagenblokken en weekcontrole tot niets meer verandert (`MAX_TURNS`)
- `src/engine/weekValidator.ts#lockLevel` wie een sessie mag aanraken, en `repairWeeks` voor de reparaties
- `src/engine/scheduler.ts#legSpacingDays` de 48 uur tussen zware beendagen
- `src/engine/mainGoal.ts#mainGoal` het hoofddoel, op één plek
- `src/engine/templateRoles.ts#hasRole` een training herken je aan een rol, nooit aan een id
- `src/engine/workSets.ts#isWorkSet` alles wat sets telt gaat hierdoor
- `src/engine/leaveProposal.ts#planLeaveChange` vrije dagen, vakanties, tochten en zonder sportschool als voorstel; `src/engine/noGym.ts#applyNoGymDays` wat zonder sportschool verandert
- `src/engine/programLayout.ts#layoutWaves` fases en golven, geteld vanaf het doel
- `src/storage/databaseHorizon.ts#syncProgramHorizon` schrijft het plan weg, draait bij elke verandering
- `src/storage/horizonPlan.ts#computeHorizonPlan` rekent een voorstel uit, `applyHorizonPlanNow` schrijft het
- `src/storage/databaseSeed.ts#seedIfEmpty` een nieuwe installatie plant niets

## Nooit
- Een verandering van de planning zonder voorstel met Akkoord; ook doelen, labels, richting, golven, ziek, vakantie, tocht.
- Een sessie met jouw slot, historie of een test of race door de automatische planning verschuiven (alleen via een voorstel).
- Een training herkennen aan een lijst template-id's, of sets tellen zonder `isWorkSet`.
- Twee beenzware sessies binnen 48 uur; 72 uur na een bergtocht met afdalen.
- Bij het starten een programma of planning maken: eerst vragen, dan een voorstel (`src/engine/firstPlan.ts`).
- Weken opslaan: ze zijn afgeleid. Zonder doel geen bergtocht, wandeldag of rugzakladder.
- Een ziekmelding, vrije periode of tocht opslaan voordat de gebruiker Akkoord geeft.

## Valkuilen
- Een fout die alleen met echte data opduikt speel je na met `primePlanningRegisters()` (`src/state/planningSync.ts#primePlanningRegisters`) en `TZ=Europe/Amsterdam`; zie de skill naspelen. Zonder de registers rekent de planning met andere duren dan de app.
- De weekcontrole kan binnen één ronde een rij verplaatsen en terugzetten. Alleen een netto verandering is nieuws (`src/storage/databaseHorizon.ts#changedNet`), anders komt "Planning bijgewerkt" bij elke opening terug (5 november). Het raceblok draait in elke beurt opnieuw: zet een regel daar terug wat de weekcontrole deed, dan schuiven ze om de beurt (`src/engine/raceBlock.ts#restoreLegSwaps` met een korte beendag voor een test, 8 november). Toets een nieuwe regel met twee keer `planPass` achter elkaar.
- `src/state/planningSync.ts#horizonKey` bepaalt of de ronde opnieuw draait: een vingerafdruk van de geplande sessies hoort erin, anders blijft een nieuwe verandering liggen.
- Opstartwerk wacht nooit op de sync; wat de planning wijzigt wacht wel op de wachtrij en leest dan het opgeslagen plan.
- Een teruggezette rij krijgt geen slot en geen vaste lengte, anders blijft hij vastgezet staan. Ook een rij die een periode korter maakte en die je daarna zelf verplaatste, krijgt bij weghalen zijn lengte terug; alleen het merk eraf laat hem kort (`src/engine/leaveProposal.ts#planLeaveChange`, een `keep` met `restore`, 9 november).
- De reparatie zet niets op de laatste vrije dag van een week, behalve in een week met vakantie, vrije dagen of tocht.
- `tpl_bodyweight` (zonder sportschool) is een krachtsjabloon zonder vaste dag: een lijst van krachtsjablonen voor MacroFactor slaat hem over (`src/engine/noGymDetails.ts#BODYWEIGHT_TEMPLATE_ID`), anders raadt hij mee.
- `PATTERN_SWAPS` werken alleen in fases van een plan met een doel; de golden scenario's A en C bewegen niet.

## Testen
- Tijdens het werk: `npx vitest run src/engine/scheduler src/engine/weekValidator src/engine/planPass src/engine/leave src/engine/noGym src/storage/horizon`
- `src/storage/planGolden.test.ts` mag alleen bewegen met de reden in de commit.
- Tekstkaart (`npm run kaart:vergelijk`) alleen als een scherm verandert.

## Lees verder
- `docs/architectuur/planning.md`
- `docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`, `docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md`, `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`, `docs/beslissingen/2026-11-09-zonder-sportschool.md`, `docs/onderzoek/Planning op een lijn.md`
