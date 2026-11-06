# Doelen

De Ascend-tab als doelen en hoe ver je bent: volgorde, labels, conflicten, klaar voor je doel, de GR5-voortgang, een race met doeltijd en Je week zonder doel.

## Bestanden
- `src/pages/Ascend.tsx` de tab: doelenlijst, kaart per doel, of Je week zonder doel
- `src/engine/goalList.ts#moveGoal` volgorde van doelen, met `listedGoals` voor wat de lijst toont
- `src/engine/goalLabels.ts#sortedForList` het ene sorteersleutel, ook voor `goalConflicts.ts`
- `src/engine/goalConflicts.ts#goalConflicts` doelen die te dicht op elkaar komen
- `src/engine/goalReadinessFor.ts#goalReadinessFor` welke berekening bij welk soort doel hoort, op één plek
- `src/engine/gr5Readiness.ts#computeMainGoalReadiness` het ene percentage voor een tocht
- `src/engine/raceReadiness.ts` snelheid als hoofdmeter bij een race met doeltijd
- `src/engine/racePaces.ts#raceOutlook` de ene berekening voor "past de doeltijd", ook voor TARGET-TIME
- `src/engine/onCourse.ts#recentAdherence` dezelfde telling voor de coach en Ritme
- `src/engine/yourWeek.ts#yourWeek` Je week zonder doel, één ring
- `src/state/goalActions.ts` waar doelen worden geschreven

## Nooit
- Een nieuw label, een doel erbij of gewijzigd, "In hutten" of "Met tent" en een volgorde die een conflict verschuift zonder voorstel met Akkoord.
- Een tweede percentage of "x van y" voor voortgang naar een doel: breid de engine-functie uit.
- Het GR5-percentage op Je stand; het staat alleen op Ascend.
- Je week naast een doel tonen, of een percentage aan de golfterugblik hangen.
- De doeltijd beoordelen: het doel blijft het doel, de kaart toont werk en één droge regel.
- Een richting, weekbudget of golfkeuze stil toepassen: dat is een voorstel met Akkoord (`src/components/ascend/useDirectionChange.tsx`).

## Valkuilen
- Welk soort doel welke berekening krijgt staat in `goalReadinessFor`; alleen `trek_hut`, `trek_tent` of geen soort gebruikt de mijlpalen (`usesMilestoneReadiness`). Een component kiest dat niet zelf.
- Eén Liever niet op TARGET-TIME geldt voor elke latere test, want het id bevat de doeltijd; pas als de doeltijd verandert komt het voorstel terug.
- Het voorstel is de kleinste hele minuut die bij de weken past (`wholeMinutes`), hetzelfde getal als "ongeveer" op de kaart; anders zegt de kaart na Akkoord nog steeds dat het niet past.
- Een meter zonder gewicht mag nooit "het meeste te winnen" worden en houdt het getal niet onder 100.
- Zonder test, of terwijl de snelste 5 km op Akkoord wacht, telt snelheid niet mee; dat zegt één regel.
- Een mijlpaal die je haalde onder een eerdere eis blijft gehaald (`keepClearedMilestones`); `MilestoneProgress` herschrijf je nooit.
- Seizoensstrook en lijst lezen dezelfde volgorde; elke verplaatsing schrijft de volgorde van de hele zichtbare lijst.

## Testen
- Tijdens het werk: `npx vitest run src/engine/goal src/engine/gr5Readiness src/engine/raceReadiness src/engine/racePaces src/engine/yourWeek`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`; wat `src/engine/gr5Readiness.test.ts` vastlegt wijzig je alleen met reden.
- Tekstkaart (`npm run kaart:vergelijk`) als de tab of een kaart verandert.

## Lees verder
- `docs/architectuur/doelen.md`
- `docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md`, `docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md`
- `docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md`, `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`
