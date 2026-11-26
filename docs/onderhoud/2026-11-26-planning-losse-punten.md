# Planning losse punten (26 november)

Tak `claude/planning-punten-26nov` vanaf `a9556c7`. Besluit: `docs/beslissingen/2026-11-26-planning-losse-punten.md`.

## I-151 dagbeeld en ziek
- `src/engine/dayPlan.ts#weekPlan`: de toets `allowed` geldt alleen voor `date === today`. Morgen valt nog in een lopende melding (`dayRules` ziet ziek tot en met morgen) en kreeg daardoor geen `primary`; nu wel.
- Test: `src/engine/dayPlan.test.ts`, "geeft alleen vandaag de ziekteregel". Faalt zonder de fix.

## I-147 een open dag
- `src/engine/scheduler.ts#proposeNoTimeToday` krijgt een achtste parameter `NoTimeOptions` (`isOpen`, `stays`, `window`, `asOf`). Volgorde: eerst dagen met ruimte die open zijn en geen test of wedstrijd ernaast hebben (`findHeavyConflicts` met een test-achtige rij); dan de oude keuze, de eerste latere dag met ruimte. Een voorstel waarin een rij op een dichte dag of op de dag zelf landt, of dat een rij uit `stays` verschuift, telt niet. Niets: overslaan zoals eerst.
- `src/engine/adaptiveReplanner.ts#computeForecastReplan`: krijgt `logs` (lockLevel en de afstandsregels), geeft `isOpen` (de ingestelde dagen), `stays` (lockLevel kleiner dan 3) en `window: 'week'`. De volgorde met vaste rijen achteraan en de `break` zijn weg.
- Aanroepers: `src/storage/availabilityStep.ts` en `src/storage/horizonPlan.ts#withAvailability` geven de logs mee; `src/state/bodyAndLeave.ts` geeft Geen tijd vandaag `isOpen` uit de beschikbaarheid.
- Tests: `src/engine/availabilityOpenDay.test.ts` (dichte zaterdag naar dichte zondag naast een test, geen vrije dag, een vaste rij, een gelogde rij, Geen tijd vandaag met een dichte dag en met een test). Alle zeven falen op de oude code.

## I-148 voorbeeld en opening
- Nagespeeld met een tijdelijke probe (weggehaald) op drie nagemaakte starts met een halve marathon: het enige verschil tussen voorbeeld en opening is een rustige duurloop in de week van de wedstrijd (14 of 15 juni 2027). Met alle dagen geen verschil.
- `src/engine/firstPlan.ts#FOLLOW_WEEKS_LINE` in de staart van het eerste voorstel bij een wedstrijd of tocht.
- Tests: `src/engine/firstPlan.test.ts` (de zin bij race en tocht, niet bij fit) en `src/storage/eenPlanEersteVoorstel.test.ts` (wat de opening meer zet ligt vanaf over twee weken en het voorstel noemt dat). Golden A en C bewegen niet.

## I-146 Meer in de startweken
- Geen code: de rij heeft na Akkoord geen `plannedMinutes`. `applyHorizonPlanNow` past de items van het voorstel niet toe; de ronde (`applyKindAmounts`) zet de rij zonder lengte. De lengte uit `ladderMinutesOf` staat alleen op het item, voor de tekst en het logboek.
- Test: `src/storage/beginnerLadder.test.ts`, de I-143-test toetst nu ook dat de rij geen vaste lengte heeft en met de gewone opbouw langer wordt.

## I-156 vervalt voorbij het venster
- Oorzaak: `state/bodyAndLeave.ts#planPreviewPass` rekent het voorbeeld met `until` vandaag plus 28 dagen. `planPass` gaf dat door aan `reconcileFixedSessions`, die dan elke vaste rij erna weghaalde. De opening rekent zonder `until`, acht weken vooruit, en houdt ze. In het blad stonden ze doorgestreept als "vervalt".
- Fix in `src/engine/planPass.ts`: vaste rijen en Hoeveel per soort tot de doeldag of hun eigen weken vooruit.
- Nagespeeld met nagemaakte data (voetbal op dinsdag, acht weken plan, een voorstel dat Heuvelintervallen korter maakt): vier vaste rijen in december stonden als "vervalt". Test: `src/engine/proposalPreviewFixed.test.ts`. `src/engine/fixedSports.test.ts` verwachtte de vaste rijen alleen tot `until`; bijgewerkt naar zestien rijen, de eerste zes ongewijzigd.

## Krachtblok
- `src/engine/strengthScheduling.ts`: de zin noemt nu de drie redenen die de telling (`weekReconciliation.ts`, `noFreeDay`) echt telt. De telling klopt: een week telt als geen dag de beschikbaarheid, de ruimte en de afstand tot een zware dag haalt, ook na de ruil.
- Test: `src/engine/strengthScheduling.test.ts`, een week met drie vrije dagen die geen trainingsdag zijn, en dezelfde week met vrijdag open.

## Niet gecontroleerd
- Niet op een toestel bekeken. De nieuwe zin in het eerste voorstel en die van het krachtblok zijn alleen in tests gezien; `kaart:vergelijk` gaf geen verschil (110 schermen gelijk), dus geen vaste stand van de kaart toont ze.
- Geen naspelen met een back-up van de eigenaar (geen toestemming in deze opdracht); alleen nagemaakte data.
