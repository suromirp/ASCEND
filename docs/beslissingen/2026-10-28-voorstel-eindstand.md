# Een voorstel laat zijn eindstand zien en toetst die zelf

Datum: 2026-10-28
Status: aangenomen

## Besluit

1. **Voorvertoning is uitkomst.** De voorvertoning van een voorstel draait nu `previewPlanPass` (`engine/planPass.ts`) in plaats van `planPass`. Zonder programma doet die niets, precies zoals de sync (`syncProgramHorizon`) zonder programma niets doet. Zo toont "Zo ziet je week eruit" nooit een herstelling van de weekcontrole die na Akkoord en de sync uitblijft. Dit geldt voor elk voorstel dat de voorvertoning gebruikt (testpoging, rustdag, vrije dagen, tochten, adviezen).
2. **TEST-RETRY toetst zijn eigen eindstand.** Een kandidaat-eindstand die een nieuw advies (`computeAdvice` op de eindstand, zonder TEST-RETRY zelf) of een nieuwe bevinding van de weekcontrole (de zes regels van Week) oplevert over een sessie die het voorstel raakt, is geen kandidaat. Alleen wat nieuw is telt: wat er al was voor het voorstel blokkeert het niet. Bij het voorbeeld van de doorloop (lange duurloop naar ma 2 november, Benen A naar di 3 november) blijft zo alleen de optie over waarin Benen A vervalt.
3. **Week rekent het voorstel pas op verzoek.** De meldingen (`weekNoticeConcerns`, ongeveer 10 ms) komen direct. Het voorstel (`planWeekFix`, een paar honderd ms) wordt pas uitgerekend na een tik op "Bekijk voorstel" (of "Toch een voorstel"). De knop toont dan kort "Even rekenen…" en daarna opent het blad, of er staat een zin: "ASCEND vond deze week geen dag die beter past." of "Het voorstel lukte nu niet. Probeer het straks nog eens." Of je Liever niet zei, volgt uit het id van het voorstel (`weekFixId`), zonder rekenen.

## Reden

Lookout zag in het voorstelblad van TEST-RETRY een herstelling ("Rustige duurloop naar ma 2 nov", "Rustdag vervalt") die na Akkoord nooit gebeurde. Oorzaak: op een nieuwe installatie bestaat er geen programma. `syncProgramHorizon` stopt dan meteen en draait de weekcontrole niet, terwijl `planPreviewPass` in `AppDataContext` `planPass` wel draaide (ook met `program: null`). De rustige duurloop op de ingestelde rustdag stond al zo voor het voorstel; alleen de voorvertoning repareerde hem. Verder zette TEST-RETRY de lange duurloop en Benen A op twee dagen achter elkaar, waarna Vandaag meteen een nieuw advies gaf. En de eerste wissel naar een week met meldingen kostte 0,85 tot 1,1 s door `planWeekFix`.

## Alternatieven

De sync ook zonder programma de weekcontrole laten draaien: verandert gedrag van de planning ("eerst vragen, dan plannen"), buiten de opdracht. Het voorstel in een `requestIdleCallback` vooraf uitrekenen: blokkeert de hoofdtaak even later alsnog; op verzoek is voorspelbaarder.

## Gevolg

`planGolden.test.ts` verandert niet: de sync is niet aangeraakt. `AdviceInputs.noRetry` is intern, voor de toets van de eindstand. De zoekruimte van TEST-RETRY wordt niet groter: een verplaatsing van Benen A naar wo 4 november (na de lange duurloop) wordt niet apart geprobeerd. Een tijdsgrens op de berekening zelf is er niet, die is synchroon; de knop is alleen tijdens het rekenen "Even rekenen…" en een fout krijgt een zichtbare zin.

## Bron

Verslag van Lookout (debug.json, e1.json, f.json).

## Vervangt

Niets.

## Terugdraaien

Zet in `AppDataContext` `previewPlanPass` terug naar `planPass(...).sessions`; haal in `retryPlansFor` de `filter` met `raisesNewConcern` weg; laat `Week` weer `weekFixesFor` direct aanroepen.
