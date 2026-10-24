# 1RM uit MacroFactor op Forge

Datum: 2026-10-24
Status: aangenomen

## Besluit

ASCEND leest bij het inlezen van de volledige MacroFactor-export de 1RM per
oefening in (het blad "Exercises - 1-RM"), bewaart die per oefening als reeks
van datum en kilo's met de bron MacroFactor, en zet de laatste meting op Forge
naast de eigen schatting van ASCEND. Elke oefenkaart krijgt een schakelaar
tussen "1RM" en "Werkgewicht", één keuze voor alle kaarten die bewaard blijft.
De twee getallen worden naast elkaar gezet en nooit gemengd, gemiddeld of
omgerekend.

## Reden

De eigenaar vroeg de 1RM uit MacroFactor naast de eigen schatting te zetten,
en te kunnen kiezen wat de kaart laat zien: de 1RM of het krachtpatroon zoals
het er eerder stond. Later, als ASCEND MacroFactor vervangt, komt de 1RM uit de
eigen data; daarom staat de bron bij elke reeks en blijft de vorm dezelfde.

De opslag volgt wat er al is. Het gewicht uit MacroFactor staat in de
instellingen (`weightEntries`) en reist zonder schemastap mee in de back-up; de
1RM doet dat ook, als `settings.externalOneRm`: een lijst met per oefening en
bron `{ exerciseName, source, points: [{ date, kg }] }`. De naam is die van
MacroFactor zonder eenheid. Welke ASCEND-oefening het is, wordt bij het lezen
bepaald met dezelfde sleutel als Forge gebruikt (`engine/externalOneRm.ts`),
zodat een latere wijziging van de oefeningenlijst geen verkeerde sleutel
achterlaat.

Het is een veld dat erbij komt en niets verandert, dus het schemanummer van de
back-up blijft 5. De migratiestap is `migrateExternalOneRm` in
`storage/migrations.ts`: een back-up zonder het veld importeert zoals eerst en
laat de metingen op het apparaat staan; een veld dat er wel is wordt meting voor
meting gelezen en een meting zonder echte datum of met een onmogelijk gewicht
valt weg en wordt geteld. Terugzetten voegt toe en laat nooit een dag vallen die
het apparaat heeft; per dag wint de meting van het apparaat. Opnieuw inlezen van
een export neemt per dag de nieuwe waarde over en houdt dagen die alleen
opgeslagen zijn.

Het blad is breed: eerste kolom de datum, daarna een kolom per oefening met de
eenheid in de kop, en een lege cel op een dag zonder training. De kolommen
worden op naam gevonden, ponden worden kilo's. De bladen "3-RM" en "10-RM"
hebben dezelfde vorm; de naam van het blad bepaalt welke gelezen wordt, zoals
bij "Weight Trend", en alleen de 1-RM wordt ingelezen.

Op de kaart staat bij de 1RM "Geschat door ASCEND" met het getal, en eronder
"MacroFactor: 85 kg (12 oktober)" als er een MacroFactor-waarde is. De lijn is
die van ASCEND; heeft ASCEND nog minder dan twee trainingen, dan neemt de lijn
van MacroFactor het over, met de bron in woorden eronder. De verandering over
vier weken blijft die van de eigen schatting; er komt geen tweede percentage of
voortgangsgetal bij (CLAUDE.md, "One progress language").

De schakelaar zet `strengthModel.oneRmView` (`one_rm` of `work_weight`, het
advies is 1RM, de staat van eerst). Werkgewicht toont de oude lijn met "Nu
ongeveer ... kg voor ... herhalingen". De bestaande instelling "Geschatte 1RM
tonen" uit betekent alleen werkgewicht, zonder schakelaar. Twee nieuwe
instellingen staan in de groep Forge: "Forge toont" (de keuze) en "MacroFactor-1RM
erbij" (aan als advies).

## Alternatieven

- De 1RM van MacroFactor en die van ASCEND middelen tot één getal. Afgewezen: ze
  rekenen verschillend, en een gemiddelde zou geen van beide meer zijn.
- Een eigen opslag in IndexedDB (nieuwe store). Afgewezen: het is een kleine
  reeks per oefening die met de instellingen meegaat, en een nieuwe store vraagt
  een databaseversie voor niets.
- Een tweede lijn in dezelfde grafiek. Niet gedaan: `TrendLineChart` kent één
  reeks op gelijke afstand, geen datums. De regel met het getal en de datum
  zegt het belangrijkste; een grafiek met twee reeksen kan later met een eigen
  component.
- Ook de 3-RM en 10-RM inlezen. Nu niet: Forge heeft er geen plek voor. De
  opslagvorm kan het later aan met een veld erbij.
- Altijd beide kanten tonen. Afgewezen om dezelfde reden als in het besluit over
  de geschatte 1RM: de kaart wordt druk zonder iets toe te voegen.

## Bron

De vraag van de eigenaar over de 1RM uit MacroFactor naast de eigen schatting,
`docs/beslissingen/2026-10-24-geschatte-1rm-op-forge.md` en
`docs/beslissingen/2026-10-22-gewicht-uit-macrofactor.md` (de opslag van het
gewicht, waar dit op lijkt).

## Vervangt

Niets in zijn geheel. Het besluit over de geschatte 1RM op Forge blijft gelden,
behalve de zin dat de lijn van het werkgewicht wegvalt zodra de 1RM-lijn er
staat: dat is nu een keuze met een schakelaar.

## Terugdraaien

"MacroFactor-1RM erbij" uitzetten haalt de regel weg; wat ingelezen is blijft
bewaard. De schakelaar op de kaart weghalen kan in `ExerciseCard` in
`src/pages/Forge.tsx`; `oneRmView` en `showMacroFactorOneRm` die dan nog in een
opgeslagen instelling staan, doen niets. Het inlezen uitzetten kan door
`content.oneRm` in `src/pages/MacroFactorImport.tsx` niet meer op te slaan; een
opgeslagen `externalOneRm` blijft veilig staan en reist mee in de back-up.
