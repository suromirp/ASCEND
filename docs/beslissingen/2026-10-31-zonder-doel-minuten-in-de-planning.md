# Zonder doel, stap 5: de minuten van je richting in de planning

Datum: 2026-10-31
Status: aangenomen

## Besluit

Met een gekozen richting en geen doel krijgt elke duurtraining in een golf haar gewone lengte (de opbouwweek van haar schema) maal één factor per week van de golf. De factor is het weekbudget van die week gedeeld door wat het weekpatroon gewoon telt, met pittige minuten dubbel zoals op de kaart Je week (`engine/directionPlan.ts`). Kracht en herstel houden hun lengte. Hiermee gaat Fitter worden echt in de planning: het budget begint bij het gemiddelde van je laatste vier weken, groeit drie weken met hoogstens 10% en de vierde week is 35% lichter.

## Hoe het werkt

- De planningsronde rekent de factoren uit en zet ze op `Program.direction.factors`, net als het rugzakdoel. Ze worden elke ronde opnieuw gezet en defensief gelezen; een oud programma zonder factoren werkt zoals het was.
- De grenzen die er al waren blijven gelden: de sessiepiek van 110% van je langste training van 30 dagen, je tijd per dag en ziekte. Daarnaast wordt een training hoogstens 1,6 keer en minstens de helft van haar gewone lengte (afgeleid, als vangnet).
- Past het budget niet meer met wat er deze week nog staat, dan zegt de kaart Je week het eerlijk: "Met wat er nog staat kom je op 130. Een extra wandeling van 20 minuten brengt je op 150." Er komt geen voorstel voor die wandeling; dat is jouw keuze.
- Een ander weekbudget verandert nu de lengte van je trainingen als je plan een richting volgt. Daarom is het in het blad Weekbudget eerst een keuze, en opent "Bekijk wat er verandert" het voorstel met Akkoord. Zonder gekozen richting wordt het budget meteen bewaard, want dan telt het alleen wat je deed.
- Een voorstel van een richting of weekbudget laat de planningsronde ook lopen als er geen rij verschuift, zodat de nieuwe lengtes meteen gelden. Verandert alleen de lengte, dan zegt de melding dat ("Je trainingen blijven op hun dag en krijgen de lengte uit het voorstel").

## Reden

Het ontwerp (`docs/visie/Zonder doel.md`, 3.3) wil dat het weekbudget over de trainingen van de week verdeeld wordt met dezelfde grenzen als elke training. Eén factor per week houdt de verhouding tussen de trainingen gelijk en laat de bestaande lengteregels hun werk doen.

## Alternatieven

- De factor uitrekenen over de sessies die echt in die week staan: preciezer bij een week met een vrije dag, maar `progressionTarget` kent alleen het programma en een datum. Het patroon is een goede benadering, en de kaart zegt het als het niet past.
- De eerlijke zin ook in het voorstel: niet gebouwd. Het voorstel laat de lengtes zelf zien; de zin staat op de kaart.

## Bron

`docs/visie/Zonder doel.md` (2.4, 2.6, 3.3 en stap 5), `docs/beslissingen/2026-10-31-zonder-doel-stap-4.md`.

## Vervangt

Niets.

## Terugdraaien

`programDirection` zonder factoren laten teruggeven: dan gelden de vlakke weken van stap 4 weer.
