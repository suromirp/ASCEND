# Sherpa Woorden: I-149, I-152, I-153

Branch claude/kleine-woorden, vanaf claude/gr5-teksten. Alleen tekst, geen gedrag.

## Wat er veranderde
- I-152: `effortWords` loopt nu ook over de sportkeuze (`ModalityPicker`, `m.how`), alle gidssecties (`TrainingGuideSheet`: body, items, subsecties, noot) en de uitleg "Zo doe je het" in `ExerciseLogger` (de notities van het sjabloon, waar de defaultProgram-teksten uit komen). Gewoon zegt "rustig, je kunt hele zinnen praten", Precies houdt "RPE 3-4/10". De zinnen in de data en de regels die `weekReview.ts` en `coach.ts` lezen zijn niet aangeraakt. In de weekterugblik zelf stond geen losse "RPE 3-4" in een zichtbare tekst; de adviesregels die RPE noemen gaan al via `effortWords` in `CoachCard`.
- I-153: `refillText` en `emptyForgeNeed` in `engine/forgeWords.ts` (importmelding in `ExerciseRow`, lege stand in `pages/Forge.tsx`): Gewoon zegt "wat je over had", Precies "herhalingen in reserve (RIR)". De rij en het blad "RIR vooraf invullen" heten in Gewoon "Over vooraf invullen" (`ForgeGroup`). Het i-knopje bij de kolomkoppen is niet aangeraakt.
- I-149: `firstPlanLines` (optionele vierde parameter) en `beginnerLadderLines` (veld `restDayMode` in de instellingen) nemen het woord uit `REST_DAY_COPY[restDayMode].title`, dezelfde bron als het blad. Rust zegt "Rustdag: maandag." en "Wandelen op je rustdag", Hersteldag zegt "Hersteldag: maandag." en "Wandelen op je hersteldag". `storage/horizonPlan.ts` geeft de stand mee.

## Tests
Nieuw in `forgeWords.test.ts`, `firstPlan.test.ts` en `beginnerLadderOffer.test.ts`: Woorden Gewoon en Precies, restDayMode beide standen. Geen bestaande test aangepast. `planGolden.test.ts`, historie en scheduler niet aangeraakt.

## Controles
- tsc: groen. lint: groen (alleen een oude waarschuwing in LegFatigueCard). vitest: 815 bestanden, 12430 tests groen. build: groen.
- kaart:vergelijk: 109 schermen gelijk, geen schendingen van invarianten, en één verklaard verschil: het blad "Bij het invullen" toont nu "Over vooraf invullen" (standaard Woorden is Gewoon). Dat is I-153.

## Niet gecontroleerd of bewust gelaten
- De vaste titel "RIR vooraf invullen" in `settingsDefs/forge.ts`, `settingsDiff.ts`, de uitleg en de zoekindex blijft staan (de instellingen-foto is daarom ongewijzigd); alleen de rij en het keuzeblad volgen Woorden.
- `effortWords` herkent alleen "RPE 3-4", "RPE 3-4/10" en "RPE 3 tot 4"; formuleringen als "RPE ongeveer 3-4 van 10" en "RPE 3" in de gids blijven staan.
- Geen visuele controle op een telefoon.
