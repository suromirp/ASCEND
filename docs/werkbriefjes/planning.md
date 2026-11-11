# Planning

Hoe het plan ontstaat en wie een geplande sessie mag aanraken: hoofddoel, rollen, scheduler, de planningsronde, vrije dagen, tochten en zonder doel.

## Bestanden
- `src/engine/planPass.ts#planPass` de ronde die elke planning afsluit: vaste sporten en hoeveel per soort, dan tot 4 keer raceblok, vrije-dagenblokken en weekcontrole tot niets meer verandert (`MAX_TURNS`)
- `src/engine/weekValidator.ts#lockLevel` wie een sessie mag aanraken, en `repairWeeks` voor de reparaties
- `src/engine/scheduler.ts#legSpacingDays` de 48 uur tussen zware beendagen
- `src/engine/mainGoal.ts#mainGoal` het hoofddoel, op één plek
- `src/engine/templateRoles.ts#hasRole` een training herken je aan een rol, nooit aan een id
- `src/engine/workSets.ts#isWorkSet` alles wat sets telt gaat hierdoor
- `src/engine/leaveProposal.ts#planLeaveChange` vrije dagen, vakanties, tochten en zonder sportschool als voorstel, met `src/engine/leaveAround.ts#planAroundLeave` voor de beste indeling rond een vakantie (ook over de weekgrens); `src/engine/noGym.ts#applyNoGymDays` wat zonder sportschool verandert
- `src/engine/programLayout.ts#layoutWaves` fases en golven, geteld vanaf het doel
- `src/storage/databaseHorizon.ts#syncProgramHorizon` schrijft het plan weg, draait bij elke verandering
- `src/storage/horizonPlan.ts#computeHorizonPlan` rekent een voorstel uit, `applyHorizonPlanNow` schrijft het
- `src/storage/databaseSeed.ts#seedIfEmpty` een nieuwe installatie plant niets; `src/engine/descentClock.ts#descentAdvice` de afdaalklok: 21 dagen zonder afdaling of een tocht over 8 tot 14 dagen geeft een voorstel voor Trap af op een vrije dag (`findDescentDay`), binnen 7 dagen alleen een zin; rekent als laatste in `computeAdvice` en wijkt voor elk ander voorstel (`docs/beslissingen/2026-11-11-afdaalklok.md`)

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
- De weekcontrole kan binnen één ronde een rij verplaatsen en terugzetten. Alleen een netto verandering is nieuws (`src/storage/databaseHorizon.ts#changedNet`), anders komt "Planning bijgewerkt" bij elke opening terug (5 november). Het raceblok draait in elke beurt opnieuw: zet een regel daar terug wat de weekcontrole deed, dan schuiven ze om de beurt (`src/engine/raceBlock.ts#restoreLegSwaps` met een korte beendag voor een test, 8 november). Toets een nieuwe regel met twee keer `planPass` achter elkaar. Ook het weekvoorschrift en de ronde kunnen elkaar over openingen heen tegenwerken: het voorschrift zet een Wandeldag, de fase-regel maakt er Heuvelintervallen van en de weekcontrole haalt hem weg, de volgende opening opnieuw (9 november). Het voorschrift houdt daarom alleen wat de ronde laat staan (`src/storage/weeklyPrescriptionStep.ts#keptByPlanningRound`, `src/engine/weeklyPrescriptionDiff.ts#changesTheRoundKeeps`); een omzetting wordt alleen gemeld als de rij zo blijft. Toets met drie openingen achter elkaar (`src/storage/openingPingpong.test.ts`). Een week zonder vrije dag: de weekindeling haalt een training weg en zet de nieuwe op die dag; de toevoeging noemt de rij die ze vervangt (`replacesSessionId`). Wie een toevoeging laat vallen (de ronde, een vakantie- of wedstrijddag), laat die weghaling meevallen via `src/engine/weeklyPrescriptionDiff.ts#withoutOrphanedRemovals`, anders verliest de week een training zonder vervanging (9 november). Een nieuw filter over de wijzigingen van het voorschrift gaat daar ook doorheen.
- `src/state/planningSync.ts#horizonKey` bepaalt of de ronde opnieuw draait: een vingerafdruk van de geplande sessies hoort erin, anders blijft een nieuwe verandering liggen.
- Opstartwerk wacht nooit op de sync; wat de planning wijzigt wacht wel op de wachtrij en leest dan het opgeslagen plan.
- Een teruggezette rij krijgt geen slot en geen vaste lengte, anders blijft hij vastgezet staan. Ook een rij die een periode korter maakte en die je daarna zelf verplaatste, krijgt bij weghalen zijn lengte terug; alleen het merk eraf laat hem kort (`src/engine/leaveProposal.ts#planLeaveChange`, een `keep` met `restore`, 9 november). Een periode wijzigen draait `putBack` voor de oude periode; wat de nieuwe periode nog raakt, krijgt zijn lengte niet terug (`stillShort`).
- De reparatie zet niets op de laatste vrije dag van een week, behalve in een week met vakantie, vrije dagen of tocht. De score van `planAroundLeave` is een heel getal dat alleen van de indeling afhangt (plus een duizendste voor dicht bij de oude dag) en de zoektocht start ook vanuit niets: zet er geen term in die afhangt van waar een training vóór de ronde stond, anders schuift de volgende ronde weer. De dagelijkse ronde zonder voorstel (`leaveReshuffle` uit) zoekt alleen een dag voor wat op een vakantiedag staat (9 november). De rol `long` omvat ook de bergtocht: een regel over alleen de lange duurloop filtert op sport en laat korte versies en trekdagen weg (`leaveAround.ts#isLongRun`).
- `tpl_bodyweight` (zonder sportschool) is een krachtsjabloon zonder vaste dag: elke lijst van krachtsjablonen in de sportschool (MacroFactor, krachtprogramma, bergspieren) gaat door `src/engine/templateRoles.ts#isGymStrengthTemplate`, anders raadt hij mee. Alleen `src/components/forge/ProgramProposal.tsx` filtert nog zelf (9 november, Forge was bezet). Heuvels in de buurt plant sinds 9 november een heuveltraining (`noGym.ts`, sprints of de rustige heuvelloop `tpl_hill_easy`), dus een andere keuze is een voorstel; alleen de notitie is woorden en meteen bewaard (`src/engine/leaveEdit.ts#leaveEditScope`). Staat er in een periode met Heuvels aan geen heuveltraining en geen loop die er een kan worden, dan komt er één rustige heuvelloop op een vrije dag bij, met 48 uur tussen beenzware dagen (`applyNoGymDays` stap 4, `docs/beslissingen/2026-11-09-zonder-sportschool-heuvelloop.md`). Gewoon laat loopjes zoals gepland, alleen Licht maakt ze korter. Eigen gewicht nooit naast een andere krachtsessie (48 uur); zet nieuwe regels over krachtsessies in `applyNoGymDays` en toets met `src/storage/zonderSportschoolBeter.test.ts`.
- `PATTERN_SWAPS` werken alleen in fases van een plan met een doel; de golden scenario's A en C bewegen niet. Calisthenics per training (`src/engine/trainingStyle.ts#styleChange`) verandert alleen de oefeningen van een krachttraining, nooit een geplande sessie, sjabloon of `baseStressProfile`: de ronde leest het niet en hoeft het niet te lezen.

## Testen
- Tijdens het werk: `npx vitest run src/engine/scheduler src/engine/weekValidator src/engine/planPass src/engine/leave src/engine/leavePlanAround src/engine/noGym src/storage/horizon src/storage/openingPingpong`; voor de afdaalklok `src/engine/descentClock`
- `src/storage/planGolden.test.ts` mag alleen bewegen met de reden in de commit.
- Tekstkaart (`npm run kaart:vergelijk`) alleen als een scherm verandert.

## Lees verder
- `docs/architectuur/planning.md`
- `docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`, `docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md`, `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`, `docs/beslissingen/2026-11-09-zonder-sportschool.md`, `docs/beslissingen/2026-11-09-zonder-sportschool-beter.md`, `docs/beslissingen/2026-11-09-planner-rond-vakantie.md`, `docs/beslissingen/2026-11-09-planner-vakantie-lange-duurloop.md`, `docs/beslissingen/2026-11-09-planner-vakantie-beenkracht-voorrang.md`, `docs/onderzoek/Planning op een lijn.md`
