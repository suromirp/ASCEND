# Je locatie mag gewoon gebruikt en getoond worden; alleen nooit in de repo

Datum: 2026-11-11
Status: aangenomen

## Besluit

De eigenaar wil een duidelijke kaart bij Route voorstellen: waar je nu bent, je route en de andere routes die kunnen. Je locatie mag daarvoor op het scherm staan (stip, kaart met ondergrond) en naar de diensten gaan die de app nodig heeft (routeplanner, kaarttegels, hoogte, weer). Privacy rond je eigen locatie is geen ontwerpgrens meer. De enige harde grens: een echte locatie, een adres of een spoor van de eigenaar komt nooit in de GitHub-repo, niet in code, tests, testdata, docs of commits.

## Reden

De eigenaar, 11 november: "Je hoeft niet zo te denken om mijn privacy daarin eigenlijk. Het gaat er gewoon om dat het niet in mijn repo komt. In de GitHub repo, dat is het enige eigenlijk. Dus zolang dat niet gebeurt, kunnen we helemaal losgaan." De voorzichtigheid in eerdere besluiten (punt nooit op het scherm, liever geen tegels, alleen een afgeronde plek) maakte de route een black box en remde het kaartje.

## Wat dit verandert

- Het startpunt van de lus mag als stip op de kaart, ook bij Precies. Je huidige locatie mag als stip op de kaart.
- Een kaart met ondergrond (tegels) mag. De bron kiest Scout op gebruiksgemak en kneedbaarheid, zonder API-sleutel (vaste afspraak: nooit een sleutel plakken, gebruiken of opslaan; Google Maps vraagt een sleutel met betaalgegevens en valt daarom af).
- Kiezen vanaf waar mag met een tik op de kaart of met je huidige locatie; een geocoder (adres typen) mag ook.
- Je hoeft de beheerder van BRouter niets te vragen: pak de bron die het best werkt. De gewone fatsoensregels van een gratis dienst blijven (geen lus van herhaalpogingen, geen massaal ophalen), omdat een dienst die je blokkeert ook niet gebruiksvriendelijk is.
- Wat blijft: niets van de echte locatie of het spoor in de repo; testdata blijft nagemaakt (een openbaar punt, geen woonplaats). Een back-up van de eigenaar blijft alleen in de scratchpad. Het startpunt mag nu wel op het toestel blijven zoals het staat; of het in de back-up mag, is aan de bouwer met het advies "ja, het is jouw bestand".

## Alternatieven

Het kaartje als eigen tekening zonder ondergrond (besluit `2026-11-10-kaartje-route-bron.md`). Niet meer nodig: dat was een keuze uit voorzichtigheid, en zonder straten en paden zie je niet waar je loopt.

## Bron

Gesprek met de eigenaar, 11 november ochtend, in de coördinator-chat.

## Vervangt

De privacygrenzen in `2026-11-09-startpunt-lus.md` (het punt staat nooit op het scherm; niet in de back-up), in `2026-11-09-routeplanner.md` (de vraag over een exact startpunt) en de keuze zonder tegels in `2026-11-10-kaartje-route-bron.md`. De rest van die besluiten blijft staan.

## Terugdraaien

Een nieuw besluit dat de grens weer legt; de code van de kaart kan dan terug naar de eigen tekening zonder tegels.
