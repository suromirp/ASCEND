# I-161: vaste GR5 in teksten

Regel: een tekst over het doel noemt het hoofddoel bij naam (`src/engine/goalWording.ts#goalRef`, bouwt op `mainGoal` en `shortGoalName`), of "je doel" als er geen is. Bij twee actieve doelen het doel waar de planning op draait. Vaste, niet-dynamische tekst zegt "je tocht" of "je doel". Wat echt over de GR5 gaat blijft.

## Gewijzigd, met naam van het doel
- `src/components/TrainingSplitSheet.tsx`: titel en uitleg ("Je week richting <doel>").
- `src/components/JourneyWeekCard.tsx`: "Deze week voor <doel>".
- `src/components/TrekGoals.tsx`: de twee uitlegregels en het blad "Hoe belangrijk is deze tocht?" (via `trekImportanceHint(…, goal)` in `src/engine/trek.ts`); "Eerstvolgende tocht" zegt "je hoofddoel".

## Gewijzigd, vaste tekst zonder GR5
- `src/components/Gr5ReadinessSheet.tsx` (standaardtitel en uitleg), `src/engine/firstPlan.ts`, `src/engine/adviceBlock.ts` (titel rugzakdoel), `src/engine/runInsight.ts`, `src/engine/runTrends.ts`, `src/engine/settingsDefs/uitleg/lichaam.ts`.
- `src/data/defaultProgram.ts` (focus en omschrijvingen van sessies), `src/data/trainingGuide.ts`, `src/data/workoutStructure.ts`, `src/data/sessionStyle.ts`, `src/data/modalities.ts`, `src/data/trainingSpots.ts`, `src/data/runInsightBackground.ts`.

## Bewust gelaten (gaat echt over de GR5)
- Etappes, `gr5Stages`, `routePlan`, `gr5Details`, spoor, `Etappes.tsx`, `StageSheet.tsx`, `StagePositionLine.tsx`, vertrekbrief (`departureLetter.ts`, `AlleenOnderweg.tsx`), `journeyTasks.ts`.
- Kennisbank (`src/data/knowledge/*`), `soloSafety.ts`, `researchSources.ts`, bronverwijzingen in `bodyCare.ts`, cijfers over de GR5 in `trainingGuide.ts` (30.000 m dalen) en `defaultProgram.ts`.
- De naam en omschrijving van het standaarddoel "GR5 / ALPENKLAAR" en de mijlpaal "GR5 KLAAR" in `defaultProgram.ts` (het is dat doel), alle identifiers, id's, regel-id's en commentaar.
- Zoeksleutelwoorden in `settingsDefs/doel.ts`.

## Test en snapshot
- Nieuw: `src/engine/goalWording.test.ts` (geen doel, gearchiveerd, één doel, twee actieve doelen, lange naam) en `src/engine/trekHint.test.ts`.
- Aangepast met reden: `src/engine/__snapshots__/instellingen-foto.json`, want één uitlegtekst over vetvrije massa zegt nu "je doel" in plaats van "de GR5". `planGolden.test.ts` bleef ongemoeid en groen.

## Niet gecontroleerd
- Geen screenshot van het tochtblad op 412 px of 360 px. Een lange naam wordt door `shortGoalName` op hoogstens 10 tekens gehouden, getest.
- Opgeslagen programma's in IndexedDB houden hun oude sessietekst als die uit een eerdere seed komt; ik heb dat niet nagespeeld.
