# Sherpa Routeplanner: hoogtemeters halen (I-160, deel B)

25 november 2026. Tak `claude/route-hoogtemeters`, vanaf `claude/route-ontwerp`. Ontwerp: `docs/visie/Ontwerp route per training.md` (Deel 2) en `docs/visie/Plek route per training.md`. Deel A (bewaarde route per training) bouwt een andere Sherpa; opslag van routes, migraties en `PlannedSession` zijn hier niet aangeraakt.

## Bewijs, nagemaakt

Een lange duurloop van 10 km en 300 hm, één helling van 54 m over 1690 m, voet ongeveer 2,8 km van de plek; Avontuurlijk licht glooiend.

- Voor (zonder keuze, de oude som): Simpel 12,2 km, 105 hm, 2 keer op en neer; Avontuurlijk 10,3 km, 86 hm.
- Na, Hoogtemeters halen: Simpel 19,8 km, 316 hm, 6 keer op en neer, begint op de voet; Avontuurlijk ongewijzigd.
- Na, Afstand houden: Simpel 9,9 km, 158 hm, 3 keer op en neer, begint op de voet.
- Na, Afstand houden met rijtijd 30: derde rij "Buiten plus een helling": buiten 9,9 km en 160 hm, daarna een helling uit de gids 4 keer op en neer voor 180 hm, samen 340 hm.
- Na, rijtijd Niet rijden: derde rij "Buiten plus de loopband": 20 minuten op 10 procent voor 140 hm, met "Op de loopband tel je de helling, niet de meters van je horloge."

De test `src/engine/routeClimbPlan.test.ts` houdt de voor- en na-getallen vast.

## Wat er gebouwd is

- `engine/routePlanner.ts`: `PlanInput.loop` (`LoopOptions`: voorrang en rijtijd). Met `loop` kiest Simpel uit hoogstens drie hellingen met een bekende hoogte (de hoogste eerst, `steepCandidates`) de steilste na het routeren, begint op de voet als die verder dan 1 km ligt en te bereiken is (`footReachable`), en geeft beide uitkomsten (`RoutePlans.choices`). `plansWithPriority` wisselt zonder nieuwe zoektocht. `chosenRepeats`: Hoogtemeters halen rondt naar boven af (hoogstens 20), Afstand houden kiest het aantal dat het dichtst bij de afstand ligt en nooit meer dan de hoogtemeters vragen. `footStartLine` is de regel bij de lus.
- `engine/routeClimbPlan.ts`: de twee keuzerijen met de som (`loopChoiceRows`, `choiceSum`), de derde rij (`outdoorPlus`) en de twee instellingen.
- `engine/routeSheet.ts`: de delen `mapMissing`, `priority` en `plus`, en de drie regels voor de kaart.
- `engine/trainingSpots.ts`: de bestaande schatting als functies (`roadKm`, `driveMinutes`, `walkMinutes`); `travelAdvice` gebruikt ze, zelfde uitkomst.
- `storage/routeMapRetry.ts`: Opnieuw proberen haalt alleen de kaart van de omgeving op (zelfde plek en afronding als `findRoutes`), met een grens van 20 s (Overpass plus hoogtes); daarna een gewone nieuwe zoektocht.
- `storage/routeProposal.ts#findRoutes`: geeft `deps.loop` door. `useRouteSearch.ts` levert `loopChoice`, `plus` en `mapRetry`; `components/RouteClimbRows.tsx` tekent; `RoutePanel.tsx` plaatst de drie delen; de Briefing toont de kaartregel bovenaan (`TrainingBriefing.tsx#LoopPlace`).
- Instellingen in Weer en kleding: "Wat gaat voor in een lus" (Naar de training, advies; Hoogtemeters halen; Afstand houden) en "Rijtijd naar heuvels" (Niet rijden, 15, 30 advies, 45 minuten, Geen grens). Optionele velden in `databaseSettings.ts`, dus geen migratiestap; `backupClean.ts` laat een onbekende waarde vallen.

## Eigen keuzes

- Zonder `loop` rekent de planner zoals voorheen. Alle bestaande tests roepen zonder `loop` aan en zijn niet aangepast; de app geeft `loop` altijd mee.
- "Steilste": de kaart kent alleen de hoogte van een heuvel, niet de lengte van de helling. Daarom vraagt de planner de drie hoogste en kiest na het routeren de steilste (hoogte gedeeld door lengte, dan de hoogste). Nooit meer dan drie aanroepen.
- De lus op de voet: alleen bij een voet verder dan 1 km. Te voet bereikbaar (tot 3 km over de weg, de grens van de gids) altijd; verder alleen binnen de rijtijd. Bij Niet rijden blijft een verre voet gewoon aanloop.
- Een langere lus verandert de training niet: de PlannedSession, de minuten en het horloge blijven zoals ze zijn. Daarom geen voorstel met Akkoord. De voorselectie volgt de instelling; met het advies is dat bij een training met hoogtemeters Hoogtemeters halen. Wil de eigenaar dat langer alleen na een tik komt, dan zet hij de instelling op Afstand houden.
- De derde rij komt als de lus met de meeste hoogtemeters minder dan 75 procent haalt. Eerst een echte helling uit de gids binnen de rijtijd, dan een trap; een plek die het tekort in 30 keer haalt gaat voor, dan de dichtstbijzijnde. Geen plek: de loopband. Vanaf je plek gerekend, niet vanaf de voet.
- Loopbandvuistregel, geen onderzoek: 5 km/u op 10 procent is 500 m stijgen per uur, afgerond naar boven op 5 minuten.
- De uitleg van de derde rij staat als kleine regel in de rij, niet achter een i: dat scheelt een blad.
- In de Briefing staat alleen de kaartregel; de keuzerijen en de derde rij staan in het blad achter Groter (de Briefing houdt zijn vier vakken boven de vouw).

## Niet gebouwd

- "Zoek heuvels verder weg" (een extra aanroep naar OpenStreetMap en Open-Meteo met een grotere straal). De gids Trainingsplekken dekt heuvels buiten 3 km binnen de rijtijd, zonder netwerk. Er gaat dus nooit een extra aanroep uit zonder tik. Een vraag met 25 km straal geeft bovendien te veel paden; dat vraagt een eigen vraag met alleen heuvels.
- Een link die in `/plekken` meteen de gekozen plek opent: de link gaat naar de gefilterde gids (`spotsPageFor`).

## Gestopt: twee bestaande tests

De twee nieuwe instellingen laten twee lijsttests rood gaan. Volgens de opdracht heb ik ze niet aangepast; dat beslist de coördinator.

- `src/engine/settingsDiff.test.ts`, "als alles anders staat": het object `everything` mist de twee nieuwe velden. Nodig: `routeLoopPriority: 'distance'` en `routeDriveMinutes: 45` erbij, naast `routeAvoidBigRoads`.
- `src/engine/settingsFoto.test.ts`: de foto telt 306 in plaats van 304 instellingen. Nodig: `npx vitest run -u src/engine/settingsFoto.test.ts` (de opdracht werd hier geweigerd).

`leavePlanAround.test.ts` ("stays fast") ging rood bij de volle run door een drukke machine (6,4 s tegen 4 s); los draait hij groen.

## Niet gecontroleerd

- Niets met echte diensten of met de back-up van de eigenaar nagespeeld; de getallen zijn van een nagemaakte helling.
- Geen screenshot op 412 px: de machine was te druk (de volle testrun had meer dan 10 minuten nodig). Lookout moet het Route-blok nog bekijken.
- Hoe BRouter een lus laat beginnen op een voet midden op een pad, en hoe Garmin Connect zo'n GPX toont.
