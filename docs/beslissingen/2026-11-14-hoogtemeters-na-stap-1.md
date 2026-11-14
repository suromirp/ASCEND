# Hoogtemeters na stap 1: elke regel leest het merk

Datum: 2026-11-14
Status: aangenomen

## Besluit

De regels die na stap 1 het merk van de teller nog niet lazen, lezen het nu, via één plek: `engine/elevation.ts` (`counterMark`, `climbLimitFor`, `sameCounter`). Een nieuwer merk dan de app kent is niet oud: het krijgt de strengste grens en wordt alleen met hetzelfde merk vergeleken.

De keuzes, een voor een:

- **Te heuvelachtig voor een oordeel: 15 m per km voor een oud log, 20 m voor een nieuw** (`runMetrics.ts#VERDICT_MAX_CLIMB_PER_KM`). `formOf` kiest de grens met het merk van `detail`, `runDetailRules.ts#driftFromKms` met dat van `runDetail`: elk het veld waaruit het telt. De 20 is een eigen aanname. De onderbouwing: de nieuwe teller telt per kilometer 3 tot 6 m meer dan de oude dode band (vlakke nagemaakte lopen van 0 tot 0,8 naar 2,8 tot 3,2 m per km; de nagemaakte heuvellus van 10,3 naar 15,9; de heuvelloop bij het naspelen van 12 november van 85 naar 124 m in totaal). Vijf meter erbij is dezelfde stap als bij vlak voor zone 2 (5 naar 10). De heuvellus (15,9) houdt daarmee haar oordeel, zoals bij een oud log.
- **Een horlogegetal van 0 is geen meting** (`runComparison.ts#watchClimbTrusted`). Een horloge met hoogte meldt op een loop buiten vrijwel nooit precies niets; een horloge zonder hoogte wel. Bij 0 telt de eigen telling.
- **Een horlogegetal ver van de eigen telling geldt niet**: buiten 60 tot 140 procent (`detail.quality.gainAgreementPct`, de marge van `aerobicTrend.ts` en `runMetrics.ts`) en ook 20 m of meer uit elkaar. De marge en de bodem staan nu op één plek, `engine/elevation.ts#gainDisagreement` (`GAIN_AGREEMENT_RANGE`, `GAIN_DISAGREEMENT_FLOOR_M`).
- **De bodem in meters: 20 m** (herstelronde na de review van Warden, 14 november). In vlak land zegt een percentage weinig: bij de vijf vlakke lopen uit het onderzoek meldt het horloge 21 tot 33 m per loop en telt een drempel van 2 m 14 tot 57 m. Het onderzoek zegt het zo: "Onder ongeveer 40 m totaal weet niemand het op 20 m na." Twintig meter is dus de kleinste afwijking die iets over het horloge zegt. Zonder bodem verloor een nieuw vlak log met 14 m eigen tegen 30 m horloge (47 procent) zijn horlogegetal, en viel elk oud log van dezelfde route stil weg uit de vergelijkbare lopen. Met de bodem blijft het horlogegetal daar gelden. Een loop van 57 m eigen tegen 33 m horloge (24 m) wordt nog wel gewantrouwd; dat is de rand.
- **De bodem geldt op alle drie de plekken.** `runComparison.ts#watchClimbTrusted`, `aerobicTrend.ts#climbPerKm` en `runMetrics.ts#altitudeTrusted` (klimmen en dalen) lezen dezelfde functie. De eigen telling is de som van de stukken van het profiel; het horlogegetal is dat van het log, en waar alleen het profiel er is (`runMetrics.ts`) volgt het uit de overeenkomst. Is de afstand in meters niet vast te stellen (geen eigen telling bij het profiel en geen horlogegetal), dan beslist alleen het percentage, zoals voorheen. Gevolg voor `aerobicTrend`: een vlakke loop die eerst op de eigen telling terugviel leest nu het horlogegetal; beide liggen daar ver onder de grens van 15 m per km. Gevolg voor klimmen en dalen: een vlak log krijgt niet meer "de hoogtemeting wijkt te veel af", maar gewoon geen klim.
- **Welke kant telt, hangt van het merk van het profiel af**, alleen in `runComparison.ts`. De overeenkomst hoort bij `detail` en wordt gelezen met het merk van `detail`, niet dat van de kilometers. Bij een profiel met een merk (2, of een nieuwer merk: de strengste lezing) gelden beide kanten. Bij een oud profiel, zonder merk, geldt alleen de bovenkant: de oude teller telde altijd te laag, dus een lage overeenkomst zegt daar niets over het horloge. Zonder deze uitzondering zou een oud heuvellog zijn horlogegetal verliezen en zou het herstel van stap 1 (oude logs van dezelfde route blijven vergelijkbaar) weer vervallen. `aerobicTrend.ts` en `runMetrics.ts` houden beide kanten voor elk log, zoals ze waren: dat staat onder Open.
- **Eigen tellingen alleen bij gelijk merk.** Twee logs zonder betrouwbaar horlogegetal worden op de eigen telling van de kilometers vergeleken als `runDetail.counter` op beide hetzelfde is (allebei geen, of allebei hetzelfde getal).
- **Wel stijging, geen gelijke maat: geen kandidaat, zonder reden.** Hebben beide logs een eigen telling maar een ander merk, en ontbreekt een betrouwbaar horlogegetal, dan valt het eerdere log weg uit de vergelijkbare lopen. Er komt geen reden bij ("korter, langer of heuvelachtiger" zou verzonnen zijn); het telt alleen niet mee in het aantal. Ontbreekt de hoogte op een van beide helemaal, dan blijft het zoals het was: er valt niets te toetsen en het log blijft kandidaat.
- **Een nieuwer merk dan de app kent.** Dat kan alleen via een back-up uit een nieuwere versie die in een oudere wordt gelezen. Vastgelegd: een heel getal vanaf 2 is een merk (`counterMark`); al het andere (geen veld, tekst, 0, 1, een breuk) is de oude telling. Een merk hoger dan `ELEVATION_COUNTER` krijgt bij elke grens op eigen stijging de strengste (laagste) van de bekende waarden (`climbLimitFor`): de app weet niet hoe die telling uitvalt, dus zwijgt ze eerder dan dat ze een heuvelloop vlak noemt. Voor `kmPieces` is dat dezelfde uitkomst als voorheen (5 m), nu om deze reden. Bij vergelijken tussen logs telt het als een eigen telling die alleen bij hetzelfde merk past.
- **Het merk blijft bij het importeren staan.** `migrateActivityDetail` bewaarde alleen precies 2 en maakte van een hoger merk een oud log. Nu blijft elk heel getal vanaf 2. Het type van `counter` op `ActivityDetail` en `RunDetail` is daarvoor `number` in plaats van `2`. Geen stap in het schemanummer: het veld blijft optioneel, er wordt niets herschreven, en wat de app zelf schrijft is nog steeds 2.
- **Inkorten en ongedaan maken bij een oud log** was al goed en is nu getoetst: het ingekorte profiel draagt merk 2, het oude profiel staat ongewijzigd in `trim.original`, `undoTrim` geeft het log precies terug (ook na een back-up tussendoor), en kilometers die intussen opnieuw zijn gebouwd houden hun eigen merk.

## Reden

Review van Warden op 12 november: het oordeel over tempo en loopvorm verviel bij een nieuwe heuvelloop waar het bij een oude bleef, de vergelijking geloofde een horlogegetal van 0, legde een oude naast een nieuwe eigen telling, en een onbekend hoger merk telde stil als oud.

## Alternatieven

- De 15 m voor alle logs houden: dan zwijgt de app bij nieuwe logs op terrein waar ze bij oude logs sprak.
- Een nieuwer merk lezen met de grenzen van merk 2: ruimer, en fout als de nieuwere telling hoger uitvalt.
- Een nieuwer merk een eigen reden geven ("telling onbekend"): een nieuwe tekst voor een geval dat vrijwel niet voorkomt.
- De marge van 60 tot 140 procent aan beide kanten voor elk log, precies zoals `aerobicTrend`: gooit het horlogegetal van oude logs weg.
- Alleen procenten, zonder bodem in meters: laat in vlak land een oordeel wegvallen op een verschil dat niemand kan meten.
- Een bodem van 40 m: dan wordt 57 m tegen 33 m ook geloofd; 20 m is wat het onderzoek als meetbaar noemt.
- Bij ongelijk merk toch kandidaat laten: dan kan een heuvelloop naast een vlakke loop komen te staan.

## Bron

`docs/backlog.md` (Hoogtemeters, na stap 1), `2026-11-12-hoogtemeters-stap-1.md` (de meting per kilometer), `2026-11-12-hoogtemeters-teller-op-log.md`. Tests: `src/engine/elevationAfterStep1.test.ts`, alleen nagemaakte data.

## Vervangt

Uit `2026-11-12-hoogtemeters-teller-op-log.md` twee zinnen: "de 15 m per km in `runDetailRules.ts` en `runMetrics.ts#formOf` blijven staan" (met de bijvangst van de heuvellus) en "een merk dat de app niet kent telt bij het lezen van de grens als geen merk". De rest van dat besluit blijft.

## Terugdraaien

De commit terugdraaien. Er is geen opgeslagen vorm veranderd en geen log herschreven. Een log dat intussen met een hoger merk is geïmporteerd houdt dat veld; een app zonder deze stap laat het bij een volgende import van `detail` weer weg.

## Open

- Niet nagespeeld met echte lopen: de 20 m per km steunt op de nagemaakte reeksen en op de getallen van het naspelen van 12 november.
- Een horlogegetal van 0 als geen meting is een aanname: een horloge met barometer kan op een vlakke loop ook echt 0 melden. Dan telt de eigen telling, wat op vlak weinig kwaad doet.
- De 20 m is niet nagespeeld met echte lopen.
- `aerobicTrend.ts#climbPerKm` valt bij een onbetrouwbaar horloge terug op de eigen telling met de grens van 15 m, zonder merk, en wantrouwt net als `runMetrics.ts#altitudeTrusted` een oud log ook aan de onderkant van de marge. `HILLY_M_PER_KM` (10 m, "De route was heuvelachtig") leest het merk ook niet. Beide stonden niet in de opdracht.
- `places.ts#routeLine` en `proposalFacts` gelijktrekken hoort bij stap 2.
