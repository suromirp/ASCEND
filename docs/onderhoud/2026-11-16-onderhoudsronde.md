# Onderhoudsronde 16 november (I-66)

Meting op main e152f17, met eigen telscripts (schattingen, kleine marge). Niets gewijzigd.

## Grootte
- Engine 474 bestanden, 87.860 regels zonder tests (15 november: 86.600).
- App 188.862 regels zonder tests; tests 761 bestanden, 112.038 regels.
- Grootste engine-bestanden: `settingsSummary.ts` 1.358, `forgeWorkout.ts` 1.218, `settingsDefs/forge.ts` 1.140.

## Dubbel of dood
- 11 exports die nergens gebruikt worden (5 in engine).
- 854 exports die alleen tests importeren (621 in engine): vooral export voor de test.
- 3 engine-bestanden die alleen tests laden: `stageAt.ts`, `goalSetupAssist.ts`, `traitsProfile.ts` (259 regels plus 188 test).
- 53 groepen identieke hulpfuncties in twee of meer bestanden (138 kopieën).
- Zonder sportschool: 16 engine-bestanden, 2 in opslag en 1 component beslissen zelf op de soort, naast `engine/dayRules.ts`.

## Top tien om op te ruimen
1. De drie bestanden die alleen tests laden weghalen, met hun tests.
2. De 11 dode exports weg (`useWatchLink.ts:57`, `LeaveWeekBand.tsx:22`, `logForm/manualLog.ts:84`, `aerobicTrend.ts:138`, `forgeLog.ts:243`, `standing.ts:35`, `machineWeights.ts:324`, `settingsDefs/derive.ts:63`, `storage/nearbyTerrain.ts:138`, `data/gr5StageEnds.ts:12-13`).
3. Zonder sportschool overal via `dayRules.ts` (onder meer `leaveAround.ts`, `fixedSports.ts`, `leaveProposal.ts`, `missedTraining.ts`, `noGymGuard.ts`, `nearbyTerrain.ts`, `leave.ts`).
4. `isNumber`, `finite` en `isRecord` naar `utils/guards.ts` (nu zeven en drie kopieën).
5. Dagnamen (`dayLabel`, `dayName`, `dayNL`, `dayShort`, `dayText`, ruim twintig varianten) naar `utils/dates.ts`.
6. `lowerFirst`, `upperFirst`, `capital` naar het bestaande `utils/capitalize.ts`.
7. `onWeatherChange`, `samePlace` en `placeKey` in opslag en engine op één plek.
8. Rekenhulpen `median`, `mean`, `round5`, `round10`, `clampPct` op één plek, zodat afronding overal gelijk is.
9. `num` in vijf adapters, `inWeek` in `replanWeek.ts` en `storage/weekReplan.ts`, `hasPreferOverride` in `candidatePlacement.ts` en `scheduler.ts`.
10. Minder export voor de test, te beginnen bij `forgeCalibration.ts` (19), `places.ts` (15).

## Ochtenden
Een ochtend van dezelfde bron overschrijft zichzelf (vaste sleutel per bron en dag). Twee rijen per dag van verschillende bronnen is bedoeld; de lezers voegen samen. Eén gat: een oude of handgemaakte back-up zonder `id` krijgt in `storage/migrationsBody.ts:219` de sleutel `import:<datum>` naast een opgehaalde `intervals.icu:<datum>`, en ontkoppelen (`wellness.ts#clearWellness`) ruimt die niet op. Alleen uit de code gelezen.

## IJkset
`settingsDefs/forge.ts` (`forge-ijkset`) staat in het blad Bij het invullen achter Geavanceerd: vijf tikken vanaf Vandaag tot het keuzeblad. Zoeken vindt hem wel.
