# Rust voor een test: 72 uur na de laatste zware loop- of beendag

Datum: 2026-11-02
Status: aangenomen

## Besluit

Een test of testloop staat minstens 72 uur na de laatste zware loop- of beendag: een zware beendag, de lange duurloop, heuvels of intervallen die zwaar zijn voor de benen, een bergtocht. Wat zwaar is komt uit de rollen en het bestaande profiel (`isLegHeavyTemplate`, de rol `long`), nooit uit template-id's. Een wedstrijd valt er niet onder; die heeft zijn eigen taper.

De grens is instelbaar: "Rust voor een test", 72 uur (advies) of 48 uur (`AppSettings.testRest`). De rij staat in het blad Testloop van Planning, samen met Twijfeltest eerst vragen, Stilstaan bij een testloop en Nieuwe test voorstellen bij stilstand. Onder Geavanceerd was geen plek meer (hoogstens zes rijen). Omdat de keuze de planning van het wedstrijdblok verandert, gaat een andere keuze via een voorstel met Akkoord, zoals "Beenkracht de dag na de lange duurloop".

## Waar het geldt

- Het wedstrijdblok zelf (`engine/raceBlock.ts#swapLegsBeforeHardRuns`). In een testweek ruilt de zware beendag alleen naar een eerdere dag als dat de volle rust geeft. Anders gaat hij naar een dag na de test in dezelfde week: een vrije dag of de dag van een bovenlichaamtraining van het systeem, die dan ruilt, nooit naast een andere zware dag of harde loop. Staat de dag erna een zaterdagsessie van het systeem (heuvels, intervallen, heuvels met afdalen), dan wordt die de rustige loop met versnellingen (`blockQuiet`), zodat hij terugkomt als de test of het blok weggaat. Alleen als ook dat nergens past, blijft de beendag ervoor in de korte versie, zoals het wedstrijdblok al deed. Dat gebeurt in een volle week met een bergweekend (vijf of zes dagen per week). `restoreLegSwaps` gebruikt dezelfde grens.
- Waar een test wordt ingepland of verplaatst: de nieuwe testpoging (TEST-RETRY, ook de tweede keer), een gemiste test (TEST-MAKE-ROOM), verplaatsen en slepen (`decideMove`, `dayVerdicts`) en ruilen (`checkSwap`, `decideSwap`). Dat loopt via één regel in `engine/scheduler.ts#testPairConflict`, die `findHeavyConflicts` en `respectsHeavySpacing` al lezen. Slepen en ruilen zeggen het droog: "Liefst 72 uur tussen een zware dag en je test."
- Een gemiste test zonder dag met 72 uur rust: TEST-MAKE-ROOM zegt "Binnen 9 dagen is er geen dag met 72 uur rust na een zware dag." en stelt de beste dag op 48 uur voor, met de uren in de tekst ("Dan staat de test 48 uur na Lange duurloop, niet de 72 uur van het advies."). Een voorstel met Akkoord.
- De weekcontrole als melding: regel TEST-REST in `engine/weekValidator.ts`, alleen met `reportYours` (Week), en alleen als de planning het niet zelf kan rechtzetten: de zware dag is van jou, van een voorstel of al gedaan, of de test is door jou of een voorstel vastgezet. Wat alleen van het systeem is, houdt het wedstrijdblok zelf uit elkaar. De kaart zegt "Je testloop staat 48 uur na een zware dag." met het feit eronder, en de naam van de training zoals hij heet ("48 uur na Benen A (zwaar)"). Een gedane zware dag telt, een gemiste in het verleden niet.
- Het voorstel bij die melding (`planWeekFix`): eerst de zware dag naar een andere dag van de week, dan de test, en in een volle week mag een training van het systeem zelf plaatsmaken. Niets vervalt. Het voorstel komt alleen als de week aantoonbaar beter wordt, zodat TEST-DAY, AFTER-TEST en de andere herstellingen ook nooit een nieuwe melding over de rust maken.

## Wat niet stil gebeurt

De weekcontrole van de planningsronde leest TEST-REST niet en verzet er niets voor. Wat jij of een voorstel vastzette en een bestaande afspraak blijven staan; Week meldt het met een voorstel met Akkoord. Historie verandert niet.

## Gouden planning

`planGolden.test.ts` beweegt in twee scenario's, allebei om de beendag in de testweken van 7 januari en 11 februari 2027:

- A (bestaande gebruiker, tocht met tussendoel 10 km): Benen A stond op di 5 januari en di 9 februari, kort (45 minuten), 48 uur voor de test op donderdag. Nu staat hij op vrijdag 8 januari en 12 februari, in de volle lengte, de dag na de test; Bovenlichaam A blijft op dinsdag en Bovenlichaam B ruilt naar woensdag. De heuvelintervallen van za 9 januari worden de rustige loop met versnellingen, zodat Benen A 48 uur houdt tot de volgende zware sessie; za 13 februari was die al.
- C (nieuwe gebruiker, 10 km, 4 dagen): Benen A stond kort op dinsdag, met Bovenlichaam A op woensdag. Nu staat Bovenlichaam A op dinsdag en Benen A in de volle lengte op vrijdag na de test.

B, D en E (zonder wedstrijd) bewegen niet.

## Reden

Besluit van de eigenaar. Het onderzoek raadt voor een 5 km-test en een wedstrijd liefst 72 uur na zware beenkracht aan (`docs/onderzoek/Trainingsvormen en varianten.md`, punt 3; `docs/onderzoek/Spierbelasting en beenvermoeidheid.md`), en een eigen week met heuvels, een lange duurloop en twee dagen later een test liet zien hoe dat opstapelt (`docs/onderzoek/Lange duurloop en een zware beendag.md`). De beenindex (TEST-FRESH) blijft daarnaast gelden. Een melding die de gebruiker niet kan oplossen omdat het systeem hem zelf zo plant, helpt niemand; daarom houdt het wedstrijdblok de rust zelf aan.

## Alternatieven

- Alleen de beenindex laten beslissen, zoals eerst. Dan kon een korte Benen A of de heuvels 48 uur voor een test blijven staan.
- De beendag in een volle testweek laten vervallen in plaats van kort ervoor. Dat haalt stil een training weg; nu blijft hij kort, zoals eerst, en meldt Week niets omdat het de keuze van het systeem is. Een vraag voor de eigenaar als hij dat anders wil.
- De wedstrijd meenemen. Die heeft al een taper per label; dat is een eigen afweging.

## Bron

Besluit van de eigenaar, 2 november 2026, en de onderzoeken hierboven. Tests met nagemaakte gegevens: `src/engine/rustVoorEenTest.test.ts`, `src/storage/raceTestRest.test.ts` (eerste wedstrijdplannen voor 5 km, 10 km en de halve, 3 tot 6 dagen, nul keer TEST-REST), `src/storage/testRest.test.ts`.

## Vervangt

Het deel van `2026-11-02-testloop-en-zware-benen.md` dat zegt dat het tweede testvoorstel een dag zoekt "48 uur na een zware beendag": dat is nu de grens van deze instelling. En in de kop van `engine/raceBlock.ts` de 72 uur voor een test met de korte versie als vaste uitweg. De rest blijft staan.

## Terugdraaien

Zet "Rust voor een test" op 48 uur: dan gelden weer 48 uur voor een test, in de zoektochten, het wedstrijdblok en de melding. Helemaal terug kan in de code: haal de regel met `testRestDays` uit `testPairConflict`, `placeAfterTest` en `needFor` uit `raceBlock.ts` en het blok TEST-REST uit `validateWeeks`; de gouden snapshot gaat dan terug. Er is niets opgeslagen dat terug moet; `testRest` is optioneel, een oude back-up zonder die sleutel leest als 72 uur en een waarde anders dan 48 of 72 valt weg bij het terugzetten.
