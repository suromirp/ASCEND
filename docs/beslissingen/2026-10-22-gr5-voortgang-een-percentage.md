# GR5-voortgang is één percentage, met de zin erbij

Datum: 2026-10-22
Status: aangenomen

## Besluit

De voortgang naar de GR5 heet overal "Klaar voor de GR5" en is één percentage: het gemiddelde van vier meters (rugzak, langste dag, stijging en daling, dagen achter elkaar), elk begrensd op 100%, steeds met de zin eronder waaruit het bestaat. De rekenregel staat op één plek, `src/engine/gr5Readiness.ts`. Andere voortgangsgetallen (de mijlpalenteller in de kop, "Klaar voor meer", "Wat je al aankunt", "% gereed", het procent bij de doelfocus) zijn weg of verwijzen ernaar; de kampen blijven bestaan als ladder.

## Reden

De eigenaar koos optie B uit `docs/visie/Visuele upgrade en nieuwe ideeën.md`, deel 4. Het ontwerponderzoek wees erop dat dezelfde gegevens 45%, 17% of 23% kunnen geven, afhankelijk van de weging. Daarom ligt de weging vast in één functie met tests, en staat de zin met de vier waarden altijd onder het getal. Het gemiddelde is gekozen omdat elke stap telt (een kilo extra in je rugzak laat het getal stijgen), terwijl het zwakste punt als aparte regel zichtbaar blijft.

Keuzes binnen de regel:

- "Je beste van de laatste acht weken", dezelfde vergelijking als `routeDayRows` op Je stand, zodat geen scherm een ander getal noemt voor dezelfde dag.
- Langste dag is gemeten in tijd op pad (altijd gelogd), naast de tijd die een gewone dag op de route kost (loopkilometers met stijgen en dalen). Afstand in km ontbreekt vaak in een log.
- Stijging en daling zijn één meter: het gemiddelde van de twee.
- Dagen achter elkaar is begrensd op twee, wat het plan thuis oefent ("Wandeldag 1 van 2"). Zonder die grens bleef een tocht van zes dagen achter elkaar het getal onder 100% houden, hoe trouw je het plan ook volgde. Het scherm zegt wat de tocht zelf vraagt.
- 100% staat er alleen als alle vier de meters vol zijn; anders hooguit 99%.
- Een eis die het doel niet heeft telt niet mee, en de zin noemt alleen wat meetelt.

Dezelfde dag werkt ook voor de coach op Ascend en "Volgehouden" op Je stand. Ze zeiden "12 van 17" en "14 van 14" over dezelfde weken, omdat Je stand de laatste 28 dagen telde en overgeslagen trainingen als van het plan gehaald zag, terwijl de coach de laatste vier afgeronde weken telt en wat je oversloeg als niet gedaan. Beide gebruiken nu `recentAdherence` in `src/engine/onCourse.ts`.

## Alternatieven

- Kampen als hoofdmaat (optie A): concreet, maar dertien gelijke stappen suggereren dat elk kamp even zwaar is.
- Alleen de vier meters (optie D): het eerlijkst, maar geen kopregel. Ze staan nu als detailscherm achter het percentage.
- Het zwakste punt als percentage: 17% met dezelfde gegevens, en het beloont een extra kilo rugzak niet.
- "Op schema" (optie C): geen hoeveelheid en afhankelijk van het plan zelf.

## Bron

Keuze van de eigenaar uit het nachtrapport van 22 oktober 2026, `docs/visie/Visuele upgrade en nieuwe ideeën.md` deel 4 en `docs/visie/Ontwerp en gebruik.md` (voortgang spreekt vijf talen).

## Vervangt

Niets.

## Terugdraaien

De weging is één functie (`compute` in `gr5Readiness.ts`). Een andere weging of grens voor dagen achter elkaar (`THUIS_DAGEN_OP_RIJ`) past dat getal overal tegelijk aan; de schermen lezen alleen het resultaat. Het percentage wordt niet opgeslagen, dus er hoeft niets te migreren.
