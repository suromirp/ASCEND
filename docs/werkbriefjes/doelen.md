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
- `src/engine/fuelOnTheGo.ts#fuelFor` Eten onderweg: gram koolhydraten vanaf 90 minuten lopen of wandelen en per tochtdag; alleen tekst, geen registratie, geen gewicht (`docs/beslissingen/2026-11-11-eten-onderweg.md`)
- `src/engine/racePaces.ts#raceOutlook` de ene berekening voor "past de doeltijd", ook voor TARGET-TIME; `src/engine/raceDay.ts#raceDayView` Racedag voor een 10 km: in de laatste week één rij op Vandaag en in het blad van het doel, het blad met start, weer thuis, inlopen en tempo, de dag erna een terugblik; alleen tekst, beoordeelt de doeltijd niet; de verwachte tijd uit `raceReadiness.ts#expectedRaceTime` (`docs/beslissingen/2026-11-14-racedag-10km.md`)
- `src/engine/onCourse.ts#recentAdherence` dezelfde telling voor de coach en Ritme
- `src/engine/yourWeek.ts#yourWeek` Je week zonder doel, één ring
- `src/state/goalActions.ts` waar doelen worden geschreven
- `src/engine/skillGoal.ts#clearedSkillSteps` een Vaardigheid uit de logs; opslag `src/storage/skillGoals.ts#recordSkillSteps` (één put, alleen toevoegen), trap `src/components/ascend/SkillGoalCard.tsx`; Algemeen sterk met eigen gewicht: `src/engine/goalReadinessFor.ts#generalReadinessFor`, de keuze `src/components/ascend/CalisthenicsChoiceSheet.tsx`, de kaart `src/components/ascend/GeneralStrengthCard.tsx`

## Nooit
- Een nieuw label, een doel erbij of gewijzigd, "In hutten" of "Met tent" en een volgorde die een conflict verschuift zonder voorstel met Akkoord.
- Een tweede percentage of "x van y" voor voortgang naar een doel: breid de engine-functie uit.
- Het GR5-percentage op Je stand; het staat alleen op Ascend.
- Je week naast een doel tonen, of een percentage aan de golfterugblik hangen.
- De doeltijd beoordelen: het doel blijft het doel, de kaart toont werk en één droge regel. Racedag plant of bewaart niets en noemt geen andere verwachte tijd dan `expectedRaceTime`.
- Een richting, weekbudget of golfkeuze stil toepassen: dat is een voorstel met Akkoord (`src/components/ascend/useDirectionChange.tsx`).

## Valkuilen
- Importeer `src/data/gr5StagePaths.ts` nooit statisch, alleen via `data/gr5Tracks.ts` (dynamisch); anders komt 215 kB in de hoofdbundel. Het spoor komt uit OpenStreetMap (`docs/beslissingen/2026-11-11-gr5-uit-osm.md`).
- Welk soort doel welke berekening krijgt staat in `goalReadinessFor`; alleen `trek_hut`, `trek_tent` of geen soort gebruikt de mijlpalen (`usesMilestoneReadiness`). Een component leest `usesMilestoneReadiness` hoogstens om een uitleg te tonen, nooit om een eigen percentage te kiezen. Een Vaardigheid is geen `TrainingGoal` en heeft geen `GoalMilestone` (anders telt hij in `mainGoal` en Je week); zijn voortgang is de trap uit `skillReadinessFor`, nooit een percentage, en een gehaalde stap blijft gehaald via `SkillStepProgress`. Het algemene doel (`SkillGoal.general`, ladder `algemeen`) volgt vijf ladders: het blijft buiten `liveSkillGoals` en krijgt nooit `SkillStepProgress` (de sleutel `goalId|stap` zou tussen ladders botsen); "hoger" telt tegen `generalBaseline`, in `generalReadinessFor`. Welke training de sleuteltraining is, kiest `src/engine/keySession.ts` per soort van het hoofddoel (`keyGoalOf`, nooit de volgorde van de lijst), nooit de langste; elke plek met dat woord gebruikt `keyFocusOf`, ook restDayBack en elke tekst die vroeger "lange training" zei. Het inhalen: twee inhalen op één dag bestaat niet, en de 48 uur kijkt over de weekgrens (`docs/beslissingen/2026-11-11-sleuteltraining.md`). Een ingang naar een tochtscherm (/reis, /reis/paklijst, /etappes, /onderweg) bestaat alleen met `hasTrekGoal` (`engine/journeyAccess.ts`); `programAnchorDate` is de datum van elk hoofddoel, geen bewijs van een tocht. Een hoofddoel zonder soort telt als tocht (`effectiveGoalKind`), een ander doel zonder soort niet.
- Eén Liever niet op TARGET-TIME geldt voor elke latere test, want het id bevat de doeltijd; pas als de doeltijd verandert komt het voorstel terug.
- Het voorstel is de kleinste hele minuut die bij de weken past (`wholeMinutes`), hetzelfde getal als "ongeveer" op de kaart; anders zegt de kaart na Akkoord nog steeds dat het niet past.
- Een meter zonder gewicht mag nooit "het meeste te winnen" worden en houdt het getal niet onder 100.
- Zonder test, of terwijl de snelste 5 km op Akkoord wacht, telt snelheid niet mee; dat zegt één regel. Een tijd uit `SessionLog.durationMinutes` is op de minuut; toon hem nooit als mm:ss. Seconden komen uit `runDetail`, `detail` of `bestEffort` (`raceDay.ts#raceTimeOf`). Een doel kent geen starttijd: een uur uit `usualStartHour` is een schatting en staat er nooit als feit.
- Een mijlpaal die je haalde onder een eerdere eis blijft gehaald (`keepClearedMilestones`); `MilestoneProgress` herschrijf je nooit. Wat deze versie niet kent (een ladder, een soort) bewaar je ongewijzigd en verberg je bij het tonen; een lees-en-terugschrijfroute mag het nooit laten vallen. Een migratie van een optioneel veld valideert om te tonen, nooit om op te schonen: de opslag houdt de ruwe waarde, het tonen toetst de vorm.
- Seizoensstrook en lijst lezen dezelfde volgorde; elke verplaatsing schrijft de volgorde van de hele zichtbare lijst.

## Testen
- Tijdens het werk: `npx vitest run src/engine/goal src/engine/gr5Readiness src/engine/raceReadiness src/engine/racePaces src/engine/yourWeek`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`; wat `src/engine/gr5Readiness.test.ts` vastlegt wijzig je alleen met reden.
- Tekstkaart (`npm run kaart:vergelijk`) als de tab of een kaart verandert.

## Lees verder
- `docs/architectuur/doelen.md`, `docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md`, `docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md`, `docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md`, `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`
