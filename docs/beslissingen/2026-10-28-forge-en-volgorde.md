# Forge vinden en de volgorde van Je stand

Datum: 2026-10-28
Status: aangenomen

## Besluit

Forge krijgt een vaste, duidelijke plek: een ingangskaart bovenaan een eigen blok Kracht op Je stand, met Krachtprogressie en Trainingsverdeling eronder. De volgorde van de blokken op Je stand is jouw voorkeur en pas je aan in een blad "Volgorde aanpassen", met een rij "Volgorde van Je stand" in de instellingen van Planning.

## Reden

Forge stond als stil kopje midden in Belasting en verdween helemaal als Kracht meerekenen uitstond, dus wie het niet kende vond het niet. Kracht hoort bij kracht. De volgorde van de kaarten op Je stand is pure voorkeur en verandert niets aan de planning of de cijfers. Ontwerp: `docs/visie/Forge vinden en kaarten ordenen.md`.

## Wat er is gebouwd

De ingangskaart (`components/stand/ForgeEntryCard.tsx`) toont de naam in Marcellus en één regel met jouw cijfers (`engine/forgeEntry.ts`, droog feit eerst, de vaste uitleg als terugval). Staat Kracht meerekenen uit, dan blijft de kaart staan met de zin en de knop "Aanzetten".

Je stand bestaat uit zeven blokken (`engine/cardOrder.ts`: Benen, Belasting, Kracht, Je stand in vier regels, Lopen, Wat speelde er, Doel). "Klaar voor het doel" blijft de vaste eerste kaart. Het lucht-vlak "Je stand in vier regels" staat nooit als eerste blok. Slepen gaat per blok, niet per kaart, in een blad (`components/stand/OrderSheet.tsx`) met dezelfde hook en greep als Ascend (`useVerticalDrag`, die een optionele `scroller` kreeg voor een blad dat zelf scrolt) en met Hoger en Lager in een menu per rij voor wie niet kan slepen. Het slepen op Ascend en in Week is niet veranderd. Geen slepen op Vandaag, in Logboek, in de instellingen of in Forge zelf, want daar heeft de volgorde betekenis. Er is geen schakelaar om een blok te verbergen; aan en uit blijft bij de bestaande instellingen en een blok dat uitstaat houdt zijn plek.

## Opslag

`AppSettings.cardOrder?: { stand?: string[] }`. Lezen is defensief (`resolveCardOrder`): onbekende en dubbele id's vallen weg, een ontbrekend blok komt terug direct na het blok dat in de standaard voor hem stond, en het lucht-vlak schuift van plek 1 naar plek 2. De sleutel is optioneel en gaat mee in de back-up; bij terugzetten blijft hij alleen als het een record van lijsten tekst is (`cleanCardOrder`). Er is geen schemaversie en geen migratiestap nodig: een oudere back-up zonder de sleutel geeft de standaard, een oudere app negeert de sleutel. "Terug naar standaard" haalt de sleutel weg. Faalt het wegschrijven, dan zet het blad de oude volgorde terug en zegt: "Dat lukte niet. De volgorde staat nog zoals eerst."

## Instellingen

De rij "Volgorde van Je stand" staat in Planning onder Geavanceerd, samen met "Trainingen slepen in Week". Planning zat vol (het plafond is 12 rijen), en Geavanceerd is er alleen bij minstens twee rijen. Het zoeken, de afwijkingenlijst en de waarde (Standaard of Eigen volgorde) komen uit dezelfde engine-functies.

## Alternatieven

Forge op Vandaag bij een krachttraining (verdringt de missie), of in het tandwiel (instellen is iets anders dan bekijken): verworpen als vaste plek. Slepen direct op de pagina: blokken zijn hoog en de pagina zou onrustig worden. Losse kaarten slepen: te veel voor een telefoon.

## Bron

Het ontwerp van Cartographer en de keuzes van de eigenaar daarin.

## Vervangt

Niets.

## Terugdraaien

Haal het blok Kracht weer uit `pages/Standing.tsx` of verwijder de rij en de sleutel `cardOrder`; zonder de sleutel geldt de oude volgorde.
