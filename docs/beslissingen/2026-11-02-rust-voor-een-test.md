# Rust voor een test: 72 uur na de laatste zware loop- of beendag

Datum: 2026-11-02
Status: aangenomen

## Besluit

Een test of testloop staat minstens 72 uur na de laatste zware loop- of beendag: een zware beendag, de lange duurloop, heuvels of intervallen die zwaar zijn voor de benen, een bergtocht. Wat zwaar is komt uit de rollen en het bestaande profiel (`isLegHeavyTemplate`, de rol `long`), nooit uit template-id's. Een wedstrijd valt er niet onder; die heeft zijn eigen taper.

De grens is instelbaar: "Rust voor een test", 72 uur (advies) of 48 uur (`AppSettings.testRest`, Planning, onder Geavanceerd).

## Waar het geldt

- Waar een test wordt ingepland of verplaatst: de nieuwe testpoging (TEST-RETRY, ook de tweede keer), een gemiste test (TEST-MAKE-ROOM), verplaatsen en slepen (`decideMove`, `dayVerdicts`) en ruilen (`checkSwap`, `decideSwap`). Dat loopt via één regel in `engine/scheduler.ts#testPairConflict`, die `findHeavyConflicts` en `respectsHeavySpacing` al lezen. Slepen en ruilen zeggen het droog: "Liefst 72 uur tussen een zware dag en je test."
- De weekcontrole als melding: regel TEST-REST in `engine/weekValidator.ts`, alleen met `reportYours` (Week). De kaart zegt "Je testloop staat 48 uur na een zware dag." met het feit eronder. Een gedane zware dag telt, een gemiste in het verleden niet.
- Het voorstel bij die melding (`planWeekFix`): eerst de zware dag naar een andere dag van de week, dan de test, en in een volle week mag een training van het systeem zelf plaatsmaken. Niets vervalt. Het voorstel komt alleen als de week aantoonbaar beter wordt, zodat TEST-DAY, AFTER-TEST en de andere herstellingen ook nooit een nieuwe melding over de rust maken.

## Wat niet stil gebeurt

De planningsronde leest de controle zonder `reportYours` en verzet hiervoor niets. Wat jij of een voorstel vastzette en een bestaande afspraak blijven staan; Week meldt het met een voorstel met Akkoord. Historie verandert niet. `planGolden.test.ts` beweegt niet.

## Reden

Besluit van de eigenaar. Het onderzoek raadt voor een 5 km-test en een wedstrijd liefst 72 uur na zware beenkracht aan (`docs/onderzoek/Trainingsvormen en varianten.md`, punt 3; `docs/onderzoek/Spierbelasting en beenvermoeidheid.md`), en een eigen week met heuvels, een lange duurloop en twee dagen later een test liet zien hoe dat opstapelt (`docs/onderzoek/Lange duurloop en een zware beendag.md`). De beenindex (TEST-FRESH) blijft daarnaast gelden.

## Alternatieven

- Alleen de beenindex laten beslissen, zoals eerst. Dan kon een korte Benen A of de heuvels 48 uur voor een test blijven staan.
- De regel ook in de planningsronde laten herstellen. Dan verschuift het systeem stil sessies rond tests en beweegt de gouden test; nu blijft het een melding met een voorstel.
- De wedstrijd meenemen. Die heeft al een taper per label; dat is een eigen afweging.

## Bron

Besluit van de eigenaar, 2 november 2026, en de onderzoeken hierboven. Tests met nagemaakte gegevens: `src/engine/rustVoorEenTest.test.ts`, `src/storage/testRest.test.ts`.

## Vervangt

Het deel van `2026-11-02-testloop-en-zware-benen.md` dat zegt dat het tweede testvoorstel een dag zoekt "48 uur na een zware beendag": dat is nu de grens van deze instelling. De rest van dat besluit blijft staan.

## Terugdraaien

Zet "Rust voor een test" op 48 uur. Helemaal terug kan in de code: haal de regel met `testRestDays` uit `testPairConflict` en het blok TEST-REST uit `validateWeeks`. Er is niets opgeslagen dat terug moet; `testRest` is optioneel, een oude back-up zonder die sleutel leest als 72 uur en een waarde anders dan 48 of 72 valt weg bij het terugzetten.
