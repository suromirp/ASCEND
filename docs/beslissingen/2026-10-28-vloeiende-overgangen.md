# Vloeiende overgangen: Trillen, de tik bij Akkoord en bladen die je vinger volgen

Datum: 2026-10-28
Status: aangenomen

## Besluit

Eerste ronde van het ontwerp `docs/visie/Vloeiende overgangen.md`: de instelling Trillen (standaard aan) met een poort in de tik, een tik bij Akkoord, en bladen die je omlaag kunt slepen om te sluiten. Het schuiven van rijen in Week en de uitgroei uit een rij volgen in een latere ronde.

## Reden

De eigenaar wil een premium gevoel dat de werking nooit in de weg zit. De tik bestond al op veel plekken maar was niet uit te zetten. Bladen sloten alleen met het kruisje, de waas of de terugknop.

## Alternatieven

Een bibliotheek voor gebaren of veerkracht: niet gekozen, de afspraak is CSS en kleine hooks. Pointer-events met `touch-action: none` op het blad: niet gekozen, dat haalt het scrollen uit lange bladen. De waas laten meebewegen: niet in deze versie, het is een extra animatiepad voor een klein effect.

## Vastgelegd

Trillen: `AppSettings.haptics`, afwezig betekent aan, op alle plekken van de instellingen (index, indeling, samenvatting, verschil met het advies, uitleg, groep Vandaag en meldingen onder Beweging, back-up). De poort zit in `utils/haptics.ts`: alleen `tap` en `success` kijken ernaar, het rustsignaal van Forge (`alarm`, `pattern`) niet. Beweging en beperkte beweging zetten Trillen niet uit. De duur van de tik is één constante, `TAP_MS`, nu 15 ms (10 ms valt op veel Android-motoren weg). De eigenaar beoordeelt dat op zijn eigen telefoon. Bestaande tikken blijven, nieuw is alleen Akkoord in `ProposalSheet` en `RescheduleDialog`.

Bladen: `useSheetClose` geeft `sheetRef` en je zet `ref={sheetRef}` op het paneel. Het gebaar luistert op het paneel met `touchstart`, een niet-passieve `touchmove` en `touchend`. Het begint alleen als alle scrollende lagen bovenaan staan en de eerste beweging duidelijk omlaag is (minstens 8 px en meer omlaag dan opzij). Dat besluit valt bij het begin. Invoervelden, sliders en `data-no-sheet-drag` beginnen nooit een gebaar. Het blad volgt met de eigenschap `translate`, los van de bladanimatie, 1 op 1 in elke stand van Beweging. Loslaten: sluiten bij meer dan 30 procent van de hoogte, of sneller dan 0,5 px per ms met minstens 24 px afstand, anders terug in 200 ms zonder overshoot. Sluiten gaat via `requestClose`, dus de terugknop en `canClose` gelden; een blad dat niet dicht mag pakt het gebaar niet op. In Uit en bij beperkte beweging staat het terugveren en wegschuiven meteen op de eindstand. De waas beweegt niet mee. De zone van greep en kop is niet apart: omdat die nooit scrolt, volgt ze uit de regel dat de inhoud bovenaan moet staan. Muisbediening is er niet.

`components/sheetDrag.scan.test.ts` laat een blad met `animate-sheet-in` zonder `ref={sheetRef}` falen. Een blad dat bewust niet mag sluiten door slepen komt met reden in de uitzonderingen. Nu zijn dat er geen.

## Bron

`docs/visie/Vloeiende overgangen.md`, de keuzes van de coördinator voor deze ronde, `docs/beslissingen/2026-10-24-beweging.md`.

## Vervangt

Niets.

## Terugdraaien

Trillen uitzetten in de instellingen, of `ref={sheetRef}` van de bladen halen. Er is geen opgeslagen vorm veranderd en niets in de planning.
