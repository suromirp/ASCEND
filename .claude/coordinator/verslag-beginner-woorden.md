# Verslag: I-18 stap 5 en 6 (beginner heel licht, teksten en woorden)

Tak: `claude/beginner-woorden`.

## Stap 5, de teksten
- `src/engine/beginnerStart.ts`: de belofte in `beginnerStartLine` is nu "geen harde training ... en elke week wordt het iets meer". Nieuw `beginnerWeekOneLine()` noemt week 1 in getallen uit `beginnerWeek(1)` (kracht 35 minuten, wandelen en dribbelen 20 en 30 minuten) en "Elke week wordt het iets meer".
- `src/engine/programLayout.ts`: de fasetekst van Rustig beginnen zegt hetzelfde.
- De regel staat in het eerste voorstel (`firstPlan.ts`) en in het voorstel bij een richting kiezen (`useDirectionChange.tsx`, alleen als de ladder meegaat).
- Test (`beginnerPlan.test.ts`): de getallen van de regel zijn de minuten die de planning (Week) voor week 1 geeft, en week 2 is langer.

## Stap 6, de vaktaal
- `src/engine/forgeWords.ts` (+ test): `forgeLabels` (Plan, Herh. met voorleestekst Herhalingen, Over, Zwaarte of Voorschrift, RIR, RPE) en `effortWords` ("RPE 3-4" wordt "rustig, je kunt hele zinnen praten"). De sjabloontekst in de data blijft.
- Instelling Woorden in Forge (Gewoon is advies, of Vaktaal) in `strengthModel.words`: `strengthSettings.ts`, `settingsDefs/forge.ts`, `settingsDefs/order.ts`, `settingsSummary.ts`, `settingsDiff.ts`, groepspagina `ForgeGroup.tsx` (bundel Weergave op Forge). Optioneel veld, geen migratie nodig (onbekende waarde valt terug op Gewoon).
- Blad "Zo lees je dit" (`ForgeReadSheet.tsx`, teksten in `data/forgeReadLines.ts`) achter een InfoButton in de laatste kolomkop van de setstabel in `ExerciseBlock.tsx` (44 px, niet bij alleen kijken).
- Woorden toegepast in ExerciseBlock, ForgeMenus, TodayMissionCard, FinishSheet, StrengthDoneElsewhere, LogFormParts, loopstappen in DuurParts, adviezen in CoachCard.
- `beginnerPlan.ts#firstStrengthLine` en `ForgeIntro`: "Kies een gewicht dat licht voelt. Je moet er nog een paar over hebben." boven de eerste krachttraining in de start.
- Werkbriefje `docs/werkbriefjes/forge.md`: nieuwe valkuil.

## Niet gecontroleerd
- Geen screenshot of Lookout op 360, 390 en 412 px (stap 7). De InfoButton staat in de kolom van 44 px.
- `kaart:vergelijk` niet gedraaid (coordinator).
- Zone 2 blijft zoals het was (zoneText); de tekst "Zone 1-2, RPE 3-4" in sjablonen is niet overal langs `effortWords` gehaald (alleen loopstappen, logblad en adviezen).
